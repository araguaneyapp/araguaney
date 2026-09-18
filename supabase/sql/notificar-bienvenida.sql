-- Correo de bienvenida al crear la cuenta (primer insert en auth.users).
-- Convive con on_auth_user_created (crea la fila de profiles) sin
-- interferir: son dos triggers AFTER INSERT independientes.
--
-- Correr DESPUÉS de:
--   supabase functions deploy notify-bienvenida --no-verify-jwt
-- (RESEND_API_KEY ya debería existir de las otras funciones)
--
-- Reemplazar doowoivzivahqlhptgrq si el proyecto cambiara de ref.

create or replace function public.notificar_bienvenida()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://doowoivzivahqlhptgrq.supabase.co/functions/v1/notify-bienvenida',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'email', new.email,
      'nombre', coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1))
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created_bienvenida
  after insert on auth.users
  for each row execute function public.notificar_bienvenida();
