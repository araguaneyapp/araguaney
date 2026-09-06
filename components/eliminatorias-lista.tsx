"use client";

import { useState, useEffect, useRef } from "react";
import { Flag } from "@/components/flag";
import { FinalCard } from "@/components/final-card";
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
  fase: string;
  inicio_utc: string;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  marcador_local: number | null;
  marcador_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  resuelto_en: string | null;
  equipo_avanza_id: number | null;
  status: string;
  local: Equipo | null;
  visitante: Equipo | null;
};

const FASES = [
  { valor: "dieciseisavos", label: "Dieciseisavos" },
  { valor: "octavos", label: "Octavos" },
  { valor: "cuartos", label: "Cuartos" },
  { valor: "semifinal", label: "Semifinales" },
  { valor: "tercer_lugar", label: "Tercer lugar" },
  { valor: "final", label: "Final" },
];

const ORDEN_FASES = [
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

function limpiarRef(ref: string | null) {
  if (!ref) return "Por definir";
  return ref.replace("Grupo ", "");
}

function claveDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

function tituloDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  const nombre = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${dd}/${mm}`;
}

function horaLocal(inicioUtc: string) {
  return new Date(inicioUtc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

function estaJugado(p: Partido) {
  return p.status === "finished" || p.status === "published";
}

function calcularFaseActiva(partidos: Partido[]): string {
  const pendientes = partidos
    .filter((p) => !estaJugado(p))
    .sort(
      (a, b) =>
        new Date(a.inicio_utc).getTime() - new Date(b.inicio_utc).getTime()
    );

  if (pendientes.length > 0) {
    return pendientes[0].fase;
  }

  const fasesConPartidos = partidos.map((p) => p.fase);
  for (let i = ORDEN_FASES.length - 1; i >= 0; i--) {
    if (fasesConPartidos.includes(ORDEN_FASES[i])) {
      return ORDEN_FASES[i];
    }
  }

  return "dieciseisavos";
}

function inicial(nombre: string) {
  return nombre.trim().charAt(0).toUpperCase();
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
  if (exacto && !realEmpate) base = pron.llanero_solitario ? "Exacto + llanero" : "Marcador exacto";
  else if (exacto && realEmpate) base = pron.llanero_solitario ? "Empate exacto + llanero" : "Empate exacto";
  else if (!realEmpate && aciertaGanador) base = "Acertó ganador";
  else if (realEmpate && predEmpate) base = "Acertó empate";
  else base = "No acertó";

  if (aciertaAvanza) base += " + avanza";
  return base;
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
    pron.points_earned > 0 ? "var(--feedback-success)" : "var(--text-idle)";

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

function TarjetaEliminatoria({
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
  const finalizado = partido.marcador_local != null && partido.marcador_visitante != null;
  const nombreLocal = partido.local?.nombre ?? limpiarRef(partido.ref_local);
  const nombreVisitante = partido.visitante?.nombre ?? limpiarRef(partido.ref_visitante);
  const detalle = detalleInstancia(partido);

  return (
    <div
      className="mb-2 rounded-xl bg-surface-card p-3"
      style={{ border: abierta ? "1px solid var(--accent-default)" : "1px solid transparent" }}
    >
      {partido.sede && (
        <div className="mb-2 text-label-md text-text-secondary">
          {partido.sede}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {partido.local ? (
            <Flag iso={partido.local.codigo_iso} size={22} />
          ) : (
            <span
              className="inline-block flex-shrink-0 rounded-full"
              style={{ width: 22, height: 22, backgroundColor: "var(--border)" }}
            />
          )}
          <span className="truncate text-body-sm">{nombreLocal}</span>
        </div>

        <div className="flex-shrink-0 px-3 text-center">
          {finalizado ? (
            <span className="text-heading-md">
              {partido.marcador_local} - {partido.marcador_visitante}
            </span>
          ) : (
            <span className="rounded-md bg-surface-background px-2 py-1 text-label-md text-text-secondary">
              {horaLocal(partido.inicio_utc)}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-body-sm">{nombreVisitante}</span>
          {partido.visitante ? (
            <Flag iso={partido.visitante.codigo_iso} size={22} />
          ) : (
            <span
              className="inline-block flex-shrink-0 rounded-full"
              style={{ width: 22, height: 22, backgroundColor: "var(--border)" }}
            />
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
  const finalizado = partido.marcador_local != null && partido.marcador_visitante != null;
  const nombreLocal = partido.local?.nombre ?? limpiarRef(partido.ref_local);
  const nombreVisitante = partido.visitante?.nombre ?? limpiarRef(partido.ref_visitante);
  const detalle = detalleInstancia(partido);
  const metaLine = `${tituloDia(partido.inicio_utc)}${partido.sede ? ` · ${partido.sede}` : ""}`;
  const marcador = finalizado
    ? `${partido.marcador_local} - ${partido.marcador_visitante}`
    : null;

  return (
    <FinalCard
      finalizado={finalizado}
      nombreLocal={nombreLocal}
      nombreVisitante={nombreVisitante}
      local={
        partido.local
          ? { ...partido.local, abreviatura: null, logo_url: null }
          : null
      }
      visitante={
        partido.visitante
          ? { ...partido.visitante, abreviatura: null, logo_url: null }
          : null
      }
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

export function EliminatoriasLista({
  partidos,
  pronosticos,
  usuarioId,
}: {
  partidos: Partido[];
  pronosticos: Record<number, Pronostico[]>;
  usuarioId: string;
}) {
  const [faseActiva, setFaseActiva] = useState(() => calcularFaseActiva(partidos));
  const [abierto, setAbierto] = useState<number | null>(null);

  const barraRef = useRef<HTMLDivElement | null>(null);
  const chipActivoRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const barra = barraRef.current;
    const chip = chipActivoRef.current;
    if (!barra || !chip) return;
    const offset = chip.offsetLeft - barra.clientWidth / 2 + chip.clientWidth / 2;
    barra.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
     
  }, []);

  const partidosFase = partidos.filter((p) => p.fase === faseActiva);
  const esFinal = faseActiva === "final";

  const toggle = (id: number) => setAbierto(abierto === id ? null : id);

  const gruposDia: { clave: string; titulo: string; partidos: Partido[] }[] = [];
  let claveActual = "";
  for (const p of partidosFase) {
    const clave = claveDia(p.inicio_utc);
    if (clave !== claveActual) {
      claveActual = clave;
      gruposDia.push({
        clave,
        titulo: tituloDia(p.inicio_utc),
        partidos: [],
      });
    }
    gruposDia[gruposDia.length - 1].partidos.push(p);
  }

  return (
    <div>
      <div className="relative -mx-[18px] mb-4">
        <div
          ref={barraRef}
          className="flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FASES.map((fase) => {
            const activa = fase.valor === faseActiva;
            return (
              <button
                key={fase.valor}
                ref={activa ? chipActivoRef : null}
                onClick={() => setFaseActiva(fase.valor)}
                className="flex-shrink-0 rounded-full px-4 py-2 text-label-md"
                style={{
                  backgroundColor: activa ? "var(--accent-default)" : "var(--surface-card)",
                  color: activa ? "var(--text-on-accent)" : "var(--text-tertiary)",
                }}
              >
                {fase.label}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-10"
          style={{ background: "linear-gradient(90deg, transparent, var(--background))" }}
        />
      </div>

      {partidosFase.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          Aún no hay partidos en esta fase.
        </p>
      ) : esFinal ? (
        partidosFase.map((p) => (
          <FinalDesdePartido
            key={p.id}
            partido={p}
            pronosticos={pronosticos[p.id] ?? []}
            usuarioId={usuarioId}
            abierta={abierto === p.id}
            onToggle={() => toggle(p.id)}
          />
        ))
      ) : (
        gruposDia.map((g) => (
          <div key={g.clave} className="mb-5">
            <h2 className="mb-3 text-body-sm">{g.titulo}</h2>
            {g.partidos.map((p) => (
              <TarjetaEliminatoria
                key={p.id}
                partido={p}
                pronosticos={pronosticos[p.id] ?? []}
                usuarioId={usuarioId}
                abierta={abierto === p.id}
                onToggle={() => toggle(p.id)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}