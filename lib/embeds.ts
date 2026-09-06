/**
 * Los embeds "a uno" de PostgREST llegan como objeto o como array de un
 * elemento según el caso. Esto los normaliza.
 */
export function uno<T>(valor: T | T[] | null): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}
