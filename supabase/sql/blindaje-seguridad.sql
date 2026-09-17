-- Fase 4 del rediseño multi-grupo: blindaje de seguridad para registro
-- público (ver memoria "grupos-multi-tenant"). Correr manualmente en el
-- SQL Editor de Supabase.

-- 1) ranking_snapshot: mismo scope de grupo que ranking (se nos quedó
-- afuera en la Fase 3 a pesar de ya tener group_id).
alter policy "lectura snapshot autenticados" on public.ranking_snapshot
  using (is_admin() or es_miembro_de_grupo(group_id));

-- 2) Nueva función para "comparte al menos un grupo conmigo" (mismo
-- patrón security definer que es_miembro_de_grupo).
create or replace function public.comparten_grupo(otro_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from group_members gm1
    join group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.usuario_id = auth.uid() and gm2.usuario_id = otro_usuario
  );
$$;

revoke execute on function public.comparten_grupo(uuid) from public, anon, authenticated;
grant execute on function public.comparten_grupo(uuid) to authenticated;

-- 3) predictions: pronósticos de finalizados solo entre quienes comparten grupo
alter policy "lectura predictions de partidos finalizados" on public.predictions
  using (
    comparten_grupo(usuario_id)
    and exists (
      select 1 from matches m
      where m.id = predictions.match_id
        and m.status = any (array['finished','published']::partido_status[])
    )
  );

-- 4) profiles: yo mismo, admin, quien comparte grupo conmigo, o quien tiene
-- una solicitud pendiente en un grupo que administro (lo necesita la
-- próxima fase de notificaciones).
alter policy "lectura profiles autenticados" on public.profiles
  using (
    id = auth.uid()
    or is_admin()
    or comparten_grupo(id)
    or exists (
      select 1 from group_join_requests gjr
      join groups g on g.id = gjr.group_id
      where gjr.usuario_id = profiles.id and g.creado_por = auth.uid()
    )
  );

-- 5) access_requests: cerrar el insert abierto, ya no lo usa nada
drop policy "cualquiera puede solicitar acceso" on public.access_requests;
