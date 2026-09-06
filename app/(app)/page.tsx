import { createClient } from "@/lib/supabase-server";
import { PorPredecir } from "@/components/por-predecir";
import { TusExtras } from "@/components/tus-extras";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ranking } = await supabase
    .from("ranking")
    .select("nombre, puntos_total, posicion")
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle();

  const nombre = ranking?.nombre ?? "jugador";
  const posicion = ranking?.posicion != null ? `${ranking.posicion}°` : "–";
  const puntos = ranking?.puntos_total ?? 0;

  const ahora = new Date().toISOString();

  const { data: partidosData } = await supabase
    .from("matches")
    .select(
      `
      id,
      grupo,
      inicio_utc,
      deadline,
      ref_local,
      ref_visitante,
      sede,
      local:teams!equipo_local_id(nombre, codigo_iso),
      visitante:teams!equipo_visitante_id(nombre, codigo_iso),
      predictions(marcador_local, marcador_visitante)
    `
    )
    .eq("status", "scheduled")
    .gt("deadline", ahora)
    .eq("predictions.usuario_id", user?.id ?? "")
    .order("inicio_utc", { ascending: true })
    .limit(3);

  const partidos = (partidosData ?? []).map((p) => ({
    ...p,
    local: Array.isArray(p.local) ? (p.local[0] ?? null) : p.local,
    visitante: Array.isArray(p.visitante) ? (p.visitante[0] ?? null) : p.visitante,
  }));

  const { data: extrasData } = await supabase
    .from("special_predictions")
    .select(
      `
      goleador_nombre,
      campeon:teams!campeon_id(nombre, codigo_iso),
      subcampeon:teams!subcampeon_id(nombre, codigo_iso)
    `
    )
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle();

  const extras = extrasData
    ? {
        ...extrasData,
        campeon: Array.isArray(extrasData.campeon)
          ? (extrasData.campeon[0] ?? null)
          : extrasData.campeon,
        subcampeon: Array.isArray(extrasData.subcampeon)
          ? (extrasData.subcampeon[0] ?? null)
          : extrasData.subcampeon,
      }
    : null;

  return (
    <main className="min-h-screen px-5 pt-4 pb-6">
      <div className="mb-5">
        <p className="text-text-secondary text-body-sm">Hola,</p>
        <h1 className="text-heading-xl leading-tight">{nombre} 👋</h1>
      </div>

      <div className="mb-5 flex items-center justify-between rounded-2xl bg-accent-default px-5 py-4 text-text-on-accent">
        <div className="flex flex-col">
          <span className="text-label-md-caps text-accent-dark">
            TU POSICIÓN
          </span>
          <span className="text-display-xl leading-none">
            {posicion}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-display-xl leading-none">
            {puntos}
          </span>
          <span className="text-label-md-caps text-accent-dark">
            PUNTOS
          </span>
        </div>
      </div>

      <PorPredecir partidos={partidos} />

      <TusExtras extras={extras} />
    </main>
  );
}