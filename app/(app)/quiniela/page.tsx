import { createClient } from "@/lib/supabase-server";
import { QuinielaCliente } from "@/components/quiniela-cliente";

export default async function QuinielaPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: partidosData } = await supabase
    .from("matches")
    .select(
      `
      id,
      grupo,
      fase,
      gameday_id,
      inicio_utc,
      deadline,
      ref_local,
      ref_visitante,
      sede,
      local:teams!equipo_local_id(id, nombre, codigo_iso),
      visitante:teams!equipo_visitante_id(id, nombre, codigo_iso),
      predictions(marcador_local, marcador_visitante, usuario_id, equipo_avanza_predicho)
    `
    )
    .order("inicio_utc", { ascending: true });

  const partidos = (partidosData ?? []).map((p) => ({
    ...p,
    local: Array.isArray(p.local) ? (p.local[0] ?? null) : p.local,
    visitante: Array.isArray(p.visitante) ? (p.visitante[0] ?? null) : p.visitante,
  }));

  const { data: gamedays } = await supabase
    .from("gamedays")
    .select("id, fecha, fase")
    .order("fecha", { ascending: true });

  const { data: groupPreds } = await supabase
    .from("group_predictions")
    .select("grupo, posicion")
    .eq("usuario_id", user?.id ?? "");

  const gruposCompletos = new Set(
    Object.entries(
      (groupPreds ?? []).reduce<Record<string, number>>((acc, p) => {
        acc[p.grupo] = (acc[p.grupo] ?? 0) + 1;
        return acc;
      }, {})
    )
      .filter(([, count]) => count >= 2)
      .map(([grupo]) => grupo)
  ).size;

  const { data: extras } = await supabase
    .from("special_predictions")
    .select("campeon_id, subcampeon_id, goleador_nombre")
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle();

  const extrasCompletos =
    extras != null &&
    extras.campeon_id != null &&
    extras.subcampeon_id != null &&
    (extras.goleador_nombre ?? "").trim().length > 0;

  return (
    <QuinielaCliente
      partidos={partidos}
      gamedays={gamedays ?? []}
      usuarioId={user?.id ?? ""}
      gruposCompletos={gruposCompletos}
      extrasCompletos={extrasCompletos}
    />
  );
}