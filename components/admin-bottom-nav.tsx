"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Swords, ClipboardList, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * BottomNav propio del SuperAdmin: 3 pestañas, sin lógica de grupo. Se usa
 * tanto en `/admin/**` (con el torneo activo leído de la cookie
 * torneo_activo_admin) como en `/[torneo]/**` cuando `es_admin` (con el
 * slug de la URL, que siempre está definido ahí).
 */
export function AdminBottomNav({ torneoSlug }: { torneoSlug?: string }) {
  const pathname = usePathname();

  const items: { label: string; icon: LucideIcon; href: string; activa: boolean }[] = [
    {
      label: "Inicio",
      icon: House,
      href: "/admin",
      activa: pathname === "/admin",
    },
    {
      label: "Torneo",
      icon: Swords,
      href: torneoSlug ? `/${torneoSlug}/partidos` : "/torneos",
      activa: Boolean(torneoSlug) && pathname.startsWith(`/${torneoSlug}/`),
    },
    {
      label: "Administrador",
      icon: ClipboardList,
      href: "/admin/resultados",
      activa: pathname === "/admin/resultados",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-border bg-surface-card">
      <ul className="mx-auto flex max-w-md items-stretch justify-around py-3">
        {items.map(({ label, icon: Icon, href, activa }) => (
          <li key={label} className="flex-1">
            <Link
              href={href}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-1 text-label-md transition-colors",
                activa ? "text-accent-default" : "text-text-secondary hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={activa ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
