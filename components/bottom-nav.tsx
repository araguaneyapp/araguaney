"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  House,
  PencilLine,
  Swords,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Rutas que enciende la pestaña "Torneo". */
const RUTAS_COMPETICION = ["partidos", "eliminatorias", "tabla"];

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams<{ torneo?: string }>();
  const base = `/${params?.torneo ?? ""}`;

  const empieza = (sufijo: string) => pathname.startsWith(`${base}/${sufijo}`);

  /*
   * `disponible: false` marca las secciones que aún no se migran al modelo
   * multi-torneo: se pintan apagadas en vez de enlazar a un 404. Al construir
   * cada pantalla, se enciende la suya.
   */
  const items: {
    label: string;
    icon: LucideIcon;
    href: string;
    disponible: boolean;
    activa: boolean;
  }[] = [
    {
      label: "Inicio",
      icon: House,
      href: base,
      disponible: false,
      // Exacta: por prefijo se marcaría activa en todas las rutas del torneo.
      activa: pathname === base,
    },
    {
      label: "Quiniela",
      icon: PencilLine,
      href: `${base}/quiniela`,
      disponible: true,
      activa: empieza("quiniela"),
    },
    {
      label: "Torneo",
      icon: Swords,
      href: `${base}/partidos`,
      disponible: true,
      activa: RUTAS_COMPETICION.some(empieza),
    },
    {
      label: "Ranking",
      icon: Trophy,
      href: `${base}/ranking`,
      disponible: true,
      activa: empieza("ranking"),
    },
    {
      label: "Perfil",
      icon: UserRound,
      href: `${base}/perfil`,
      disponible: true,
      // Reglas se abre desde Perfil, así que mantiene la pestaña encendida.
      activa: empieza("perfil") || empieza("reglas"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-border bg-surface-card">
      <ul className="mx-auto flex max-w-md items-stretch justify-around py-3">
        {items.map(({ label, icon: Icon, href, disponible, activa }) => {
          const contenido = (
            <>
              <Icon className="h-5 w-5" strokeWidth={activa ? 2.5 : 2} />
              <span>{label}</span>
            </>
          );

          return (
            <li key={label} className="flex-1">
              {disponible ? (
                <Link
                  href={href}
                  className={cn(
                    "flex h-14 flex-col items-center justify-center gap-1 text-label-md transition-colors",
                    activa
                      ? "text-accent-default"
                      : "text-text-secondary hover:text-foreground"
                  )}
                >
                  {contenido}
                </Link>
              ) : (
                <span
                  className="flex h-14 flex-col items-center justify-center gap-1 text-label-md"
                  style={{ color: "var(--text-idle)" }}
                >
                  {contenido}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
