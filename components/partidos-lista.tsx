"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Flag } from "@/components/flag";
import { FinalCard } from "@/components/final-card";
import { FiltroDropdown } from "@/components/filtro-dropdown";
import { ChevronDown, ChevronUp, Star } from "lucide-react";

type Equipo = { nombre: string; codigo_iso: string };

type Pronostico = {
  usuario_id: string;
  nombre: string;
  marcador_local: number;
  marcador_visitante: number;
  points_earned: number;
  llanero_solitario: boolean;
  equipo_avanza_predicho: number | null;
};

type Partido = {
  id: number;
  grupo: string | null;
  fase: string;
  inicio_utc: string;
  status: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  resuelto_en: string | null;
  equipo_avanza_id: number | null;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: Equipo | null;
  visitante: Equipo | null;
};

function claveDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

function tituloDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  const dia = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  const diaCap = dia.charAt(0).toUpperCase() + dia.slice(1);
  return `${diaCap} ${dd}/${mm}`;
}

function horaLocal(inicioUtc: string) {
  return new Date(inicioUtc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nombreFase(fase: string) {
  const limpia = fase.replace(/_/g, " ");
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

function limpiarRef(texto: string) {
  return texto.replace(/Grupo /g, "");
}

function detalleInstancia(
  p: Partido
): { marcador: string; etiqueta: string } | null {
  if (p.resuelto_en === "prorroga" && p.prorroga_local != null && p.prorroga_visitante != null) {
    return {
      marcador: `${p.prorroga_local} - ${p.prorroga_visitante}`,
      etiqueta: "Prórroga",
    };
  }
  if (p.resuelto_en === "penales" && p.penales_local != null && p.penales_visitante != null) {
    return {
      marcador: `${p.penales_local} - ${p.penales_visitante}`,
      etiqueta: "Penales",
    };
  }
  return null;
}

function CirculoGris() {
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 20, height: 20, backgroundColor: "var(--border)" }}
    />
  );
}

function motivoPuntaje(pron: Pronostico, partido: Partido): string {
  const ml = partido.marcador_local as number;
  const mv = partido.marcador_visitante as number;
  const exacto = pron.marcador_local === ml && pron.marcador_visitante === mv;
  const realEmpate = ml === mv;
  const predEmpate = pron.marcador_local === pron.marcador_visitante;
  const aciertaGanador =
    (ml > mv && pron.marcador_local > pron.marcador_visitante) ||
    (ml < mv && pron.marcador_local < pron.marcador_visitante);

  const aciertaAvanza =
    partido.equipo_avanza_id != null &&
    pron.equipo_avanza_predicho != null &&
    pron.equipo_avanza_predicho === partido.equipo_avanza_id;

  let base: string;
  if (exacto && !realEmpate)
    base = pron.llanero_solitario ? "Exacto + llanero" : "Marcador exacto";
  else if (exacto && realEmpate)
    base = pron.llanero_solitario ? "Empate exacto + llanero" : "Empate exacto";
  else if (!realEmpate && aciertaGanador) base = "Acertó ganador";
  else if (realEmpate && predEmpate) base = "Acertó empate";
  else base = "No acertó";

  if (aciertaAvanza) base += " + avanza";
  return base;
}

function inicial(nombre: string) {
  return nombre.trim().charAt(0).toUpperCase();
}

function FilaPronostico({
  pron,
  esUsuario,
  partido,
}: {
  pron: Pronostico;
  esUsuario: boolean;
  partido: Partido;
}) {
  const colorPuntos =
    pron.points_earned > 0
      ? "var(--feedback-success)"
      : pron.points_earned === 0
      ? "var(--text-idle)"
      : "var(--text-primary)";

  return (
    <div
      className="mb-2 flex items-center gap-2 rounded-lg p-2"
      style={{
        backgroundColor: esUsuario ? "var(--accent-subtle)" : "var(--surface-background)",
        border: esUsuario ? "1px solid var(--accent-default)" : "none",
      }}
    >
      <span
        className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full text-heading-sm"
        style={{
          border: esUsuario ? "2px solid var(--accent-default)" : "none",
          backgroundColor: esUsuario ? "transparent" : "var(--border)",
          color: esUsuario ? "var(--accent-default)" : "var(--text-tertiary)",
        }}
      >
        {inicial(pron.nombre)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-body-sm">{pron.nombre}</span>
          {esUsuario && (
            <span
              className="flex-shrink-0 rounded-md px-1 py-px text-label-xs"
              style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
            >
              Tú
            </span>
          )}
          {pron.llanero_solitario && (
            <span
              className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-px text-label-xs"
              style={{ backgroundColor: "var(--surface-background)", color: "var(--accent-default)" }}
            >
              <Star className="h-[9px] w-[9px]" />
              Llanero
            </span>
          )}
        </div>
        <div className="mt-px text-label-md text-text-secondary">
          Pronosticó {pron.marcador_local}-{pron.marcador_visitante}
        </div>
      </div>

      <div className="flex-shrink-0 text-right">
        <div className="text-heading-md" style={{ color: colorPuntos }}>
          {pron.points_earned > 0 ? `+${pron.points_earned}` : pron.points_earned}
        </div>
        <div className="text-label-xs text-text-secondary">
          {motivoPuntaje(pron, partido)}
        </div>
      </div>
    </div>
  );
}

function DetallePronosticos({
  partido,
  pronosticos,
  usuarioId,
}: {
  partido: Partido;
  pronosticos: Pronostico[];
  usuarioId: string;
}) {
  const ordenados = [...pronosticos].sort(
    (a, b) => b.points_earned - a.points_earned
  );

  return (
    <div className="mt-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-label-md-bold" style={{ color: "var(--accent-default)" }}>
          Pronósticos
        </span>
        <span className="text-label-sm text-text-secondary">
          {ordenados.length} {ordenados.length === 1 ? "jugador" : "jugadores"}
        </span>
      </div>
      {ordenados.length === 0 ? (
        <p className="text-label-md text-text-secondary">
          Nadie pronosticó este partido.
        </p>
      ) : (
        ordenados.map((pron) => (
          <FilaPronostico
            key={pron.usuario_id}
            pron={pron}
            esUsuario={pron.usuario_id === usuarioId}
            partido={partido}
          />
        ))
      )}
    </div>
  );
}

function BotonDetalle({ abierta }: { abierta: boolean }) {
  return (
    <div
      className="mt-2 flex w-full items-center justify-center gap-1 border-t pt-2 text-label-md text-text-secondary"
      style={{ borderColor: "var(--border)" }}
    >
      {abierta ? (
        <>
          <ChevronUp className="h-[14px] w-[14px]" />
          Cerrar detalle
        </>
      ) : (
        <>
          <ChevronDown className="h-[14px] w-[14px]" />
          Ver detalle
        </>
      )}
    </div>
  );
}

function Tarjeta({
  partido,
  pronosticos,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: Partido;
  pronosticos: Pronostico[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const finalizado =
    partido.status === "finished" || partido.status === "published";
  const ml = partido.marcador_local;
  const mv = partido.marcador_visitante;
  const localPierde = finalizado && ml != null && mv != null && ml < mv;
  const visitantePierde = finalizado && ml != null && mv != null && mv < ml;

  const nombreLocal =
    partido.local?.nombre ??
    (partido.ref_local ? limpiarRef(partido.ref_local) : "Por definir");
  const nombreVisitante =
    partido.visitante?.nombre ??
    (partido.ref_visitante ? limpiarRef(partido.ref_visitante) : "Por definir");

  const detalle = detalleInstancia(partido);

  return (
    <div
      className="mb-2 rounded-xl bg-surface-card p-3"
      style={{ border: abierta ? "1px solid var(--accent-default)" : "1px solid transparent" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="truncate text-label-md text-text-secondary">
          {partido.grupo ? `Grupo ${partido.grupo}` : nombreFase(partido.fase)}
          {partido.sede ? ` · ${partido.sede}` : ""}
        </span>
        {finalizado ? (
          <span className="flex-shrink-0 pl-2 text-label-sm text-feedback-success">
            Finalizado
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ opacity: localPierde ? 0.45 : 1 }}
        >
          {partido.local ? (
            <Flag iso={partido.local.codigo_iso} size={20} />
          ) : (
            <CirculoGris />
          )}
          <span className="truncate text-body-sm">{nombreLocal}</span>
        </div>

        {finalizado ? (
          <span className="flex-shrink-0 text-heading-md">
            {ml} - {mv}
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-md bg-surface-background px-2 py-1 text-label-md text-text-secondary">
            {horaLocal(partido.inicio_utc)}
          </span>
        )}

        <div
          className="flex min-w-0 flex-1 items-center justify-end gap-2"
          style={{ opacity: visitantePierde ? 0.45 : 1 }}
        >
          <span className="truncate text-right text-body-sm">
            {nombreVisitante}
          </span>
          {partido.visitante ? (
            <Flag iso={partido.visitante.codigo_iso} size={20} />
          ) : (
            <CirculoGris />
          )}
        </div>
      </div>

      {finalizado && detalle && (
        <div className="mt-1 text-center leading-tight text-text-secondary">
          <div className="text-label-md-bold">{detalle.marcador}</div>
          <div className="text-label-sm">{detalle.etiqueta}</div>
        </div>
      )}

      {finalizado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && (
            <DetallePronosticos
              partido={partido}
              pronosticos={pronosticos}
              usuarioId={usuarioId}
            />
          )}
        </>
      )}
    </div>
  );
}

function FinalDesdePartido({
  partido,
  pronosticos,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: Partido;
  pronosticos: Pronostico[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const finalizado =
    partido.status === "finished" || partido.status === "published";
  const nombreLocal =
    partido.local?.nombre ??
    (partido.ref_local ? limpiarRef(partido.ref_local) : "Por definir");
  const nombreVisitante =
    partido.visitante?.nombre ??
    (partido.ref_visitante ? limpiarRef(partido.ref_visitante) : "Por definir");
  const detalle = detalleInstancia(partido);
  const metaLine = `${tituloDia(partido.inicio_utc)}${partido.sede ? ` · ${partido.sede}` : ""}`;
  const marcador = finalizado
    ? `${partido.marcador_local} - ${partido.marcador_visitante}`
    : null;

  return (
    <FinalCard
      className="mb-2"
      finalizado={finalizado}
      nombreLocal={nombreLocal}
      nombreVisitante={nombreVisitante}
      localIso={partido.local?.codigo_iso ?? null}
      visitanteIso={partido.visitante?.codigo_iso ?? null}
      marcador={marcador}
      hora={horaLocal(partido.inicio_utc)}
      metaLine={metaLine}
      detalleInstancia={detalle}
    >
      {finalizado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && (
            <DetallePronosticos
              partido={partido}
              pronosticos={pronosticos}
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
  | { tipo: "grupo"; valor: string }
  | { tipo: "equipo"; valor: string };

export function PartidosLista({
  partidos,
  pronosticos,
  usuarioId,
}: {
  partidos: Partido[];
  pronosticos: Record<number, Pronostico[]>;
  usuarioId: string;
}) {
  const [filtro, setFiltro] = useState<Filtro>({ tipo: "todos" });
  const [abierto, setAbierto] = useState<number | null>(null);

  const diaRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const yaScrolleado = useRef(false);

  const gruposDisponibles = useMemo(() => {
    const set = new Set<string>();
    partidos.forEach((p) => p.grupo && set.add(p.grupo));
    return Array.from(set)
      .sort()
      .map((g) => ({ valor: g, label: `Grupo ${g}` }));
  }, [partidos]);

  const equiposDisponibles = useMemo(() => {
    const mapa = new Map<string, string>();
    partidos.forEach((p) => {
      if (p.local) mapa.set(p.local.codigo_iso, p.local.nombre);
      if (p.visitante) mapa.set(p.visitante.codigo_iso, p.visitante.nombre);
    });
    return Array.from(mapa.entries())
      .map(([valor, label]) => ({ valor, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [partidos]);

  const partidosFiltrados = useMemo(() => {
    if (filtro.tipo === "todos") return partidos;
    if (filtro.tipo === "grupo")
      return partidos.filter((p) => p.grupo === filtro.valor);
    return partidos.filter(
      (p) =>
        p.local?.codigo_iso === filtro.valor ||
        p.visitante?.codigo_iso === filtro.valor
    );
  }, [partidos, filtro]);

  const grupos: { clave: string; titulo: string; primerInicio: string; partidos: Partido[] }[] = [];
  let claveActual = "";
  for (const p of partidosFiltrados) {
    const clave = claveDia(p.inicio_utc);
    if (clave !== claveActual) {
      claveActual = clave;
      grupos.push({
        clave,
        titulo: tituloDia(p.inicio_utc),
        primerInicio: p.inicio_utc,
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
        const f = new Date(g.primerInicio);
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
            backgroundColor: filtro.tipo === "todos" ? "var(--accent-default)" : "var(--surface-card)",
            color: filtro.tipo === "todos" ? "var(--text-on-accent)" : "var(--text-tertiary)",
          }}
        >
          Todos
        </button>

        <FiltroDropdown
          etiqueta="Grupo"
          opciones={gruposDisponibles}
          valorActivo={filtro.tipo === "grupo" ? filtro.valor : null}
          onSelect={(valor) => setFiltro({ tipo: "grupo", valor })}
        />

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
                <FinalDesdePartido
                  key={p.id}
                  partido={p}
                  pronosticos={pronosticos[p.id] ?? []}
                  usuarioId={usuarioId}
                  abierta={abierto === p.id}
                  onToggle={() => setAbierto(abierto === p.id ? null : p.id)}
                />
              ) : (
                <Tarjeta
                  key={p.id}
                  partido={p}
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