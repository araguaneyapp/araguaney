import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { ahoraMs } from "@/lib/tiempo";
import {
  QuinielaCliente,
  type PartidoQuiniela,
  type Jornada,
} from "@/components/quiniela-cliente";

export default async function QuinielaPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuarioId = user?.id ?? "";

  const [{ data: partidosData }, { data: jornadas }] = await Promise.all([
    supabase
      .from("matches")
      .select(
        `
        id,
        fase,
        leg,
        gameday_id,
        inicio_utc,
        deadline,
        sede,
        ref_local,
        ref_visitante,
        local:teams!equipo_local_id(id, nombre, abreviatura, logo_url, codigo_iso),
        visitante:teams!equipo_visitante_id(id, nombre, abreviatura, logo_url, codigo_iso),
        predictions(marcador_local, marcador_visitante, usuario_id)
      `
      )
      .eq("tournament_id", torneo.id)
      // Filtra el embed, no el padre. Es imprescindible: con la policy de
      // lectura de pronósticos ajenos activa, sin esto los steppers podrían
      // mostrar el marcador de otro jugador.
      .eq("predictions.usuario_id", usuarioId)
      .order("inicio_utc", { ascending: true, nullsFirst: false }),

    supabase
      .from("gamedays")
      .select("id, numero, nombre, fase, fecha, estado")
      .eq("tournament_id", torneo.id)
      .order("fecha", { ascending: true }),
  ]);

  const partidos: PartidoQuiniela[] = (partidosData ?? []).map((p) => ({
    ...p,
    local: uno(p.local),
    visitante: uno(p.visitante),
  }));

  return (
    <QuinielaCliente
      partidos={partidos}
      jornadas={(jornadas ?? []) as Jornada[]}
      usuarioId={usuarioId}
      torneoId={torneo.id}
      config={torneo.config}
      ahoraServidor={ahoraMs()}
    />
  );
}
