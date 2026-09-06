"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { type EquipoEscudo } from "@/components/escudo";
import { TarjetaPartido } from "@/components/tarjeta-partido";
import {
  BotonDetalle,
  DetallePronosticos,
  type Pronostico,
} from "@/components/pronosticos-detalle";
import { FinalCard } from "@/components/final-card";
import { FiltroDropdown } from "@/components/filtro-dropdown";
import { etiquetaFase, etiquetaLeg } from "@/lib/fases";
import { esIdaVuelta, ordenarFases, type ConfigTorneo } from "@/lib/config-torneo";

export type EquipoPartido = EquipoEscudo & { id: number };

export type { Pronostico };

export type Partido = {
  id: number;
  fase: string;
  leg: number | null;
  inicio_utc: string | null;
  status: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  resuelto_en: string | null;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  gameday: { nombre: string | null } | null;
  local: EquipoPartido | null;
  visitante: EquipoPartido | null;
};

const CLAVE_SIN_FECHA = "sin-fecha";

function claveDia(inicioUtc: string | null) {
  if (!inicioUtc) return CLAVE_SIN_FECHA;
  const f = new Date(inicioUtc);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

function tituloDia(inicioUtc: string | null) {
  if (!inicioUtc) return "Por programar";
  const f = new Date(inicioUtc);
  const dia = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)} ${dd}/${mm}`;
}

function horaLocal(inicioUtc: string | null) {
  if (!inicioUtc) return "Por definir";
  return new Date(inicioUtc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estaFinalizado(p: Partido) {
  return p.status === "finished" || p.status === "published";
}

function nombreEquipo(equipo: EquipoPartido | null, ref: string | null) {
  return equipo?.nombre ?? ref ?? "Por definir";
}

/**
 * Línea superior de la tarjeta. En fase de liga es la jornada ("Jornada 3");
 * en eliminatorias, la fase y el partido de la llave ("Octavos · Ida").
 */
function metaPartido(p: Partido, config: ConfigTorneo) {
  const base = p.gameday?.nombre ?? etiquetaFase(p.fase);
  const partes = [base];

  const leg = etiquetaLeg(p.leg);
  if (leg && esIdaVuelta(config, p.fase) && !base.toLowerCase().includes(leg.toLowerCase())) {
    partes.push(leg);
  }

  if (p.sede) partes.push(p.sede);
  return partes.join(" · ");
}

function detalleInstancia(
  p: Partido
): { marcador: string; etiqueta: string } | null {
  if (
    p.resuelto_en === "prorroga" &&
    p.prorroga_local != null &&
    p.prorroga_visitante != null
  ) {
    return {
      marcador: `${p.prorroga_local} - ${p.prorroga_visitante}`,
      etiqueta: "Prórroga",
    };
  }
  if (
    p.resuelto_en === "penales" &&
    p.penales_local != null &&
    p.penales_visitante != null
  ) {
    return {
      marcador: `${p.penales_local} - ${p.penales_visitante}`,
      etiqueta: "Penales",
    };
  }
  return null;
}

function Tarjeta({
  partido,
  config,
  pronosticos,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: Partido;
  config: ConfigTorneo;
  pronosticos: Pronostico[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const finalizado = estaFinalizado(partido);
  const ml = partido.marcador_local;
  const mv = partido.marcador_visitante;
  const marcador =
    finalizado && ml != null && mv != null
      ? { local: ml, visitante: mv }
      : null;

  return (
    <TarjetaPartido
      meta={metaPartido(partido, config)}
      finalizado={finalizado}
      local={partido.local}
      visitante={partido.visitante}
      nombreLocal={nombreEquipo(partido.local, partido.ref_local)}
      nombreVisitante={nombreEquipo(partido.visitante, partido.ref_visitante)}
      marcador={marcador}
      hora={horaLocal(partido.inicio_utc)}
      detalleInstancia={detalleInstancia(partido)}
      // Aquí se atenúa al perdedor del propio partido; en Eliminatorias manda
      // el eliminado de la llave.
      atenuarLocal={marcador != null && marcador.local < marcador.visitante}
      atenuarVisitante={marcador != null && marcador.visitante < marcador.local}
      destacada={abierta}
    >
      {finalizado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && marcador && (
            <DetallePronosticos
              pronosticos={pronosticos}
              resultado={marcador}
              usuarioId={usuarioId}
            />
          )}
        </>
      )}
    </TarjetaPartido>
  );
}

function TarjetaFinal({
  partido,
  config,
  pronosticos,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: Partido;
  config: ConfigTorneo;
  pronosticos: Pronostico[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const finalizado = estaFinalizado(partido);
  const ml = partido.marcador_local;
  const mv = partido.marcador_visitante;
  const resultado =
    ml != null && mv != null ? { local: ml, visitante: mv } : null;
  const metaLine = `${tituloDia(partido.inicio_utc)} · ${metaPartido(partido, config)}`;

  return (
    <FinalCard
      className="mb-2"
      finalizado={finalizado}
      local={partido.local}
      visitante={partido.visitante}
      nombreLocal={nombreEquipo(partido.local, partido.ref_local)}
      nombreVisitante={nombreEquipo(partido.visitante, partido.ref_visitante)}
      marcador={finalizado ? `${ml} - ${mv}` : null}
      hora={horaLocal(partido.inicio_utc)}
      metaLine={metaLine}
      detalleInstancia={detalleInstancia(partido)}
    >
      {finalizado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && resultado && (
            <DetallePronosticos
              pronosticos={pronosticos}
              resultado={resultado}
              usuarioId={usuarioId}
            />
          )}
        </>
      )}
    </FinalCard>
  );
}

type Filtro =
  | { tipo: "todos" }
  | { tipo: "fase"; valor: string }
  | { tipo: "equipo"; valor: string };

export function PartidosLista({
  partidos,
  pronosticos,
  usuarioId,
  config,
}: {
  partidos: Partido[];
  pronosticos: Record<number, Pronostico[]>;
  usuarioId: string;
  config: ConfigTorneo;
}) {
  const [filtro, setFiltro] = useState<Filtro>({ tipo: "todos" });
  const [abierto, setAbierto] = useState<number | null>(null);

  const diaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const yaScrolleado = useRef(false);

  const fasesDisponibles = useMemo(
    () =>
      ordenarFases(
        config,
        partidos.map((p) => p.fase)
      ).map((fase) => ({ valor: fase, label: etiquetaFase(fase) })),
    [partidos, config]
  );

  const equiposDisponibles = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of partidos) {
      if (p.local) mapa.set(p.local.id, p.local.nombre);
      if (p.visitante) mapa.set(p.visitante.id, p.visitante.nombre);
    }
    return Array.from(mapa.entries())
      .map(([id, nombre]) => ({ valor: String(id), label: nombre }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [partidos]);

  const partidosFiltrados = useMemo(() => {
    if (filtro.tipo === "todos") return partidos;
    if (filtro.tipo === "fase")
      return partidos.filter((p) => p.fase === filtro.valor);
    const id = Number(filtro.valor);
    return partidos.filter(
      (p) => p.local?.id === id || p.visitante?.id === id
    );
  }, [partidos, filtro]);

  const grupos: {
    clave: string;
    titulo: string;
    inicio: string | null;
    partidos: Partido[];
  }[] = [];
  let claveActual = "";
  for (const p of partidosFiltrados) {
    const clave = claveDia(p.inicio_utc);
    if (clave !== claveActual) {
      claveActual = clave;
      grupos.push({
        clave,
        titulo: tituloDia(p.inicio_utc),
        inicio: p.inicio_utc,
        partidos: [],
      });
    }
    grupos[grupos.length - 1].partidos.push(p);
  }

  useEffect(() => {
    if (filtro.tipo !== "todos") return;
    if (yaScrolleado.current) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const relevante =
      grupos.find((g) => {
        if (!g.inicio) return false;
        const f = new Date(g.inicio);
        f.setHours(0, 0, 0, 0);
        return f >= hoy;
      }) ?? null;

    if (relevante) {
      const el = diaRefs.current[relevante.clave];
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        yaScrolleado.current = true;
        return;
      }
    }
    window.scrollTo(0, 0);
    yaScrolleado.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setFiltro({ tipo: "todos" })}
          className="rounded-full px-4 py-2 text-label-md"
          style={{
            backgroundColor:
              filtro.tipo === "todos"
                ? "var(--accent-default)"
                : "var(--surface-card)",
            color:
              filtro.tipo === "todos"
                ? "var(--text-on-accent)"
                : "var(--text-tertiary)",
          }}
        >
          Todos
        </button>

        {/* Con una sola fase cargada el filtro no aporta nada. */}
        {fasesDisponibles.length > 1 && (
          <FiltroDropdown
            etiqueta="Fase"
            opciones={fasesDisponibles}
            valorActivo={filtro.tipo === "fase" ? filtro.valor : null}
            onSelect={(valor) => setFiltro({ tipo: "fase", valor })}
          />
        )}

        <FiltroDropdown
          etiqueta="Equipo"
          opciones={equiposDisponibles}
          valorActivo={filtro.tipo === "equipo" ? filtro.valor : null}
          onSelect={(valor) => setFiltro({ tipo: "equipo", valor })}
        />
      </div>

      {partidosFiltrados.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No hay partidos para este filtro.
        </p>
      ) : (
        grupos.map((g) => (
          <div
            key={g.clave}
            ref={(el) => {
              diaRefs.current[g.clave] = el;
            }}
            className="mb-5 scroll-mt-[var(--layout-content-offset-nav)]"
          >
            <h2 className="mb-3 text-body-sm">{g.titulo}</h2>
            {g.partidos.map((p) =>
              p.fase === "final" ? (
                <TarjetaFinal
                  key={p.id}
                  partido={p}
                  config={config}
                  pronosticos={pronosticos[p.id] ?? []}
                  usuarioId={usuarioId}
                  abierta={abierto === p.id}
                  onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
                />
              ) : (
                <Tarjeta
                  key={p.id}
                  partido={p}
                  config={config}
                  pronosticos={pronosticos[p.id] ?? []}
                  usuarioId={usuarioId}
                  abierta={abierto === p.id}
                  onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
                />
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}
