-- Puntaje de las 3 predicciones especiales (Campeón/Subcampeón/Goleador),
-- que hasta ahora no tenían ningún mecanismo de resolución.
--
-- Campeón/Subcampeón NO se declaran a mano: se leen de `ties` (fase
-- 'final'), que el motor de llaves ya resuelve solo (equipo_avanza_id).
-- Goleador sí necesita declararse, porque no hay datos de goles por
-- jugador en el esquema — se guarda en tournaments.goleador_oficial_id,
-- fijado desde /admin/resultados/goleador (manual o sugerido por API).

alter table public.tournaments
  add column if not exists goleador_oficial_id bigint references public.players(id);

-- Se dispara junto con "Finalizar torneo" (ver finalizar-torneo/index.ts),
-- no automático: los 3 cierran con el torneo, como se decidió con Javier.
create or replace function public.resolver_especiales(p_tournament_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_campeon_id bigint;
  v_subcampeon_id bigint;
  v_goleador_id bigint;
  v_pts_campeon int;
  v_pts_subcampeon int;
  v_pts_goleador int;
  v_config jsonb;
begin
  select equipo_avanza_id,
         case when equipo_avanza_id = equipo_a_id then equipo_b_id else equipo_a_id end
    into v_campeon_id, v_subcampeon_id
    from ties
    where tournament_id = p_tournament_id and fase = 'final';

  select goleador_oficial_id into v_goleador_id
    from tournaments where id = p_tournament_id;

  select config into v_config from tournaments where id = p_tournament_id;
  v_pts_campeon := coalesce((v_config->'puntajes'->>'campeon')::int, 0);
  v_pts_subcampeon := coalesce((v_config->'puntajes'->>'subcampeon')::int, 0);
  v_pts_goleador := coalesce((v_config->'puntajes'->>'goleador')::int, 0);

  update special_predictions sp
  set points_earned =
    (case when v_campeon_id is not null and sp.campeon_id = v_campeon_id then v_pts_campeon else 0 end) +
    (case when v_subcampeon_id is not null and sp.subcampeon_id = v_subcampeon_id then v_pts_subcampeon else 0 end) +
    (case when v_goleador_id is not null and sp.goleador_id = v_goleador_id then v_pts_goleador else 0 end),
    actualizado_en = now()
  where sp.tournament_id = p_tournament_id;

  perform recalcular_ranking(p_tournament_id);
end;
$$;

revoke execute on function public.resolver_especiales(bigint) from public, anon, authenticated;
grant execute on function public.resolver_especiales(bigint) to authenticated;
