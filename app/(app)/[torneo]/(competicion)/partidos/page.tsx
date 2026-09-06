import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import {
  PartidosLista,
  type Partido,
  type Pronostico,
} from "@/components/partidos-lista";

export default async function PartidosPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    { data },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("matches")
      .select(
        `
      id,
      fase,
      leg,
      inicio_utc,
      status,
      marcador_local,
      marcador_visitante,
      penales_local,
      penales_visitante,
      prorroga_local,
      prorroga_visitante,
      resuelto_en,
      sede,
      ref_local,
      ref_visitante,
      gameday:gamedays(nombre),
      local:teams!equipo_local_id(id, nombre, abreviatura, logo_url, codigo_iso),
      visitante:teams!equipo_visitante_id(id, nombre, abreviatura, logo_url, codigo_iso)
    `
      )
      .eq("tournament_id", torneo.id)
      .order("inicio_utc", { ascending: true, nullsFirst: false }),
  ]);

  const partidos: Partido[] = (data ?? []).map((p) => ({
    ...p,
    gameday: uno(p.gameday),
    local: uno(p.local),
    visitante: uno(p.visitante),
  }));

  const idsFinalizados = partidos
    .filter((p) => p.status === "finished" || p.status === "published")
    .map((p) => p.id);

  let pronosticos: Record<number, Pronostico[]> = {};

  if (idsFinalizados.length > 0) {
    const { data: preds } = await supabase
      .from("predictions")
      .select(
        `
        match_id,
        marcador_local,
        marcador_visitante,
        points_earned,
        llanero_solitario,
        usuario_id,
        profiles(nombre)
      `
      )
      .eq("tournament_id", torneo.id)
      .in("match_id", idsFinalizados);

    pronosticos = (preds ?? []).reduce<Record<number, Pronostico[]>>(
      (acc, pr) => {
        const perfil = uno(pr.profiles);
        (acc[pr.match_id] ??= []).push({
          usuario_id: pr.usuario_id,
          nombre: perfil?.nombre ?? "Jugador",
          marcador_local: pr.marcador_local,
          marcador_visitante: pr.marcador_visitante,
          points_earned: pr.points_earned ?? 0,
          llanero_solitario: pr.llanero_solitario ?? false,
        });
        return acc;
      },
      {}
    );
  }

  return (
    <PartidosLista
      partidos={partidos}
      pronosticos={pronosticos}
      usuarioId={user?.id ?? ""}
      config={torneo.config}
    />
  );
}
