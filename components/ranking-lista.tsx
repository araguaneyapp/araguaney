"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Minus } from "lucide-react";

export type Movimiento = "sube" | "baja" | "igual";

export type Jugador = {
  usuario_id: string;
  nombre: string;
  puntos_partidos: number;
  puntos_avance: number;
  puntos_clasificacion: number;
  puntos_especiales: number;
  puntos_total: number;
  /** Null mientras la clasificación no se haya calculado. */
  posicion: number | null;
  /** Ya resuelto en el servidor contra ranking_snapshot. */
  movimiento: Movimiento;
};

function FlechaMovimiento({ movimiento }: { movimiento: Movimiento }) {
  if (movimiento === "sube")
    return <ChevronUp className="h-[15px] w-[15px]" style={{ color: "var(--feedback-success)" }} />;
  if (movimiento === "baja")
    return <ChevronDown className="h-[15px] w-[15px]" style={{ color: "var(--feedback-danger)" }} />;
  return <Minus className="h-[15px] w-[15px]" style={{ color: "var(--icons-secondary)" }} />;
}

function Desglose({ jugador, esUsuario }: { jugador: Jugador; esUsuario: boolean }) {
  const color = esUsuario ? "var(--accent-default)" : "var(--text-secondary)";
  /*
   * Las cuatro categorías se muestran siempre, aunque estén en cero: un 0 es
   * información ("no has puntuado ahí"), una columna ausente no lo es.
   */
  const items = [
    { valor: jugador.puntos_partidos, label: "Partidos" },
    { valor: jugador.puntos_avance, label: "Avance" },
    { valor: jugador.puntos_clasificacion, label: "Clasific." },
    { valor: jugador.puntos_especiales, label: "Extras" },
  ];
  return (
    <div
      className="mt-3 flex items-center justify-around border-t pt-3"
      style={{ borderColor: esUsuario ? "var(--effect-gold-box-border)" : "var(--border)" }}
    >
      {items.map((item, i) => (
        <div key={i} className="flex flex-1 flex-col items-center">
          <span className="text-display-sm">{item.valor}</span>
          <span className="text-label-md" style={{ color }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function Fila({
  jugador,
  esUsuario,
  abierta,
  onToggle,
}: {
  jugador: Jugador;
  esUsuario: boolean;
  abierta: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`mb-2 rounded-xl p-3 ${esUsuario ? "caja-dorada" : "bg-surface-card"}`}
    >
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-3 text-left"
      >
        <span
          className="w-[18px] flex-shrink-0 text-heading-md"
          style={{
            color:
              jugador.posicion == null
                ? "var(--text-idle)"
                : esUsuario
                ? "var(--accent-default)"
                : "var(--text-tertiary)",
          }}
        >
          {jugador.posicion ?? "–"}
        </span>
        <span className="flex w-[18px] flex-shrink-0 justify-center">
          <FlechaMovimiento movimiento={jugador.movimiento} />
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-body-md">
          <span className="truncate" title={jugador.nombre}>
            {jugador.nombre}
          </span>
          {esUsuario && (
            <span
              className="flex-shrink-0 rounded-lg px-2 py-px text-label-xs"
              style={{ backgroundColor: "var(--accent-default)", color: "var(--accent-dark)" }}
            >
              Tú
            </span>
          )}
        </span>
        <span className="flex-shrink-0 text-heading-md">{jugador.puntos_total}</span>
        {abierta ? (
          <ChevronUp
            className="h-4 w-4 flex-shrink-0"
            style={{ color: "var(--icons-secondary)" }}
          />
        ) : (
          <ChevronDown
            className="h-4 w-4 flex-shrink-0"
            style={{ color: "var(--icons-secondary)" }}
          />
        )}
      </button>
      {abierta && <Desglose jugador={jugador} esUsuario={esUsuario} />}
    </div>
  );
}

export function RankingLista({
  jugadores,
  usuarioId,
}: {
  jugadores: Jugador[];
  usuarioId: string;
}) {
  const [abierta, setAbierta] = useState<string | null>(usuarioId);

  return (
    <div>
      {jugadores.map((j) => {
        const esUsuario = j.usuario_id === usuarioId;
        return (
          <Fila
            key={j.usuario_id}
            jugador={j}
            esUsuario={esUsuario}
            abierta={abierta === j.usuario_id}
            onToggle={() =>
              setAbierta(abierta === j.usuario_id ? null : j.usuario_id)
            }
          />
        );
      })}
    </div>
  );
}