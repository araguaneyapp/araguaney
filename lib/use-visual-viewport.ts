"use client";

import { useEffect, useState } from "react";

/**
 * Alto y desplazamiento del viewport visual real del navegador móvil.
 *
 * `visualViewport` sí se achica cuando aparece el teclado nativo, a
 * diferencia del viewport de layout (del que dependen `vh`/`dvh` y los
 * elementos `fixed`), que en varios navegadores/Android queda detrás del
 * teclado. Devuelve `null` hasta montar en el cliente o si el navegador no
 * soporta la API.
 */
export function useVisualViewport() {
  const [medida, setMedida] = useState<{
    height: number;
    offsetTop: number;
    /** El teclado nativo ocupa una parte visible del alto de la ventana. */
    tecladoAbierto: boolean;
  } | null>(null);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const actualizar = () =>
      setMedida({
        height: viewport.height,
        offsetTop: viewport.offsetTop,
        // Margen de 150px para no confundir la barra de direcciones con teclado.
        tecladoAbierto: window.innerHeight - viewport.height > 150,
      });

    actualizar();
    viewport.addEventListener("resize", actualizar);
    viewport.addEventListener("scroll", actualizar);
    return () => {
      viewport.removeEventListener("resize", actualizar);
      viewport.removeEventListener("scroll", actualizar);
    };
  }, []);

  return medida;
}
