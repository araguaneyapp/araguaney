import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Puerta a una pantalla de predicción de todo el torneo (Top N, extras).
 * La usan Quiniela e Inicio; cada una decide si mostrarla según el config.
 */
export function AccesoPrediccion({
  href,
  icono,
  titulo,
  detalle,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-surface-card p-4"
    >
      <span
        className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--accent-subtle)" }}
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-md leading-tight">{titulo}</span>
        <span className="mt-px block text-label-md text-text-secondary">
          {detalle}
        </span>
      </span>
      <ChevronRight
        className="h-[18px] w-[18px] flex-shrink-0"
        style={{ color: "var(--icons-secondary)" }}
      />
    </Link>
  );
}
