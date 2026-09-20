-- Habilita Realtime en group_join_requests: sin esto, la suscripción del
-- cliente (campana de notificaciones) nunca recibe eventos, aunque el
-- código esté bien — por defecto ninguna tabla está en la publicación.
alter publication supabase_realtime add table public.group_join_requests;
