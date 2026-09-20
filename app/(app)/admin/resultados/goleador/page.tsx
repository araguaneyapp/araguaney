import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getTorneo, getTorneos } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { GoleadorPickerCliente } from "@/components/goleador-picker-cliente";
import type { JugadorOpcion } from "@/components/extras-cliente";

/** Fila cruda de `players` con el club embebido (mismo patrón que Extras). */
type FilaJugador = Omit<JugadorOpcion, "equipo"> & {
  equipo: JugadorOpcion["equipo"] | JugadorOpcion["equipo"][];
};

export default async function AdminGoleadorPage() {
  const supabase = await createClient();

  const cookieStore = await cookies();
  const torneoSlug = cookieStore.get("torneo_activo_admin")?.value;

  const torneos = await getTorneos();
  const torneo = await getTorneo(torneoSlug ?? torneos[0]?.slug ?? "champions-2026");

  const [{ data: jugadoresData }, { data: torneoData }] = await Promise.all([
    supabase
      .from("players")
      .select(
        `
        id,
        nombre,
        nombre_corto,
        posicion,
        equipo:teams!equipo_id(nombre, abreviatura, logo_url, codigo_iso)
      `
      )
      .eq("tournament_id", torneo.id)
      .eq("activo", true)
      .order("nombre", { ascending: true }),
    supabase.from("tournaments").select("goleador_oficial_id").eq("id", torneo.id).maybeSingle(),
  ]);

  const jugadores: JugadorOpcion[] = ((jugadoresData ?? []) as FilaJugador[]).map((j) => ({
    ...j,
    equipo: uno(j.equipo),
  }));

  return (
    <GoleadorPickerCliente
      torneoId={torneo.id}
      jugadores={jugadores}
      goleadorActualId={torneoData?.goleador_oficial_id ?? null}
    />
  );
}
