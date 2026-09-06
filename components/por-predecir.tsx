"use client";

import Link from "next/link";
import { MatchCard } from "@/components/match-card";

type Equipo = { nombre: string; codigo_iso: string };
type Prediccion = { marcador_local: number; marcador_visitante: number };

type Partido = {
  id: number;
  grupo: string | null;
  inicio_utc: string;
  deadline: string;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: Equipo | null;
  visitante: Equipo | null;
  predictions: Prediccion[];
};

const ESTADOS = {
  pendiente: { texto: "Pendiente", color: "var(--text-secondary)", bg: "var(--surface-card)" },
  faltaPoco: { texto: "Falta poco", color: "var(--accent-default)", bg: "var(--accent-subtle)" },
  cierraPronto: { texto: "Cierra pronto", color: "var(--feedback-danger)", bg: "var(--feedback-danger-surface)" },
  predicho: { texto: "Predicho", color: "var(--feedback-success)", bg: "var(--feedback-success-surface)" },
};

function calcularEstado(deadline: string, tienePrediccion: boolean) {
  if (tienePrediccion) return ESTADOS.predicho;
  const horas = (new Date(deadline).getTime() - Date.now()) / 3_600_000;
  if (horas < 3) return ESTADOS.cierraPronto;
  if (horas < 12) return ESTADOS.faltaPoco;
  return ESTADOS.pendiente;
}

function limpiarRef(ref: string | null) {
  if (!ref) return "Por definir";
  return ref.replace("Grupo ", "");
}

function formatearMeta(inicioUtc: string, sede: string | null) {
  const fecha = new Date(inicioUtc);
  const hoy = new Date();

  const mismoDia = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  let dia: string;
  if (mismoDia(fecha, hoy)) {
    dia = "Hoy";
  } else {
    const nombre = fecha.toLocaleDateString("es", { weekday: "long" });
    const dd = String(fecha.getDate()).padStart(2, "0");
    const mm = String(fecha.getMonth() + 1).padStart(2, "0");
    dia = `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${dd}/${mm}`;
  }

  const partes = [dia];
  if (sede) partes.push(sede);
  return partes.join(" · ");
}

export function PorPredecir({ partidos }: { partidos: Partido[] }) {
  const pendientes = partidos.filter((p) => p.predictions.length === 0).length;

  if (partidos.length === 0) {
    return (
      <div className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-heading-md">Por predecir</span>
        </div>
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          No hay partidos por predecir ahora.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-heading-md">Por predecir</span>
        <span className="text-label-md text-text-secondary">
          {pendientes} {pendientes === 1 ? "pendiente" : "pendientes"}
        </span>
      </div>

      {partidos.map((p) => {
        const tienePrediccion = p.predictions.length > 0;
        const estado = calcularEstado(p.deadline, tienePrediccion);
        const marcador = tienePrediccion
          ? `${p.predictions[0].marcador_local}-${p.predictions[0].marcador_visitante}`
          : null;
        const hora = new Date(p.inicio_utc).toLocaleTimeString("es", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <MatchCard
            key={p.id}
            meta={formatearMeta(p.inicio_utc, p.sede)}
            estado={estado}
            hora={hora}
            localNombre={p.local?.nombre ?? limpiarRef(p.ref_local)}
            localIso={p.local?.codigo_iso ?? null}
            visitanteNombre={p.visitante?.nombre ?? limpiarRef(p.ref_visitante)}
            visitanteIso={p.visitante?.codigo_iso ?? null}
            marcador={marcador}
          />
        );
      })}

      <Link
        href="/quiniela"
        className="mt-2 block rounded-lg bg-accent-default py-3 text-center text-action-button text-text-on-accent"
      >
        Predecir ahora →
      </Link>
    </div>
  );
}