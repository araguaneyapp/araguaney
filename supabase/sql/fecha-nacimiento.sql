-- Fecha de nacimiento: se pide solo al crear cuenta (verificación de 18+ en
-- el cliente, antes de llamar a signInWithOtp). Nullable porque las cuentas
-- existentes no la tienen y no se les exige retroactivo.
alter table public.profiles add column if not exists fecha_nacimiento date;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, nombre, fecha_nacimiento)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'fecha_nacimiento')::date
  );
  return new;
end;
$$;
