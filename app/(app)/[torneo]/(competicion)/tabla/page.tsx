import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { TablaLiga, type FilaTabla } from "@/components/tabla-liga";

/**
 * Orden de la tabla, en cascada:
 *
 *   1. `posicion`, con los nulos al final
 *   2. pts → dg → gf
 *   3. nombre
 *
 * Un solo comparador cubre los dos estados. Antes de la primera jornada nadie
 * tiene posición y todas las cifras están en cero, así que los dos primeros
 * criterios empatan y el resultado es alfabético. En cuanto la clasificación
 * se calcula, manda `posicion`. Y si alguna vez llegaran filas con partidos
 * jugados pero sin posición, ordenan por puntos en vez de por nombre.
 */
function comparar(a: FilaTabla, b: FilaTabla) {
  const posA = a.posicion ?? Number.MAX_SAFE_INTEGER;
  const posB = b.posicion ?? Number.MAX_SAFE_INTEGER;
  if (posA !== posB) return posA - posB;
  if (a.pts !== b.pts) return b.pts - a.pts;
  if (a.dg !== b.dg) return b.dg - a.dg;
  if (a.gf !== b.gf) return b.gf - a.gf;
  return (a.equipo?.nombre ?? "").localeCompare(b.equipo?.nombre ?? "");
}

export default async function TablaPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const { data } = await supabase
    .from("standings")
    .select(
      `
      equipo_id,
      posicion,
      pj,
      g,
      e,
      p,
      gf,
      gc,
      dg,
      pts,
      equipo:teams!equipo_id(nombre, abreviatura, logo_url, codigo_iso)
    `
    )
    .eq("tournament_id", torneo.id);

  const filas: FilaTabla[] = (data ?? [])
    .map((fila) => ({ ...fila, equipo: uno(fila.equipo) }))
    .sort(comparar);

  return <TablaLiga filas={filas} config={torneo.config} />;
}
