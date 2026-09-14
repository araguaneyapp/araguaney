-- Programa los cron jobs que disparan las Edge Functions de sincronización.
-- Correr DESPUÉS de:
--   1. supabase functions deploy sync-partidos
--   2. supabase functions deploy sync-standings
--   3. supabase secrets set API_FOOTBALL_KEY=... API_FOOTBALL_LEAGUE_ID=... API_FOOTBALL_SEASON=...
--
-- Reemplazar <PROJECT_REF> por el ref del proyecto y <SERVICE_ROLE_KEY> por
-- la service role key (Settings > API). No es la anon key: pg_net la manda
-- como Authorization para que la Edge Function no la rechace por falta de JWT.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada 15 min: la función misma decide si hay algo que mirar (revisa la
-- base antes de gastar una llamada a la API). Ajustar el rango horario del
-- cron a cuando de verdad hay partidos si se quiere gastar menos aún.
select cron.schedule(
  'sync-partidos',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-partidos',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Una vez al día alcanza para la tabla de posiciones.
select cron.schedule(
  'sync-standings',
  '0 6 * * *', -- 06:00 UTC
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/sync-standings',
    headers := jsonb_build_object(
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>',
      'Content-Type', 'application/json'
    )
  );
  $$
);

-- Para revisar los jobs programados:
-- select * from cron.job;
-- Para borrar uno si algo sale mal:
-- select cron.unschedule('sync-partidos');
