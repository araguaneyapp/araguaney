/**
 * Comparación de texto para los buscadores de la app.
 *
 * Vive aquí y no dentro de cada pantalla porque todos los buscadores deben
 * coincidir en qué consideran "encontrar algo": si uno ignora tildes y otro no,
 * el mismo texto da resultados distintos según la pantalla.
 */

/**
 * Pasa un texto a su forma comparable: sin mayúsculas y sin tildes.
 *
 * NFD separa cada letra de sus diacríticos ("é" → "e" + U+0301) y el reemplazo
 * borra solo el bloque de marcas combinantes (U+0300–U+036F). Nada fuera de ese
 * bloque se altera: los emoji, los alfabetos no latinos y cualquier carácter
 * fuera del BMP salen con sus mismos code points.
 */
export function normalizar(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * ¿Lo que escribió el usuario aparece en alguno de estos campos?
 *
 * La consulta se parte en palabras y cada una tiene que aparecer en algún
 * sitio, en cualquier orden y en cualquier posición. Así "rob lewa", "lewa rob"
 * y "lewandowski robert" encuentran todos a Robert Lewandowski, y escribir de
 * más deja de castigar al usuario por el orden en que le salieron las palabras.
 *
 * Una consulta vacía coincide con todo: la lista sin filtrar es la lista
 * completa, no la lista vacía.
 */
export function coincide(
  consulta: string,
  campos: (string | null | undefined)[]
) {
  const palabras = normalizar(consulta.trim()).split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return true;

  const texto = campos
    .filter((campo): campo is string => campo != null)
    .map(normalizar)
    .join(" ");

  return palabras.every((palabra) => texto.includes(palabra));
}
