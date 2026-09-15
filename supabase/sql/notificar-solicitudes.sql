-- Dispara notify-solicitud desde la base, no desde el cliente: así el aviso
-- sale sin importar por dónde se creó/resolvió la solicitud.
--
-- Correr DESPUÉS de:
--   supabase functions deploy notify-solicitud --no-verify-jwt
--   supabase secrets set ADMIN_NOTIFY_EMAIL=araguaneyjuegos@gmail.com
-- (RESEND_API_KEY ya debería existir de send-email)
--
-- Reemplazar <PROJECT_REF> por el ref del proyecto, igual que en sync-cron.sql.

create or replace function public.notificar_solicitud_nueva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-solicitud',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'tipo', 'nueva',
      'email_solicitante', new.email,
      'nota', new.nota
    )
  );
  return new;
end;
$$;

create trigger on_access_request_created
  after insert on public.access_requests
  for each row execute function public.notificar_solicitud_nueva();

create or replace function public.notificar_solicitud_resuelta()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.estado = old.estado then
    return new; -- no cambió el estado, no hay nada que avisar
  end if;

  if new.estado in ('aprobado', 'rechazado') then
    perform net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/notify-solicitud',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'tipo', case new.estado when 'aprobado' then 'aprobada' else 'rechazada' end,
        'email_solicitante', new.email
      )
    );
  end if;

  return new;
end;
$$;

create trigger on_access_request_resolved
  after update on public.access_requests
  for each row execute function public.notificar_solicitud_resuelta();
