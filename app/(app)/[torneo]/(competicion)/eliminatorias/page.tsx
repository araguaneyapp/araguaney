import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { formatoDeFase } from "@/lib/config-torneo";
import {
  EliminatoriasLista,
  type AvancePronosticado,
  type Cruce,
  type Llave,
  type PartidoLlave,
} from "@/components/eliminatorias-lista";
import type { Pronostico } from "@/components/pronosticos-detalle";

const EQUIPO = "id, nombre, abreviatura, logo_url, codigo_iso, estadio, ciudad";

function estaJugado(p: PartidoLlave) {
  return p.status === "finished" || p.status === "published";
}

/** Ida antes que vuelta; si no hay leg, por fecha. */
function ordenLeg(a: PartidoLlave, b: PartidoLlave) {
  if (a.leg != null && b.leg != null && a.leg !== b.leg) return a.leg - b.leg;
  return (a.inicio_utc ?? "").localeCompare(b.inicio_utc ?? "");
}

export default async function EliminatoriasPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  // Qué es "eliminatoria" lo dice el config, no una lista de rondas fija.
  const fases = torneo.config.fases.filter((fase) => {
    const formato = formatoDeFase(torneo.config, fase);
    return formato === "ida_vuelta" || formato === "partido_unico";
  });

  const [
    {
      data: { user },
    },
    { data: llavesData },
    { data: partidosData },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("ties")
      .select(
        `
        id,
        fase,
        agregado_a,
        agregado_b,
        equipo_avanza_id,
        resuelto_en,
        ref_a,
        ref_b,
        equipo_a:teams!equipo_a_id(${EQUIPO}),
        equipo_b:teams!equipo_b_id(${EQUIPO})
      `
      )
      .eq("tournament_id", torneo.id),
    fases.length === 0
      ? Promise.resolve({ data: [] })
      : supabase
          .from("matches")
          .select(
            `
        id,
        tie_id,
        fase,
        leg,
        inicio_utc,
        status,
        sede,
        marcador_local,
        marcador_visitante,
        penales_local,
        penales_visitante,
        prorroga_local,
        prorroga_visitante,
        resuelto_en,
        equipo_local_id,
        equipo_visitante_id,
        ref_local,
        ref_visitante,
        local:teams!equipo_local_id(${EQUIPO}),
        visitante:teams!equipo_visitante_id(${EQUIPO})
      `
          )
          .eq("tournament_id", torneo.id)
          .in("fase", fases)
          .order("inicio_utc", { ascending: true, nullsFirst: false }),
  ]);

  const usuarioId = user?.id ?? "";

  const llaves: Llave[] = (llavesData ?? []).map((ll) => ({
    ...ll,
    equipo_a: uno(ll.equipo_a),
    equipo_b: uno(ll.equipo_b),
  }));

  const partidos: PartidoLlave[] = (partidosData ?? []).map((p) => ({
    ...p,
    local: uno(p.local),
    visitante: uno(p.visitante),
  }));

  /*
   * Los partidos se cuelgan de su llave. Los que no tienen `tie_id` no se
   * pierden: se convierten en un cruce de un solo partido, que es el seguro
   * para una final que viva solo en `matches`.
   */
  const porLlave = new Map<number, PartidoLlave[]>();
  const sueltos: PartidoLlave[] = [];
  for (const p of partidos) {
    if (p.tie_id == null) {
      sueltos.push(p);
      continue;
    }
    (porLlave.get(p.tie_id) ?? porLlave.set(p.tie_id, []).get(p.tie_id)!).push(p);
  }

  const cruces: Cruce[] = [
    ...llaves.map((llave) => ({
      clave: `llave-${llave.id}`,
      fase: llave.fase,
      llave,
      partidos: (porLlave.get(llave.id) ?? []).sort(ordenLeg),
    })),
    ...sueltos.map((p) => ({
      clave: `partido-${p.id}`,
      fase: p.fase,
      llave: null,
      partidos: [p],
    })),
  ];

  const idsJugados = partidos.filter(estaJugado).map((p) => p.id);
  const idsLlaves = llaves.map((ll) => ll.id);

  const [pronosticos, avances] = await Promise.all([
    cargarPronosticos(supabase, torneo.id, idsJugados),
    cargarAvances(supabase, torneo.id, idsLlaves),
  ]);

  return (
    <EliminatoriasLista
      cruces={cruces}
      pronosticos={pronosticos}
      avances={avances}
      usuarioId={usuarioId}
      config={torneo.config}
    />
  );
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function cargarPronosticos(
  supabase: Supabase,
  torneoId: number,
  idsPartidos: number[]
): Promise<Record<number, Pronostico[]>> {
  if (idsPartidos.length === 0) return {};

  const { data } = await supabase
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
    .eq("tournament_id", torneoId)
    .in("match_id", idsPartidos);

  return (data ?? []).reduce<Record<number, Pronostico[]>>((acc, pr) => {
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
  }, {});
}

/**
 * Pronósticos de quién pasa la llave. Hoy la Quiniela todavía no los captura,
 * así que lo normal es que esto venga vacío y el detalle no muestre el bloque.
 */
async function cargarAvances(
  supabase: Supabase,
  torneoId: number,
  idsLlaves: number[]
): Promise<Record<number, AvancePronosticado[]>> {
  if (idsLlaves.length === 0) return {};

  const { data } = await supabase
    .from("tie_predictions")
    .select(
      `
      tie_id,
      usuario_id,
      equipo_avanza_id,
      points_earned,
      profiles(nombre),
      equipo:teams!equipo_avanza_id(nombre)
    `
    )
    .eq("tournament_id", torneoId)
    .in("tie_id", idsLlaves);

  return (data ?? []).reduce<Record<number, AvancePronosticado[]>>((acc, pr) => {
    const perfil = uno(pr.profiles);
    const equipo = uno(pr.equipo);
    (acc[pr.tie_id] ??= []).push({
      usuario_id: pr.usuario_id,
      nombre: perfil?.nombre ?? "Jugador",
      equipo_avanza_id: pr.equipo_avanza_id,
      equipo_avanza_nombre: equipo?.nombre ?? null,
      points_earned: pr.points_earned ?? 0,
    });
    return acc;
  }, {});
}
