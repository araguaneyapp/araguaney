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

type FilaStanding = {
  id: number; // api_id del equipo (Fotmob)
  played: number;
  wins: number;
  draws: number;
  losses: number;
  scoresStr: string; // "GF-GC"
  goalConDiff: number;
  pts: number;
  idx: number; // posición
};

type RespuestaStandings = {
  response: { standing: FilaStanding[] };
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
    .not("inicio_utc", "is", null)
    // Sin esto, CUALQUIER partido futuro (toda la temporada, no solo la
    // jornada en curso) entra como "pendiente" y suma una fecha a
    // consultar por cada uno — no tiene sentido preguntarle a la API por
    // un partido que ni siquiera arrancó.
    .lte("inicio_utc", new Date().toISOString());

  if (errorPendientes) {
    return Response.json({ error: errorPendientes.message }, { status: 500 });
  }

  const pendientes = (pendientesData ?? []) as PartidoPendiente[];

  let llamadas = 0;
  let actualizados = 0;
  let sinResultadoAun = 0;
  let sinMapear = 0;

  if (pendientes.length > 0) {
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
      llamadas++;
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
  }

  // Tabla de posiciones: una sola llamada, se trae completa tal cual (no se
  // recalcula desde resultados, por los 11 criterios de desempate oficiales).
  let tablaActualizada = 0;
  llamadas++;
  const respStandings = await fetch(
    `https://${apiHost}/football-get-standing-all?leagueid=${torneo.api_league_id}`,
    { headers: { "x-rapidapi-host": apiHost, "x-rapidapi-key": apiKey } }
  );

  if (respStandings.ok) {
    const { data: equipos } = await supabase
      .from("teams")
      .select("id, api_id")
      .eq("tournament_id", tournament_id)
      .not("api_id", "is", null);

    const equipoIdPorApiId = new Map(
      (equipos ?? []).map((e) => [e.api_id as number, e.id as number])
    );

    const dataStandings = (await respStandings.json()) as RespuestaStandings;
    for (const fila of dataStandings.response?.standing ?? []) {
      const equipoId = equipoIdPorApiId.get(fila.id);
      if (!equipoId) continue; // equipo sin api_id mapeado todavía

      const [gf, gc] = fila.scoresStr.split("-").map(Number);

      const { error: errorStanding } = await supabase.from("standings").upsert(
        {
          tournament_id,
          equipo_id: equipoId,
          posicion: fila.idx,
          pj: fila.played,
          g: fila.wins,
          e: fila.draws,
          p: fila.losses,
          gf,
          gc,
          dg: fila.goalConDiff,
          pts: fila.pts,
        },
        { onConflict: "tournament_id,equipo_id" }
      );

      if (!errorStanding) tablaActualizada++;
    }
  }

  return Response.json({
    ok: true,
    llamadas,
    revisados: pendientes.length,
    actualizados,
    sin_resultado_aun: sinResultadoAun,
    sin_mapear: sinMapear,
    tabla_actualizada: tablaActualizada,
  });
});
