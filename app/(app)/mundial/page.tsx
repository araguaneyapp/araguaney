import { createClient } from "@/lib/supabase-server";
import { PartidosLista } from "@/components/partidos-lista";

export default async function MundialPartidosPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("matches")
    .select(
      `
      id,
      grupo,
      fase,
      inicio_utc,
      status,
      marcador_local,
      marcador_visitante,
      penales_local,
      penales_visitante,
      prorroga_local,
      prorroga_visitante,
      resuelto_en,
      equipo_avanza_id,
      sede,
      ref_local,
      ref_visitante,
      local:teams!equipo_local_id(nombre, codigo_iso),
      visitante:teams!equipo_visitante_id(nombre, codigo_iso)
    `
    )
    .order("inicio_utc", { ascending: true });

  const partidos = (data ?? []).map((p) => ({
    ...p,
    local: Array.isArray(p.local) ? (p.local[0] ?? null) : p.local,
    visitante: Array.isArray(p.visitante) ? (p.visitante[0] ?? null) : p.visitante,
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
        equipo_avanza_predicho,
        usuario_id,
        profiles(nombre)
      `
      )
      .in("match_id", idsFinalizados);

    pronosticos = (preds ?? []).reduce<Record<number, Pronostico[]>>((acc, pr) => {
      const perfil = Array.isArray(pr.profiles) ? pr.profiles[0] : pr.profiles;
      const item: Pronostico = {
        usuario_id: pr.usuario_id,
        nombre: perfil?.nombre ?? "Jugador",
        marcador_local: pr.marcador_local,
        marcador_visitante: pr.marcador_visitante,
        points_earned: pr.points_earned ?? 0,
        llanero_solitario: pr.llanero_solitario ?? false,
        equipo_avanza_predicho: pr.equipo_avanza_predicho,
      };
      (acc[pr.match_id] ??= []).push(item);
      return acc;
    }, {});
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <PartidosLista
      partidos={partidos}
      pronosticos={pronosticos}
      usuarioId={user?.id ?? ""}
    />
  );
}

type Pronostico = {
  usuario_id: string;
  nombre: string;
  marcador_local: number;
  marcador_visitante: number;
  points_earned: number;
  llanero_solitario: boolean;
  equipo_avanza_predicho: number | null;
};