-- Notificaciones de group_join_requests (reemplaza al viejo
-- notificar-solicitudes.sql de access_requests, ya borrado).
--
-- Correr DESPUÉS de:
--   supabase functions deploy notify-solicitud-grupo --no-verify-jwt
-- (RESEND_API_KEY ya debería existir de send-email)
--
-- Reemplazar doowoivzivahqlhptgrq por el ref del proyecto, igual que en sync-cron.sql.
--
-- group_join_requests solo tiene usuario_id (uuid), no email: a diferencia
-- de la vieja access_requests, el solicitante ya es un usuario registrado.
-- El correo se resuelve acá adentro contra auth.users, algo que solo puede
-- hacer una función que corre como su dueño (postgres), nunca desde el
-- cliente ni desde una policy de authenticated.

create or replace function public.notificar_solicitud_grupo_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_admin text;
  v_email_solicitante text;
  v_nombre_grupo text;
begin
  select au.email into v_email_admin
    from auth.users au
    join public.groups g on g.creado_por = au.id
    where g.id = new.group_id;

  select email into v_email_solicitante from auth.users where id = new.usuario_id;
  select nombre into v_nombre_grupo from public.groups where id = new.group_id;

  perform net.http_post(
    url := 'https://doowoivzivahqlhptgrq.supabase.co/functions/v1/notify-solicitud-grupo',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'tipo', 'nueva',
      'email_admin', v_email_admin,
      'email_solicitante', v_email_solicitante,
      'nombre_grupo', v_nombre_grupo,
      'nota', new.nota
    )
  );
  return new;
end;
$$;

create trigger on_group_join_request_created
  after insert on public.group_join_requests
  for each row execute function public.notificar_solicitud_grupo_nueva();

create or replace function public.notificar_solicitud_grupo_resuelta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email_solicitante text;
  v_nombre_grupo text;
begin
  if new.estado = old.estado then
    return new; -- no cambió el estado, no hay nada que avisar
  end if;

  if new.estado in ('aprobado', 'rechazado') then
    select email into v_email_solicitante from auth.users where id = new.usuario_id;
    select nombre into v_nombre_grupo from public.groups where id = new.group_id;

    perform net.http_post(
      url := 'https://doowoivzivahqlhptgrq.supabase.co/functions/v1/notify-solicitud-grupo',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'tipo', case new.estado when 'aprobado' then 'aprobada' else 'rechazada' end,
        'email_solicitante', v_email_solicitante,
        'nombre_grupo', v_nombre_grupo
      )
    );
  end if;

  return new;
end;
$$;

create trigger on_group_join_request_resolved
  after update on public.group_join_requests
  for each row execute function public.notificar_solicitud_grupo_resuelta();
