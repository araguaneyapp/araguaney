-- Fase 1 del rediseño multi-grupo (ver memoria "grupos-multi-tenant").
-- Correr manualmente en el SQL Editor de Supabase, igual que
-- notificar-solicitudes.sql y sync-cron.sql. 100% aditivo: no toca ninguna
-- tabla/función existente.

create table public.groups (
  id bigint generated always as identity primary key,
  nombre text not null,
  tournament_id bigint not null references public.tournaments(id),
  codigo_invitacion text not null unique,
  creado_por uuid not null references public.profiles(id),
  estado text not null default 'activo',
  creado_en timestamptz not null default now()
);

create table public.group_members (
  group_id bigint not null references public.groups(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  unido_en timestamptz not null default now(),
  primary key (group_id, usuario_id)
);

create table public.group_join_requests (
  id bigint generated always as identity primary key,
  group_id bigint not null references public.groups(id) on delete cascade,
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  nota text,
  estado text not null default 'pendiente',
  creado_en timestamptz not null default now(),
  resuelto_en timestamptz
);

create unique index group_join_requests_pendiente_idx
  on public.group_join_requests (group_id, usuario_id)
  where (estado = 'pendiente');

-- RLS -------------------------------------------------------------------

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_join_requests enable row level security;

-- Solo ve un grupo quien es miembro, quien lo creó, o el SuperAdmin.
-- Buscar un grupo por código para unirse pasa por el RPC
-- buscar_grupo_por_codigo, no por SELECT directo, así los grupos de
-- terceros no quedan listables/enumerables por cualquier autenticado.
create policy "grupos visibles para sus miembros"
  on public.groups for select
  to authenticated
  using (
    creado_por = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = groups.id and gm.usuario_id = auth.uid()
    )
  );

create policy "roster visible para miembros del mismo grupo"
  on public.group_members for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.usuario_id = auth.uid()
    )
  );

-- El interesado ve su propia solicitud; el admin del grupo ve las de su grupo.
create policy "solicitudes visibles para interesado o admin del grupo"
  on public.group_join_requests for select
  to authenticated
  using (
    usuario_id = auth.uid()
    or is_admin()
    or exists (
      select 1 from public.groups g
      where g.id = group_join_requests.group_id and g.creado_por = auth.uid()
    )
  );

-- RPCs --------------------------------------------------------------------
-- Mismo estilo que resolver_solicitud/is_admin: security definer,
-- search_path fijo. Ninguna de las 3 tablas tiene policy de
-- insert/update para authenticated: toda escritura pasa por acá.

create or replace function public.crear_grupo(p_nombre text, p_tournament_id bigint)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_codigo text;
  v_group_id bigint;
begin
  loop
    v_codigo := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from groups where codigo_invitacion = v_codigo);
  end loop;

  insert into groups (nombre, tournament_id, codigo_invitacion, creado_por)
    values (p_nombre, p_tournament_id, v_codigo, auth.uid())
    returning id into v_group_id;

  insert into group_members (group_id, usuario_id) values (v_group_id, auth.uid());

  return v_group_id;
end;
$$;

create or replace function public.buscar_grupo_por_codigo(p_codigo text)
returns table (id bigint, nombre text, tournament_id bigint)
language sql
security definer
set search_path to 'public'
as $$
  select id, nombre, tournament_id
  from groups
  where codigo_invitacion = upper(trim(p_codigo));
$$;

create or replace function public.solicitar_union_grupo(p_group_id bigint, p_nota text default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if exists (select 1 from group_members where group_id = p_group_id and usuario_id = auth.uid()) then
    raise exception 'Ya eres miembro de este grupo';
  end if;

  insert into group_join_requests (group_id, usuario_id, nota)
    values (p_group_id, auth.uid(), p_nota);
end;
$$;

create or replace function public.resolver_solicitud_grupo(p_solicitud_id bigint, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_group_id bigint;
  v_usuario_id uuid;
begin
  select group_id, usuario_id into v_group_id, v_usuario_id
    from group_join_requests
    where id = p_solicitud_id and estado = 'pendiente';

  if v_group_id is null then
    raise exception 'Solicitud no encontrada o ya resuelta';
  end if;

  if not exists (select 1 from groups where id = v_group_id and creado_por = auth.uid()) then
    raise exception 'No autorizado';
  end if;

  if p_aprobar then
    insert into group_members (group_id, usuario_id)
      values (v_group_id, v_usuario_id)
      on conflict do nothing;
    update group_join_requests set estado = 'aprobado', resuelto_en = now()
      where id = p_solicitud_id;
  else
    update group_join_requests set estado = 'rechazado', resuelto_en = now()
      where id = p_solicitud_id;
  end if;
end;
$$;

-- Permisos ------------------------------------------------------------
-- Postgres otorga EXECUTE a PUBLIC por default en toda función nueva.
-- Ninguna de estas 4 tiene sentido para alguien no logueado (mismo
-- gotcha que ya vivimos con is_admin()/correo_autorizado(): hay que
-- revocar explícito de public/anon/authenticated y volver a otorgar
-- solo a authenticated, no alcanza con revocar de PUBLIC nomás).

revoke execute on function public.crear_grupo(text, bigint) from public, anon, authenticated;
grant execute on function public.crear_grupo(text, bigint) to authenticated;

revoke execute on function public.buscar_grupo_por_codigo(text) from public, anon, authenticated;
grant execute on function public.buscar_grupo_por_codigo(text) to authenticated;

revoke execute on function public.solicitar_union_grupo(bigint, text) from public, anon, authenticated;
grant execute on function public.solicitar_union_grupo(bigint, text) to authenticated;

revoke execute on function public.resolver_solicitud_grupo(bigint, boolean) from public, anon, authenticated;
grant execute on function public.resolver_solicitud_grupo(bigint, boolean) to authenticated;
