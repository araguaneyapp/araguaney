"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  title: string;
  /** Ruta de retorno. Si se pasa, muestra el botón de volver. */
  backHref?: string;
  /** Contenido a la derecha del título (ej. contador). */
  right?: React.ReactNode;
  /** Barra inferior: filtros o tabs. */
  bar?: React.ReactNode;
};

export function ScreenHeader({ title, backHref, right, bar }: Props) {
  return (
    <div className="sticky top-0 z-30 -mx-5 bg-background px-5 pb-6 pt-8">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {backHref && (
              <Link href={backHref} className="flex items-center">
                <ChevronLeft
                  className="h-6 w-6"
                  style={{ color: "var(--icons-secondary)" }}
                />
              </Link>
            )}
            <h1 className="text-display-sm leading-none">{title}</h1>
          </div>
          {right}
        </div>
        {bar}
      </div>
    </div>
  );
}