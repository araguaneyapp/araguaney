/**
 * Nombres temporales de las llaves de una fase eliminatoria que todavía no
 * tiene sorteo. Es contenido fijo del formato de esta Champions (16 equipos
 * a playoff, 8 directos a octavos): un torneo con otro cuadro necesitaría
 * ajustar esto, no sale del config. Lo usan Eliminatorias y Quiniela para
 * pintar el cuadro vacío en vez de un mensaje.
 */

export type LlavePlaceholder = { local: string; visitante: string };

export function llavesPlaceholder(fase: string, esFinal: boolean): LlavePlaceholder[] {
  if (esFinal) {
    return [{ local: "Ganadores SF-1", visitante: "Ganadores SF-2" }];
  }
  if (fase === "preliminar") {
    return Array.from({ length: 8 }, () => ({
      local: "Clasificados Play-Off",
      visitante: "Clasificados Play-Off",
    }));
  }
  if (fase === "octavos") {
    return Array.from({ length: 8 }, () => ({
      local: "Ganador del Play-Off",
      visitante: "Clasificado Top8",
    }));
  }
  if (fase === "cuartos") {
    return Array.from({ length: 4 }, (_, i) => ({
      local: `Ganadores OF-${i * 2 + 1}`,
      visitante: `Ganadores OF-${i * 2 + 2}`,
    }));
  }
  if (fase === "semifinal") {
    return Array.from({ length: 2 }, (_, i) => ({
      local: `Ganadores CF-${i * 2 + 1}`,
      visitante: `Ganadores CF-${i * 2 + 2}`,
    }));
  }
  return [];
}
