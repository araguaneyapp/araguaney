import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import {
  ResultadosCliente,
  type PartidoAdmin,
} from "@/components/resultados-cliente";

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const { desde } = await searchParams;
  const volverA = desde ? `/${desde}/perfil` : "/";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!perfil?.es_admin) {
    redirect(volverA);
  }

  // Mientras solo exista Champions, no hace falta un selector de torneo.
  const torneo = await getTorneo(desde ?? "champions-2026");

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

  return (
    <ResultadosCliente
      partidos={partidos}
      config={torneo.config}
      volverA={volverA}
    />
  );
}
