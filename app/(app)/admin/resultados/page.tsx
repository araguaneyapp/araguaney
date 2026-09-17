import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getTorneo, getTorneos } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import {
  ResultadosCliente,
  type PartidoAdmin,
} from "@/components/resultados-cliente";

/**
 * es_admin ya lo valida app/(app)/admin/layout.tsx. El torneo sale de
 * la cookie torneo_activo_admin (fijada desde /torneos); si todavía no
 * hay ninguna, cae al primer torneo disponible como antes.
 */
export default async function AdminResultadosPage() {
  const supabase = await createClient();

  const cookieStore = await cookies();
  const torneoSlug = cookieStore.get("torneo_activo_admin")?.value;

  const torneos = await getTorneos();
  const torneo = await getTorneo(torneoSlug ?? torneos[0]?.slug ?? "champions-2026");

  const { data } = await supabase
    .from("matches")
    .select(
      `
      id,
      fase,
      leg,
      tie_id,
      gameday_id,
      inicio_utc,
      status,
      marcador_local,
      marcador_visitante,
      prorroga_local,
      prorroga_visitante,
      penales_local,
      penales_visitante,
      resuelto_en,
      editado_manual,
      ref_local,
      ref_visitante,
      local:teams!equipo_local_id(id, nombre, abreviatura, logo_url, codigo_iso),
      visitante:teams!equipo_visitante_id(id, nombre, abreviatura, logo_url, codigo_iso)
    `
    )
    .eq("tournament_id", torneo.id)
    .order("inicio_utc", { ascending: true, nullsFirst: false });

  const partidos: PartidoAdmin[] = (data ?? []).map((p) => ({
    ...p,
    local: uno(p.local),
    visitante: uno(p.visitante),
  }));

  return <ResultadosCliente partidos={partidos} config={torneo.config} volverA="/admin" />;
}
