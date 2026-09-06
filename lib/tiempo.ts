/**
 * Hora actual en milisegundos.
 *
 * Vive aquí y no como `Date.now()` suelto porque leer el reloj es impuro: las
 * reglas de React prohíben llamarlo directamente durante el render. En un
 * Server Component, que se ejecuta una vez por request, el valor sí es estable
 * y es justo lo que necesitamos para que SSR e hidratación pinten lo mismo.
 */
export function ahoraMs() {
  return Date.now();
}
