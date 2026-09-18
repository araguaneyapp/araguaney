-- ID de liga en la API deportiva usada para sync (hoy: RapidAPI "Free API
-- Live Football Data", que expone datos de Fotmob). Vive por torneo, no
-- como secret global, para poder sumar Copa Libertadores u otro torneo sin
-- tocar código — solo esta columna.
alter table public.tournaments add column if not exists api_league_id integer;

update public.tournaments set api_league_id = 42 where slug = 'champions-2026';
