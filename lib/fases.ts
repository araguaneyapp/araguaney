/**
 * Etiquetas legibles para los valores del enum `fase_tipo`.
 *
 * Aquí solo viven los nombres visibles. El orden y el subconjunto de fases de
 * cada torneo salen de `tournaments.config.fases` (ver lib/config-torneo.ts),
 * nunca de este archivo.
 */

const ETIQUETAS: Record<string, string> = {
  liga: "Fase de liga",
  preliminar: "Playoff",
  grupos: "Grupos",
  dieciseisavos: "Dieciseisavos",
  octavos: "Octavos",
  cuartos: "Cuartos",
  semifinal: "Semifinales",
  final: "Final",
};

export function etiquetaFase(fase: string): string {
  const conocida = ETIQUETAS[fase];
  if (conocida) return conocida;
  const limpia = fase.replace(/_/g, " ");
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

/** Etiqueta del partido dentro de una llave a ida y vuelta. */
export function etiquetaLeg(leg: number | null): string | null {
  if (leg === 1) return "Ida";
  if (leg === 2) return "Vuelta";
  return null;
}
