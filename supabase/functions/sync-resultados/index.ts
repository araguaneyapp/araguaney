// Edge Function: sincroniza resultados de partidos pendientes de un torneo
// contra RapidAPI "Free API Live Football Data" (datos de Fotmob).
//
// A diferencia del scaffold viejo (pensado para API-Football + pg_cron cada
// 15 min), esta corre BAJO DEMANDA — la dispara el botón "Actualizar desde
// API" en /admin/resultados, no un cron. El plan gratis de esta API es de
// 100 requests/MES (no por día), insuficiente para polling automático, pero
// de sobra para unos clicks manuales por jornada.
//
// Deploy: supabase functions deploy sync-resultados --no-verify-jwt
// (mismo patrón que las demás funciones: el acceso real ya lo controla
// /admin/layout.tsx del lado de la app, no hace falta verificar JWT acá)
// Secretos (supabase secrets set ...):
//   RAPIDAPI_KEY   - key de tu cuenta en rapidapi.com
//   RAPIDAPI_HOST  - free-api-live-football-data.p.rapidapi.com
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los provee Supabase en runtime.
//
// Requiere que tournaments.api_league_id y teams.api_id ya estén cargados
// (ver sql/tournaments-api-league-id.sql y sql/mapeo-teams-api-id.sql) — el
// match se hace por ID numérico, nunca por nombre de equipo (varios no
// calzan como texto exacto entre esta API y nuestra base, ej. "Stuttgart"
// vs "VfB Stuttgart").

import { createClient } from "jsr:@supabase/supabase-js@2";

type EquipoFixture = { id: number; score: number; name: string };

type FixtureStatus = {
  started: boolean;
  finished: boolean;
  cancelled: boolean;
  reason?: { short: string };
};

type Fixture = {
  id: number;
  home: EquipoFixture;
  away: EquipoFixture;
  status: FixtureStatus;
};

type RespuestaFecha = {
  response: { matches: Fixture[] }[];
};

type PartidoPendiente = {
  id: number;
  inicio_utc: string | null;
  local: { api_id: number | null } | { api_id: number | null }[] | null;
  visitante: { api_id: number | null } | { api_id: number | null }[] | null;
};

function uno<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? v[0] ?? null : v;
}

/** YYYYMMDD, como lo pide el parámetro `date` de esta API. */
function comoFecha(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

Deno.serve(async (req) => {
  const { tournament_id } = (await req.json()) as { tournament_id: number };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("RAPIDAPI_KEY")!;
  const apiHost = Deno.env.get("RAPIDAPI_HOST")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: torneo, error: errorTorneo } = await supabase
    .from("tournaments")
    .select("api_league_id")
    .eq("id", tournament_id)
    .maybeSingle();

  if (errorTorneo || !torneo?.api_league_id) {
    return Response.json(
      { error: "Este torneo no tiene api_league_id configurado." },
      { status: 400 }
    );
  }

  const { data: pendientesData, error: errorPendientes } = await supabase
    .from("matches")
    .select(
      `
      id,
      inicio_utc,
      local:teams!equipo_local_id(api_id),
      visitante:teams!equipo_visitante_id(api_id)
    `
    )
    .eq("tournament_id", tournament_id)
    .not("status", "in", "(finished,published)")
    .eq("editado_manual", false)
    .not("inicio_utc", "is", null);

  if (errorPendientes) {
    return Response.json({ error: errorPendientes.message }, { status: 500 });
  }

  const pendientes = (pendientesData ?? []) as PartidoPendiente[];

  if (pendientes.length === 0) {
    return Response.json({ ok: true, motivo: "sin partidos pendientes", llamadas: 0 });
  }

  // El bucket de "fecha" de esta API no siempre coincide con la fecha UTC
  // del partido (se vio corrido +1 día en pruebas) — se consulta un margen
  // de un día antes y uno después de cada partido pendiente para no
  // depender de adivinar el desfase exacto.
  const fechasAConsultar = new Set<string>();
  for (const p of pendientes) {
    const base = new Date(p.inicio_utc!);
    for (const offset of [-1, 0, 1]) {
      const d = new Date(base);
      d.setUTCDate(d.getUTCDate() + offset);
      fechasAConsultar.add(comoFecha(d));
    }
  }

  const fixturesPorPar = new Map<string, Fixture>();

  for (const fecha of fechasAConsultar) {
    const resp = await fetch(
      `https://${apiHost}/football-get-matches-by-date-and-league?date=${fecha}&leagueid=${torneo.api_league_id}`,
      { headers: { "x-rapidapi-host": apiHost, "x-rapidapi-key": apiKey } }
    );

    if (!resp.ok) continue; // esa fecha en particular falló, se sigue con las demás

    const data = (await resp.json()) as RespuestaFecha;
    for (const grupo of data.response ?? []) {
      for (const fixture of grupo.matches ?? []) {
        fixturesPorPar.set(`${fixture.home.id}-${fixture.away.id}`, fixture);
      }
    }
  }

  let actualizados = 0;
  let sinResultadoAun = 0;
  let sinMapear = 0;

  for (const partido of pendientes) {
    const local = uno(partido.local);
    const visitante = uno(partido.visitante);

    if (local?.api_id == null || visitante?.api_id == null) {
      sinMapear++;
      continue;
    }

    const fixture = fixturesPorPar.get(`${local.api_id}-${visitante.api_id}`);
    if (!fixture) {
      sinResultadoAun++;
      continue;
    }

    if (!fixture.status.started) {
      sinResultadoAun++;
      continue; // todavía no arranca: el score en 0-0 no es un resultado real
    }

    const status = fixture.status.finished ? "finished" : "live";

    const { error: errorUpdate } = await supabase
      .from("matches")
      .update({
        status,
        marcador_local: fixture.home.score,
        marcador_visitante: fixture.away.score,
        resuelto_en: fixture.status.finished ? "agregado" : null,
        api_id: fixture.id,
      })
      .eq("id", partido.id);

    if (!errorUpdate) actualizados++;
  }

  return Response.json({
    ok: true,
    llamadas: fechasAConsultar.size,
    revisados: pendientes.length,
    actualizados,
    sin_resultado_aun: sinResultadoAun,
    sin_mapear: sinMapear,
  });
});
