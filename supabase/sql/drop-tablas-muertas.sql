-- equipos y torneos son tablas muertas de la migración a multi-torneo:
-- ninguna FK las referencia, RLS activo sin policies (ilegibles desde la
-- app) y las reemplazan teams/tournaments. Ver memoria araguaney-multi-torneo.

drop table if exists public.equipos;
drop table if exists public.torneos;
