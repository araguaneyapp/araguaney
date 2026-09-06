"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, PencilLine, Earth, Trophy, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/quiniela", label: "Quiniela", icon: PencilLine },
  { href: "/mundial", label: "Mundial", icon: Earth },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: UserRound },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-20 border-t border-border bg-surface-card">
      <ul className="mx-auto flex max-w-md items-stretch justify-around py-3">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
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