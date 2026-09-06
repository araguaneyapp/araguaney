"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

/**
 * Tabs de la sección de competición.
 *
 * `disponible: false` marca las pantallas que todavía no se migran al modelo
 * multi-torneo: se muestran apagadas en vez de enlazar a un 404. Al construir
 * cada una, se cambia el flag.
 */
const TABS = [
  { sufijo: "partidos", label: "Partidos", disponible: true },
  { sufijo: "eliminatorias", label: "Eliminatorias", disponible: true },
  { sufijo: "tabla", label: "Tabla", disponible: true },
];

export function CompeticionTabs() {
  const pathname = usePathname();
  const params = useParams<{ torneo: string }>();
  const torneo = params?.torneo;

  return (
    <div className="mb-1 flex border-b border-border">
      {TABS.map((tab) => {
        const href = `/${torneo}/${tab.sufijo}`;
        const activa = pathname === href;

        if (!tab.disponible) {
          return (
            <span
              key={tab.sufijo}
              className="relative flex-1 pb-3 text-center text-body-sm"
              style={{ color: "var(--text-idle)" }}
            >
              {tab.label}
            </span>
          );
        }

        return (
          <Link
            key={tab.sufijo}
            href={href}
            className="relative flex-1 pb-3 text-center text-body-sm"
            style={{
              color: activa ? "var(--accent-default)" : "var(--text-secondary)",
            }}
          >
            {tab.label}
            {activa && (
              <span
                className="absolute bottom-[-1px] left-0 right-0 h-[2px]"
                style={{ backgroundColor: "var(--accent-default)" }}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
