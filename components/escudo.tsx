import Image from "next/image";
import { ShieldQuestionMark } from "lucide-react";

export type EquipoEscudo = {
  nombre: string;
  abreviatura: string | null;
  logo_url: string | null;
  codigo_iso: string | null;
};

/**
 * Identidad visual de un equipo, con respaldos en cascada:
 *
 *   1. placeholder → escudo con "?" (llave todavía sin sorteo)
 *   2. logo_url    → escudo del club
 *   3. codigo_iso  → bandera de /public/flags (selecciones)
 *   4. abreviatura → círculo con las iniciales
 *   5. nada        → círculo gris (partido por definir)
 *
 * Así el mismo componente sirve a un torneo de clubes y a uno de selecciones
 * sin saber de cuál se trata.
 */
export function Escudo({
  equipo,
  size = 20,
  placeholder = false,
}: {
  equipo: EquipoEscudo | null;
  size?: number;
  /** El equipo todavía no se conoce (llave sin sortear), no que falte cargar el dato. */
  placeholder?: boolean;
}) {
  if (placeholder) {
    return (
      <span
        className="inline-flex flex-shrink-0 items-center justify-center rounded-full"
        style={{ width: size, height: size, backgroundColor: "var(--border)" }}
      >
        <ShieldQuestionMark
          style={{ width: size * 0.65, height: size * 0.65, color: "var(--icons-secondary)" }}
        />
      </span>
    );
  }

  if (equipo?.logo_url) {
    return (
      <span
        className="inline-flex flex-shrink-0 items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {/*
          <img> a propósito, no next/image: los escudos son remotos y aún no
          están cargados. Cuando se suban, si se quiere optimizarlos hay que
          declarar images.remotePatterns en next.config.ts y cambiar esto.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={equipo.logo_url}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  if (equipo?.codigo_iso) {
    return (
      <span
        className="inline-block flex-shrink-0 overflow-hidden rounded-full bg-surface-card"
        style={{ width: size, height: size }}
      >
        <Image
          src={`/flags/${equipo.codigo_iso}.svg`}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  if (equipo?.abreviatura) {
    return (
      <span
        className="inline-flex flex-shrink-0 items-center justify-center rounded-full uppercase leading-none"
        style={{
          width: size,
          height: size,
          backgroundColor: "var(--border)",
          color: "var(--text-secondary)",
          fontSize: Math.max(8, Math.round(size * 0.36)),
        }}
      >
        {equipo.abreviatura.slice(0, 3)}
      </span>
    );
  }

  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: "var(--border)" }}
    />
  );
}
