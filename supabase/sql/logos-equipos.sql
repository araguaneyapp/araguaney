-- Logos de los 36 equipos de Champions 2026/27. No usa la API (0 llamados
-- de cuota) — la URL del logo de Fotmob es un CDN público, armado directo
-- con el api_id que ya está guardado en `teams` (verificado a mano: los 36
-- responden 200 antes de correr esto).
update public.teams
set logo_url = 'https://images.fotmob.com/image_resources/logo/teamlogo/' || api_id || '.png'
where tournament_id = 2 and api_id is not null;
