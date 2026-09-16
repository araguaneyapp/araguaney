"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/** Animación del árbol de Araguaney para pantallas de carga, diseñada en Figma. */
export function LogoLoader({ size = 96 }: { size?: number }) {
  return (
    <DotLottieReact
      src="/animations/araguaney-spinner.lottie"
      loop
      autoplay
      style={{ width: size, height: size }}
    />
  );
}
