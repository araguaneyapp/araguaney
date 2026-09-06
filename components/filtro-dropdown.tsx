"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

type Opcion = { valor: string; label: string };

export function FiltroDropdown({
  etiqueta,
  opciones,
  valorActivo,
  onSelect,
}: {
  etiqueta: string;
  opciones: Opcion[];
  valorActivo: string | null;
  onSelect: (valor: string) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    if (abierto) document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [abierto]);

  const activo = valorActivo !== null;
  const textoChip = activo
    ? opciones.find((o) => o.valor === valorActivo)?.label ?? etiqueta
    : etiqueta;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="flex items-center gap-1 rounded-full px-4 py-2 text-label-md"
        style={{
          backgroundColor: activo ? "var(--accent-default)" : "var(--surface-card)",
          color: activo ? "var(--text-on-accent)" : "var(--text-tertiary)",
        }}
      >
        {textoChip}
        <ChevronDown className="h-[14px] w-[14px]" />
      </button>

      {abierto && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-10 max-h-[260px] w-[160px] overflow-y-auto rounded-xl border border-border bg-surface-card py-1 shadow-lg">
          {opciones.map((o) => (
            <button
              key={o.valor}
              onClick={() => {
                onSelect(o.valor);
                setAbierto(false);
              }}
              className="block w-full px-3 py-2 text-left text-body-sm"
              style={{
                color: o.valor === valorActivo ? "var(--accent-default)" : "var(--text-primary)",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}