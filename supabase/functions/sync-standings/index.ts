// Edge Function: trae la tabla de la fase de liga desde API-Football y la
// guarda tal cual en `standings` (no se recalcula desde resultados, por los
// 11 criterios de desempate oficiales — ver checklist del proyecto).
// Pensada para correr 1 vez al día, no en cada tick del cron de partidos.
//
// Deploy: supabase functions deploy sync-standings
// Mismos secretos que sync-partidos (API_FOOTBALL_KEY/LEAGUE_ID/SEASON).

import { createClient } from "jsr:@supabase/supabase-js@2";

type FilaStandings = {
  team: { id: number };
  rank: number;
  points: number;
  all: {
    played: number;
    win: number;
    draw: number;
    lose: number;
    goals: { for: number; against: number };
  };
};

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("API_FOOTBALL_KEY")!;
  const leagueId = Deno.env.get("API_FOOTBALL_LEAGUE_ID")!;
  const season = Deno.env.get("API_FOOTBALL_SEASON")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: torneo, error: errorTorneo } = await supabase
    .from("tournaments")
    .select("id")
    .eq("slug", "champions-2026")
    .maybeSingle();

  if (errorTorneo || !torneo) {
    return Response.json(
      { error: errorTorneo?.message ?? "torneo no encontrado" },
      { status: 500 }
    );
  }

  const { data: equipos, error: errorEquipos } = await supabase
    .from("teams")
    .select("id, api_id")
    .eq("tournament_id", torneo.id)
    .not("api_id", "is", null);

  if (errorEquipos) {
    return Response.json({ error: errorEquipos.message }, { status: 500 });
  }

  const equipoPorApiId = new Map(equipos?.map((e) => [e.api_id, e.id]) ?? []);

  const resp = await fetch(
    `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`,
    { headers: { "x-apisports-key": apiKey } }
  );

  if (!resp.ok) {
    return Response.json(
      { error: `API-Football respondió ${resp.status}` },
      { status: 502 }
    );
  }

  const data = await resp.json();
  // La fase de liga de 36 llega como una sola tabla (no hay grupos): el
  // primer bloque de `league.standings` es la tabla completa.
  const filas = (data?.response?.[0]?.league?.standings?.[0] ?? []) as FilaStandings[];

  let actualizados = 0;

  for (const fila of filas) {
    const equipoId = equipoPorApiId.get(fila.team.id);
    if (!equipoId) continue; // equipo sin api_id cargado todavía

    const { error } = await supabase.from("standings").upsert(
      {
        tournament_id: torneo.id,
        equipo_id: equipoId,
        posicion: fila.rank,
        pj: fila.all.played,
        g: fila.all.win,
        e: fila.all.draw,
        p: fila.all.lose,
        gf: fila.all.goals.for,
        gc: fila.all.goals.against,
        dg: fila.all.goals.for - fila.all.goals.against,
        pts: fila.points,
      },
      { onConflict: "tournament_id,equipo_id" }
    );

    if (!error) actualizados++;
  }

  return Response.json({ ok: true, llamadas: 1, actualizados });
});
