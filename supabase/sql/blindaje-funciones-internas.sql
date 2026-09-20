-- Estas 4 funciones son solo para triggers/cron (nunca las llama el
-- cliente): notificar_bienvenida y notificar_solicitud_grupo_* son
-- `returns trigger` (dependen de new/old, no se pueden invocar sueltas
-- con sentido), pero enviar_recordatorios_pendientes es `returns void`
-- y SÍ es invocable de verdad — sin este revoke, cualquiera (incluso
-- sin loguearse) puede dispararla a mano vía
-- /rest/v1/rpc/enviar_recordatorios_pendientes.
--
-- Revocar EXECUTE no rompe nada: los triggers y el cron job (cron.schedule)
-- siguen corriendo igual, porque ejecutan como dueño de la función, no
-- como anon/authenticated vía PostgREST.

revoke execute on function public.enviar_recordatorios_pendientes() from public, anon, authenticated;
revoke execute on function public.notificar_bienvenida() from public, anon, authenticated;
revoke execute on function public.notificar_solicitud_grupo_nueva() from public, anon, authenticated;
revoke execute on function public.notificar_solicitud_grupo_resuelta() from public, anon, authenticated;
