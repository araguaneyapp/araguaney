import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import { ScreenHeader } from "@/components/screen-header";
import { Podio } from "@/components/podio";
import {
  RankingLista,
  type Jugador,
  type Movimiento,
} from "@/components/ranking-lista";

type FilaRanking = Omit<Jugador, "movimiento">;

/**
 * Orden del ranking, en cascada:
 *
 *   1. `puntos_total` desc
 *   2. `posicion`, con los nulos al final
 *   3. nombre
 *
 * Los puntos mandan sobre `posicion` a propósito. La posición se deriva de los
 * puntos, así que nunca los contradice, pero sí puede estar incompleta o vieja
 * —un jugador que se registra después del último cálculo la tiene en null— y
 * en ese estado mixto los nulos se irían al final y alguien con 0 puntos
 * quedaría por encima de alguien con 53. Con los puntos primero eso es
 * imposible; `posicion` solo desempata entre iguales, que es donde aporta las
 * reglas de desempate que los puntos por sí solos no reproducen.
 *
 * Antes de la primera jornada todos están en cero y sin posición, así que los
 * dos primeros criterios empatan y la lista sale alfabética.
 */
function comparar(a: FilaRanking, b: FilaRanking) {
  if (a.puntos_total !== b.puntos_total) return b.puntos_total - a.puntos_total;
  const posA = a.posicion ?? Number.MAX_SAFE_INTEGER;
  const posB = b.posicion ?? Number.MAX_SAFE_INTEGER;
  if (posA !== posB) return posA - posB;
  return a.nombre.localeCompare(b.nombre);
}

/**
 * `ranking` ya no trae el movimiento calculado: se deduce comparando la
 * posición actual con la del último snapshot. Sin snapshot (o sin posición
 * en alguno de los dos lados) no hay nada que comparar y queda "igual".
 */
function movimientoDe(
  actual: number | null,
  anterior: number | null | undefined
): Movimiento {
  if (actual == null || anterior == null) return "igual";
  if (actual < anterior) return "sube";
  if (actual > anterior) return "baja";
  return "igual";
}

export default async function RankingPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const cookieStore = await cookies();
  const grupoActivo = cookieStore.get("grupo_activo")?.value;

  const [
    {
      data: { user },
    },
    { data: filas },
    { data: previas },
  ] = await Promise.all([
    supabase.auth.getUser(),
    grupoActivo
      ? supabase
          .from("ranking")
          .select(
            `
        usuario_id,
        nombre,
        puntos_partidos,
        puntos_avance,
        puntos_clasificacion,
        puntos_especiales,
        puntos_total,
        posicion,
        perfil:profiles(nombre)
      `
          )
          .eq("group_id", grupoActivo)
      : Promise.resolve({ data: [] }),
    grupoActivo
      ? supabase
          .from("ranking_snapshot")
          .select("usuario_id, posicion")
          .eq("group_id", grupoActivo)
      : Promise.resolve({ data: [] }),
  ]);

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();
  if (perfil?.es_admin) redirect("/admin");

  const posicionPrevia = new Map<string, number | null>(
    (previas ?? []).map((p) => [p.usuario_id, p.posicion])
  );

  /*
   * `ranking.nombre` es una copia denormalizada y puede venir nula; el nombre
   * bueno es el del perfil. Nunca se deja en null: media pantalla (el podio,
   * el orden alfabético) llama a métodos de string sobre él.
   */
  const jugadores: Jugador[] = (filas ?? [])
    .map((fila) => ({
      usuario_id: fila.usuario_id,
      nombre: uno(fila.perfil)?.nombre ?? fila.nombre ?? "Jugador",
      puntos_partidos: fila.puntos_partidos ?? 0,
      puntos_avance: fila.puntos_avance ?? 0,
      puntos_clasificacion: fila.puntos_clasificacion ?? 0,
      puntos_especiales: fila.puntos_especiales ?? 0,
      puntos_total: fila.puntos_total ?? 0,
      posicion: fila.posicion,
      movimiento: movimientoDe(fila.posicion, posicionPrevia.get(fila.usuario_id)),
    }))
    .sort(comparar);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title="Ranking"
        right={
          <span className="text-label-md text-text-secondary">
            {jugadores.length}{" "}
            {jugadores.length === 1 ? "jugador" : "jugadores"}
          </span>
        }
      />

      {jugadores.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          Todavía no hay jugadores inscritos en esta competición.
        </p>
      ) : (
        <>
          {/*
            El podio se muestra desde ya. Mientras nadie puntúe, el top 3 es
            el de la lista alfabética; se reordena solo con el primer punto.
          */}
          <Podio top3={jugadores.slice(0, 3)} />
          <RankingLista jugadores={jugadores} usuarioId={user?.id ?? ""} />
        </>
      )}
    </main>
  );
}
