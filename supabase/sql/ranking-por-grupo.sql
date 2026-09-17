-- Fase 3 del rediseño multi-grupo (ver memoria "grupos-multi-tenant").
-- Correr manualmente en el SQL Editor de Supabase. Trunca ranking y
-- ranking_snapshot (solo tienen datos de prueba hoy) y los recalcula
-- desde cero con group_id.

-- 1) Esquema: ranking y ranking_snapshot ganan group_id
truncate table public.ranking;
truncate table public.ranking_snapshot;

alter table public.ranking drop constraint if exists ranking_pkey;
alter table public.ranking add column group_id bigint references public.groups(id) on delete cascade;
alter table public.ranking alter column group_id set not null;
alter table public.ranking add primary key (group_id, usuario_id);

alter table public.ranking_snapshot drop constraint if exists ranking_snapshot_pkey;
alter table public.ranking_snapshot add column group_id bigint references public.groups(id) on delete cascade;
alter table public.ranking_snapshot alter column group_id set not null;
alter table public.ranking_snapshot add primary key (group_id, usuario_id);

-- 2) recalcular_ranking: fan-out por grupo en vez de por profiles global.
-- El cálculo de puntos por usuario (los 4 left join) es idéntico al
-- original; lo único que cambia es el universo de filas (group_members
-- de cada grupo del torneo, no todos los profiles) y el
-- `partition by group_id` al rankear.
create or replace function public.recalcular_ranking(p_tournament_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into ranking as r (
    tournament_id, group_id, usuario_id, nombre,
    puntos_partidos, puntos_avance, puntos_clasificacion, puntos_especiales,
    puntos_total, actualizado_en
  )
  select
    p_tournament_id, gm.group_id, p.id, p.nombre,
    coalesce(mp.pts, 0), coalesce(av.pts, 0), coalesce(cl.pts, 0), coalesce(sp.pts, 0),
    coalesce(mp.pts,0) + coalesce(av.pts,0) + coalesce(cl.pts,0) + coalesce(sp.pts,0),
    now()
  from groups g
  join group_members gm on gm.group_id = g.id
  join profiles p on p.id = gm.usuario_id
  left join (select usuario_id, sum(points_earned) as pts from predictions
             where tournament_id = p_tournament_id group by usuario_id) mp on mp.usuario_id = p.id
  left join (select usuario_id, sum(points_earned) as pts from tie_predictions
             where tournament_id = p_tournament_id group by usuario_id) av on av.usuario_id = p.id
  left join (select usuario_id, sum(points_earned) as pts from standings_predictions
             where tournament_id = p_tournament_id group by usuario_id) cl on cl.usuario_id = p.id
  left join (select usuario_id, sum(points_earned) as pts from special_predictions
             where tournament_id = p_tournament_id group by usuario_id) sp on sp.usuario_id = p.id
  where g.tournament_id = p_tournament_id
  on conflict (group_id, usuario_id) do update set
    tournament_id = excluded.tournament_id,
    nombre = excluded.nombre,
    puntos_partidos = excluded.puntos_partidos,
    puntos_avance = excluded.puntos_avance,
    puntos_clasificacion = excluded.puntos_clasificacion,
    puntos_especiales = excluded.puntos_especiales,
    puntos_total = excluded.puntos_total,
    actualizado_en = now();

  update ranking r
  set posicion = sub.pos
  from (
    select group_id, usuario_id,
           rank() over (partition by group_id order by puntos_total desc) as pos
    from ranking where tournament_id = p_tournament_id
  ) sub
  where r.group_id = sub.group_id and r.usuario_id = sub.usuario_id;
end;
$$;

-- 3) guardar_snapshot_ranking: mismo fan-out (usado por
-- trg_snapshot_al_abrir_jornada para el indicador de "sube/baja").
create or replace function public.guardar_snapshot_ranking(p_tournament_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into ranking_snapshot (tournament_id, group_id, usuario_id, posicion, actualizado_en)
  select tournament_id, group_id, usuario_id, posicion, now()
  from ranking where tournament_id = p_tournament_id
  on conflict (group_id, usuario_id)
  do update set posicion = excluded.posicion, actualizado_en = now();
end;
$$;

-- 4) RLS: el ranking de un grupo solo lo ven sus miembros (o el
-- SuperAdmin) — antes cualquier autenticado veía cualquier ranking.
alter policy "lectura ranking autenticados" on public.ranking
  using (is_admin() or es_miembro_de_grupo(group_id));
