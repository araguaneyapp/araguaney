-- Evita mandar el correo de resultados finales dos veces al mismo grupo
-- (el botón "Finalizar torneo" se puede apretar más de una vez sin querer).
create table public.email_final_torneo_enviado (
  group_id bigint primary key references public.groups(id) on delete cascade,
  enviado_en timestamptz not null default now()
);

alter table public.email_final_torneo_enviado enable row level security;
-- Sin policies: nadie autenticado necesita leer/escribir esto desde el
-- cliente, solo la Edge Function finalizar-torneo (service role).
