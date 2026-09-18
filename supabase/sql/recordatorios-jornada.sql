-- Recordatorio 24h antes del primer partido de una jornada, a quien le
-- falte predecir al menos un partido de ella. Corre por pg_cron cada hora
-- (no se dispara con un trigger, como los otros correos: no hay ningún
-- insert/update que marque "ya casi es la jornada").
--
-- Correr DESPUÉS de:
--   supabase functions deploy notify-recordatorio --no-verify-jwt
-- (RESEND_API_KEY ya debería existir de las otras funciones)

create extension if not exists pg_cron;

-- Evita mandar el mismo recordatorio dos veces (el cron corre cada hora,
-- pero la ventana de "está por arrancar" solo debería calzar una vez).
create table public.recordatorio_jornada_enviado (
  usuario_id uuid not null references public.profiles(id) on delete cascade,
  gameday_id bigint not null references public.gamedays(id) on delete cascade,
  enviado_en timestamptz not null default now(),
  primary key (usuario_id, gameday_id)
);

alter table public.recordatorio_jornada_enviado enable row level security;
-- Sin policies: nadie autenticado necesita leer/escribir esto desde el
-- cliente, solo la función de acá abajo (que corre como su dueño).

create or replace function public.enviar_recordatorios_pendientes()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  for r in (
    select distinct
      g.id as gameday_id,
      g.nombre as nombre_jornada,
      t.slug as torneo_slug,
      gm.usuario_id,
      p.nombre,
      au.email
    from gamedays g
    join tournaments t on t.id = g.tournament_id
    join groups gr on gr.tournament_id = t.id
    join group_members gm on gm.group_id = gr.id
    join profiles p on p.id = gm.usuario_id
    join auth.users au on au.id = gm.usuario_id
    where exists (
      select 1 from matches m
      where m.gameday_id = g.id
      group by m.gameday_id
      having min(m.inicio_utc) between now() + interval '23 hours' and now() + interval '24 hours'
    )
    and exists (
      select 1 from matches m
      where m.gameday_id = g.id
        and not exists (
          select 1 from predictions pr
          where pr.match_id = m.id and pr.usuario_id = gm.usuario_id
        )
    )
    and not exists (
      select 1 from recordatorio_jornada_enviado rje
      where rje.usuario_id = gm.usuario_id and rje.gameday_id = g.id
    )
  )
  loop
    perform net.http_post(
      url := 'https://doowoivzivahqlhptgrq.supabase.co/functions/v1/notify-recordatorio',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object(
        'email', r.email,
        'nombre', r.nombre,
        'nombre_jornada', r.nombre_jornada,
        'torneo_slug', r.torneo_slug
      )
    );

    insert into recordatorio_jornada_enviado (usuario_id, gameday_id)
      values (r.usuario_id, r.gameday_id);
  end loop;
end;
$$;

select cron.schedule(
  'recordatorios-jornada',
  '0 * * * *', -- cada hora, en punto
  $$ select public.enviar_recordatorios_pendientes(); $$
);

-- Para revisar el job: select * from cron.job;
-- Para borrarlo: select cron.unschedule('recordatorios-jornada');
