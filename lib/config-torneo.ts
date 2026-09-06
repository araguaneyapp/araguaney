/**
 * Lectura tipada de `tournaments.config` (jsonb).
 *
 * Este archivo es el motor multi-torneo: todo lo que varía entre un torneo y
 * otro (qué fases hay, cuáles son a ida y vuelta, multiplicadores, extras,
 * cortes de clasificación) sale de aquí, nunca de constantes en las pantallas.
 * Cargar un torneo nuevo debería ser solo datos.
 *
 * El parseo es defensivo: si una clave falta o viene con un tipo raro, se usa
 * el valor por defecto en vez de reventar la pantalla.
 */

export type FormatoFase = "puntos" | "ida_vuelta" | "partido_unico";

const FORMATOS: FormatoFase[] = ["puntos", "ida_vuelta", "partido_unico"];

export type ConfigTorneo = {
  /** Fases del torneo, en orden de disputa. */
  fases: string[];
  /** Cómo se juega cada fase. */
  fasesFormato: Record<string, FormatoFase>;
  /** Multiplicador de puntos por fase. */
  multiplicadores: Record<string, number>;
  extras: {
    campeon: boolean;
    subcampeon: boolean;
    goleador: boolean;
    /** Número de jornada en que cierran los extras. */
    cierreJornada: number | null;
  };
  /** Posiciones de corte en la tabla (ej. 8 clasifica directo, 24 a playoff). */
  cortesClasificacion: { directo: number | null; playoff: number | null };
  prediccionClasificacion: { tipo: string | null; cierreJornada: number | null };
  usaGrupos: boolean;
  usaFaseLiga: boolean;
  numEquipos: number | null;
  /** Regla de desempate por gol de visitante. */
  golVisitante: boolean;
};

function objeto(valor: unknown): Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {};
}

function texto(valor: unknown): string | null {
  return typeof valor === "string" && valor.length > 0 ? valor : null;
}

function numero(valor: unknown): number | null {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null;
}

function booleano(valor: unknown, porDefecto: boolean): boolean {
  return typeof valor === "boolean" ? valor : porDefecto;
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((v): v is string => typeof v === "string");
}

function mapaDeNumeros(valor: unknown): Record<string, number> {
  const salida: Record<string, number> = {};
  for (const [clave, v] of Object.entries(objeto(valor))) {
    const n = numero(v);
    if (n !== null) salida[clave] = n;
  }
  return salida;
}

function mapaDeFormatos(valor: unknown): Record<string, FormatoFase> {
  const salida: Record<string, FormatoFase> = {};
  for (const [clave, v] of Object.entries(objeto(valor))) {
    if (typeof v === "string" && (FORMATOS as string[]).includes(v)) {
      salida[clave] = v as FormatoFase;
    }
  }
  return salida;
}

export function leerConfig(raw: unknown): ConfigTorneo {
  const c = objeto(raw);
  const extras = objeto(c.extras);
  const cortes = objeto(c.cortes_clasificacion);
  const prediccion = objeto(c.prediccion_clasificacion);
  const desempate = objeto(c.desempate_eliminatoria);

  return {
    fases: listaDeTextos(c.fases),
    fasesFormato: mapaDeFormatos(c.fases_formato),
    multiplicadores: mapaDeNumeros(c.multiplicadores),
    extras: {
      campeon: booleano(extras.campeon, false),
      subcampeon: booleano(extras.subcampeon, false),
      goleador: booleano(extras.goleador, false),
      cierreJornada: numero(extras.cierre_jornada),
    },
    cortesClasificacion: {
      directo: numero(cortes.directo),
      playoff: numero(cortes.playoff),
    },
    prediccionClasificacion: {
      tipo: texto(prediccion.tipo),
      cierreJornada: numero(prediccion.cierre_jornada),
    },
    usaGrupos: booleano(c.usa_grupos, false),
    usaFaseLiga: booleano(c.usa_fase_liga, false),
    numEquipos: numero(c.num_equipos),
    // `eliminatoria_ida_vuelta` del jsonb no se mapea a propósito: es
    // redundante con `fases_formato`, que lo dice fase por fase.
    golVisitante: booleano(desempate.gol_visitante, false),
  };
}

export function formatoDeFase(
  config: ConfigTorneo,
  fase: string
): FormatoFase | null {
  return config.fasesFormato[fase] ?? null;
}

export function esIdaVuelta(config: ConfigTorneo, fase: string): boolean {
  return formatoDeFase(config, fase) === "ida_vuelta";
}

/**
 * Ordena un conjunto de fases según el orden declarado en el torneo.
 * Las que no estén declaradas quedan al final, en el orden recibido.
 */
export function ordenarFases(
  config: ConfigTorneo,
  fases: Iterable<string>
): string[] {
  const orden = new Map(config.fases.map((fase, i) => [fase, i]));
  return Array.from(new Set(fases)).sort(
    (a, b) =>
      (orden.get(a) ?? Number.MAX_SAFE_INTEGER) -
      (orden.get(b) ?? Number.MAX_SAFE_INTEGER)
  );
}
