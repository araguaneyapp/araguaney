// Edge Function: sugiere el goleador oficial cruzando el Top Scorer de
// RapidAPI contra nuestra tabla `players`. NUNCA guarda nada sola — solo
// devuelve una sugerencia para que el SuperAdmin la confirme con el mismo
// picker manual de /admin/resultados/goleador (doble confirmación).
//
// Deploy: supabase functions deploy sugerir-goleador --no-verify-jwt
// Secretos (ya deberían existir de sync-resultados):
//   RAPIDAPI_KEY, RAPIDAPI_HOST

import { createClient } from "jsr:@supabase/supabase-js@2";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

Deno.serve(async (req) => {
  const { tournament_id } = (await req.json()) as { tournament_id: number };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("RAPIDAPI_KEY")!;
  const apiHost = Deno.env.get("RAPIDAPI_HOST")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: torneo } = await supabase
    .from("tournaments")
    .select("api_league_id")
    .eq("id", tournament_id)
    .maybeSingle();

  if (!torneo?.api_league_id) {
    return Response.json({ error: "Este torneo no tiene api_league_id configurado." }, { status: 400 });
  }

  const resp = await fetch(
    `https://${apiHost}/football-get-top-players-by-goals?leagueid=${torneo.api_league_id}`,
    { headers: { "x-rapidapi-host": apiHost, "x-rapidapi-key": apiKey } }
  );

  if (!resp.ok) {
    return Response.json({ error: "La API de goleadores no respondió." }, { status: 502 });
  }

  const data = (await resp.json()) as {
    response: { players: { name: string; teamId: number; goals: number }[] };
  };

  const top = data.response?.players?.[0];
  if (!top) {
    return Response.json({ error: "La API no devolvió ningún goleador todavía." }, { status: 404 });
  }

  const { data: equipo } = await supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournament_id)
    .eq("api_id", top.teamId)
    .maybeSingle();

  let jugadorId: number | null = null;
  let jugadorNombre: string | null = null;

  if (equipo) {
    const { data: candidatos } = await supabase
      .from("players")
      .select("id, nombre")
      .eq("tournament_id", tournament_id)
      .eq("equipo_id", equipo.id);

    const nombreApi = normalizar(top.name);
    const match = (candidatos ?? []).find(
      (c) => normalizar(c.nombre) === nombreApi || normalizar(c.nombre).includes(nombreApi)
    );
    if (match) {
      jugadorId = match.id;
      jugadorNombre = match.nombre;
    }
  }

  return Response.json({
    ok: true,
    nombre_api: top.name,
    goles: top.goals,
    jugador_id: jugadorId,
    jugador_nombre: jugadorNombre,
  });
});
