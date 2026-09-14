// Edge Function: sincroniza resultados en vivo de la fase actual del torneo
// contra API-Football, y los escribe en `matches`. El resto (puntos, avance
// de llave, ranking) lo hacen los triggers que ya existen en la base: esta
// función solo actualiza status/marcador/penales/prórroga.
//
// Deploy: supabase functions deploy sync-partidos
// Secretos necesarios (supabase secrets set ...):
//   API_FOOTBALL_KEY        - api key de API-Football
//   API_FOOTBALL_LEAGUE_ID  - id de liga en API-Football (verificar en su doc)
//   API_FOOTBALL_SEASON     - temporada, ej. 2026
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los provee Supabase en runtime.
//
// No se llama nunca desde el frontend: la ejecuta pg_cron vía pg_net (ver
// supabase/sql/sync-cron.sql).

import { createClient } from "jsr:@supabase/supabase-js@2";

type FixtureStatusShort =
  | "NS"
  | "1H"
  | "HT"
  | "2H"
  | "ET"
  | "BT"
  | "P"
  | "SUSP"
  | "INT"
  | "FT"
  | "AET"
  | "PEN"
  | "PST"
  | "CANC"
  | "ABD"
  | "AWD"
  | "WO";

type Fixture = {
  fixture: { id: number; status: { short: FixtureStatusShort } };
  goals: { home: number | null; away: number | null };
  score: {
    penalty: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
  };
};

const EN_VIVO = new Set<FixtureStatusShort>(["1H", "HT", "2H", "ET", "BT", "P"]);
const TERMINADO = new Set<FixtureStatusShort>(["FT", "AET", "PEN"]);

function estadoPartido(status: FixtureStatusShort): "scheduled" | "live" | "finished" | null {
  if (status === "NS" || status === "PST") return "scheduled";
  if (EN_VIVO.has(status)) return "live";
  if (TERMINADO.has(status)) return "finished";
  // CANC/ABD/AWD/WO/SUSP/INT: casos raros que no se auto-resuelven, se
  // dejan para revisión manual del admin en vez de adivinar un estado.
  return null;
}

function resueltoEn(status: FixtureStatusShort): string | null {
  if (status === "PEN") return "penales";
  if (status === "AET") return "prorroga";
  if (status === "FT") return "agregado";
  return null;
}

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("API_FOOTBALL_KEY")!;
  const leagueId = Deno.env.get("API_FOOTBALL_LEAGUE_ID")!;
  const season = Deno.env.get("API_FOOTBALL_SEASON")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Partidos de hoy que todavía no cuelgan un resultado definitivo. Si no
  // hay ninguno, no se llama a la API: el costo de "ver si hay algo que
  // mirar" lo paga la propia base, no la cuota de API-Football.
  const hoyInicio = new Date();
  hoyInicio.setUTCHours(0, 0, 0, 0);
  const hoyFin = new Date(hoyInicio);
  hoyFin.setUTCDate(hoyFin.getUTCDate() + 1);

  const { data: partidosHoy, error: errorPartidos } = await supabase
    .from("matches")
    .select("id, api_id, inicio_utc, status")
    .not("api_id", "is", null)
    .not("status", "in", "(finished,published)")
    .gte("inicio_utc", hoyInicio.toISOString())
    .lt("inicio_utc", hoyFin.toISOString());

  if (errorPartidos) {
    return Response.json({ error: errorPartidos.message }, { status: 500 });
  }

  if (!partidosHoy || partidosHoy.length === 0) {
    return Response.json({ ok: true, motivo: "sin partidos hoy", llamadas: 0 });
  }

  // Si ninguno arrancó todavía, tampoco hace falta llamar: se está en la
  // ventana "pre-inicio" que el propio calendario ya cubre.
  const ahora = Date.now();
  const yaArrancado = partidosHoy.some(
    (p) => p.inicio_utc && new Date(p.inicio_utc).getTime() <= ahora
  );
  if (!yaArrancado) {
    return Response.json({ ok: true, motivo: "ninguno arrancó todavía", llamadas: 0 });
  }

  // Una sola llamada trae todos los partidos en vivo de la liga.
  const resp = await fetch(
    `https://v3.football.api-sports.io/fixtures?live=all&league=${leagueId}&season=${season}`,
    { headers: { "x-apisports-key": apiKey } }
  );

  if (!resp.ok) {
    return Response.json(
      { error: `API-Football respondió ${resp.status}` },
      { status: 502 }
    );
  }

  const { response: fixtures } = (await resp.json()) as { response: Fixture[] };
  const porApiId = new Map(fixtures.map((f) => [f.fixture.id, f]));

  let actualizados = 0;

  for (const partido of partidosHoy) {
    const fixture = porApiId.get(partido.api_id as number);
    if (!fixture) continue; // no está en vivo ahora mismo, se revisa en la próxima pasada

    const status = estadoPartido(fixture.fixture.status.short);
    if (!status) continue; // estado raro (suspendido, etc.): lo revisa el admin a mano

    const { error: errorUpdate } = await supabase
      .from("matches")
      .update({
        status,
        marcador_local: fixture.goals.home,
        marcador_visitante: fixture.goals.away,
        prorroga_local: fixture.score.extratime.home,
        prorroga_visitante: fixture.score.extratime.away,
        penales_local: fixture.score.penalty.home,
        penales_visitante: fixture.score.penalty.away,
        resuelto_en: resueltoEn(fixture.fixture.status.short),
      })
      .eq("id", partido.id);

    if (!errorUpdate) actualizados++;
  }

  return Response.json({ ok: true, llamadas: 1, revisados: partidosHoy.length, actualizados });
});
