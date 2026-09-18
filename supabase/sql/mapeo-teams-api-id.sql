-- Mapeo manual (una sola vez) de los 36 equipos de Champions 2026/27 contra
-- sus IDs en Fotmob (vía RapidAPI "Free API Live Football Data"). Se armó
-- cruzando los 18 partidos reales de la Jornada 1 (todos los equipos juegan
-- una vez) contra nuestra propia tabla `teams`, a mano — varios nombres NO
-- calzan como texto exacto (ej. "Stuttgart" vs "VfB Stuttgart", "Slavia
-- Praha" vs "Slavia Prague", "Porto" vs "FC Porto"), por eso el sync de acá
-- en adelante compara por este ID numérico, nunca por nombre.

update public.teams set api_id = 8563 where nombre = 'AEK Athens';
update public.teams set api_id = 9825 where nombre = 'Arsenal';
update public.teams set api_id = 10252 where nombre = 'Aston Villa';
update public.teams set api_id = 9906 where nombre = 'Atlético de Madrid';
update public.teams set api_id = 8634 where nombre = 'Barcelona';
update public.teams set api_id = 9823 where nombre = 'Bayern München';
update public.teams set api_id = 8402 where nombre = 'Bodø/Glimt';
update public.teams set api_id = 9789 where nombre = 'Borussia Dortmund';
update public.teams set api_id = 8342 where nombre = 'Club Brugge';
update public.teams set api_id = 10171 where nombre = 'Como';
update public.teams set api_id = 8695 where nombre = 'Fenerbahçe';
update public.teams set api_id = 10235 where nombre = 'Feyenoord';
update public.teams set api_id = 8637 where nombre = 'Galatasaray';
update public.teams set api_id = 8636 where nombre = 'Inter';
update public.teams set api_id = 9977 where nombre = 'LASK';
update public.teams set api_id = 8588 where nombre = 'Lens';
update public.teams set api_id = 8639 where nombre = 'Lille';
update public.teams set api_id = 8650 where nombre = 'Liverpool';
update public.teams set api_id = 8456 where nombre = 'Manchester City';
update public.teams set api_id = 10260 where nombre = 'Manchester United';
update public.teams set api_id = 9875 where nombre = 'Napoli';
update public.teams set api_id = 9847 where nombre = 'Paris Saint-Germain';
update public.teams set api_id = 9773 where nombre = 'Porto';
update public.teams set api_id = 8640 where nombre = 'PSV';
update public.teams set api_id = 178475 where nombre = 'RB Leipzig';
update public.teams set api_id = 8603 where nombre = 'Real Betis';
update public.teams set api_id = 8633 where nombre = 'Real Madrid';
update public.teams set api_id = 8686 where nombre = 'Roma';
update public.teams set api_id = 951893 where nombre = 'Sabah';
update public.teams set api_id = 9728 where nombre = 'Shakhtar Donetsk';
update public.teams set api_id = 7787 where nombre = 'Slavia Praha';
update public.teams set api_id = 6019 where nombre = 'Slovan Bratislava';
update public.teams set api_id = 9768 where nombre = 'Sporting CP';
update public.teams set api_id = 10269 where nombre = 'Stuttgart';
update public.teams set api_id = 8478 where nombre = 'Viking';
update public.teams set api_id = 10205 where nombre = 'Villarreal';

-- Verificación: deben ser 36 filas actualizadas, ninguna en null.
-- select count(*) from teams t join tournaments tour on tour.id = t.tournament_id
--   where tour.slug = 'champions-2026' and t.api_id is null;
