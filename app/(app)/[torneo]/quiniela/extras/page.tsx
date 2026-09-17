import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { ahoraMs } from "@/lib/tiempo";
import { plazasClasificacion } from "@/lib/config-torneo";
import {
  ExtrasCliente,
  type EquipoOpcion,
  type JugadorOpcion,
  type ExtrasGuardados,
  type TopOpcion,
} from "@/components/extras-cliente";

/** Fila cruda de `players` con el club embebido. */
type FilaJugador = {
  id: number;
  nombre: string;
  nombre_corto: string | null;
  posicion: string | null;
  equipo: JugadorOpcion["equipo"] | JugadorOpcion["equipo"][];
};

export default async function ExtrasPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const { config } = torneo;

  const secciones = {
    campeon: config.extras.campeon,
    subcampeon: config.extras.subcampeon,
    goleador: config.extras.goleador,
  };
  const plazas = plazasClasificacion(config);
  const hayTop = Boolean(config.prediccionClasificacion.tipo && plazas);

  // Un torneo que no declara ningún extra ni Top N no tiene esta pantalla.
  if (!hayTop && !secciones.campeon && !secciones.subcampeon && !secciones.goleador) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuarioId = user?.id ?? "";

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", usuarioId)
    .maybeSingle();
  if (perfil?.es_admin) redirect("/admin");

  const cierreJornada = config.extras.cierreJornada;
  const necesitaEquipos = secciones.campeon || secciones.subcampeon || hayTop;

  const [
    { data: equiposData },
    { data: jugadoresData },
    { data: extrasData },
    { data: jornadas },
    { data: topData },
  ] = await Promise.all([
    necesitaEquipos
      ? supabase
          .from("teams")
          .select("id, nombre, abreviatura, logo_url, codigo_iso")
          .eq("tournament_id", torneo.id)
          .order("nombre", { ascending: true })
      : Promise.resolve({ data: [] }),

    secciones.goleador
      ? supabase
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
          /*
           * `activo` puede venir en NULL mientras la plantilla se siembra a
           * mano; solo se descarta a quien esté marcado explícitamente como
           * inactivo. Cuando la API llene la tabla y el default esté
           * garantizado, esto puede endurecerse a .eq("activo", true).
           */
          .not("activo", "is", false)
          .order("nombre", { ascending: true })
      : Promise.resolve({ data: [], error: null }),

    supabase
      .from("special_predictions")
      .select("campeon_id, subcampeon_id, goleador_id, goleador_nombre")
      .eq("tournament_id", torneo.id)
      .eq("usuario_id", usuarioId)
      .maybeSingle(),

    cierreJornada == null
      ? Promise.resolve({ data: [] })
      : supabase
          .from("gamedays")
          .select("id")
          .eq("tournament_id", torneo.id)
          .eq("numero", cierreJornada),

    hayTop
      ? supabase
          .from("standings_predictions")
          .select("equipo_id, posicion")
          .eq("tournament_id", torneo.id)
          .eq("usuario_id", usuarioId)
      : Promise.resolve({ data: [] }),
  ]);

  /*
   * El cierre no se hardcodea: es el inicio del primer partido de la jornada
   * que diga el config. Si el calendario se mueve, el cierre se mueve con él.
   */
  let cierre: string | null = null;
  const jornadaCierre = (jornadas ?? [])[0];

  if (jornadaCierre) {
    const { data: primerPartido } = await supabase
      .from("matches")
      .select("inicio_utc")
      .eq("tournament_id", torneo.id)
      .eq("gameday_id", jornadaCierre.id)
      .not("inicio_utc", "is", null)
      .order("inicio_utc", { ascending: true })
      .limit(1)
      .maybeSingle();

    cierre = primerPartido?.inicio_utc ?? null;
  }

  const jugadores: JugadorOpcion[] = ((jugadoresData ?? []) as FilaJugador[]).map(
    (j) => ({ ...j, equipo: uno(j.equipo) })
  );

  const equipos = (equiposData ?? []) as EquipoOpcion[];

  let top: TopOpcion | null = null;
  if (hayTop && plazas != null) {
    const equipoPorId = new Map(equipos.map((e) => [e.id, e]));
    const seleccionados: (EquipoOpcion | null)[] = Array(plazas).fill(null);
    for (const p of (topData ?? []) as { equipo_id: number; posicion: number }[]) {
      if (p.posicion >= 1 && p.posicion <= plazas) {
        seleccionados[p.posicion - 1] = equipoPorId.get(p.equipo_id) ?? null;
      }
    }
    top = { plazas, seleccionados };
  }

  return (
    <ExtrasCliente
      equipos={equipos}
      jugadores={jugadores}
      extras={(extrasData ?? null) as ExtrasGuardados | null}
      secciones={secciones}
      top={top}
      usuarioId={usuarioId}
      torneoId={torneo.id}
      torneoSlug={torneo.slug}
      cierre={cierre}
      ahoraServidor={ahoraMs()}
    />
  );
}
