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

export function BottomNav() {
  const pathname = usePathname();
  const params = useParams<{ torneo?: string }>();
  const torneo = params?.torneo;

  /*
   * Solo la sección de competición está migrada a /[torneo]. Quiniela y Ranking
   * siguen apuntando a sus rutas antiguas hasta que se migren; al hacerlo, se
   * cambia su href por `/${torneo}/...`.
   */
  const items: {
    href: string;
    label: string;
    icon: LucideIcon;
    /** Coincidencia exacta de ruta en vez de por prefijo. */
    exacta?: boolean;
    /** Prefijo alternativo para marcar la pestaña activa. */
    activaSi?: string;
  }[] = [
    { href: "/", label: "Inicio", icon: House, exacta: true },
    { href: "/quiniela", label: "Quiniela", icon: PencilLine },
    {
      href: torneo ? `/${torneo}/partidos` : "/",
      label: "Torneo",
      icon: Swords,
      activaSi: torneo ? `/${torneo}` : undefined,
    },
    { href: "/ranking", label: "Ranking", icon: Trophy },
    { href: "/perfil", label: "Perfil", icon: UserRound },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-border bg-surface-card">
      <ul className="mx-auto flex max-w-md items-stretch justify-around py-3">
        {items.map(({ href, label, icon: Icon, exacta, activaSi }) => {
          const prefijo = activaSi ?? href;
          const active = exacta
            ? pathname === href
            : pathname.startsWith(prefijo);
          return (
            <li key={label} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-1 text-label-md transition-colors",
                  active
                    ? "text-accent-default"
                    : "text-text-secondary hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
