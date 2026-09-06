"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/mundial", label: "Partidos" },
  { href: "/mundial/eliminatorias", label: "Eliminatorias" },
  { href: "/mundial/tablas", label: "Tablas" },
];

export function MundialTabs() {
  const pathname = usePathname();

  return (
    <div className="mb-1 flex border-b border-border">
      {tabs.map((tab) => {
        const activa = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className="relative flex-1 pb-3 text-center text-body-sm"
            style={{ color: activa ? "var(--accent-default)" : "var(--text-secondary)" }}
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