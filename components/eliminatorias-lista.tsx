"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { type EquipoEscudo } from "@/components/escudo";
import { FinalCard } from "@/components/final-card";
import { TarjetaPartido, type MarcadorPartido } from "@/components/tarjeta-partido";
import {
  BotonDetalle,
  DetallePronosticos,
  type Pronostico,
} from "@/components/pronosticos-detalle";
import { etiquetaFase } from "@/lib/fases";
import { formatoDeFase, type ConfigTorneo } from "@/lib/config-torneo";
import { llavesPlaceholder } from "@/lib/llaves-placeholder";

export type EquipoLlave = EquipoEscudo & {
  id: number;
  /** Solo se usa del local: es la sede por defecto cuando el partido no la anula. */
  estadio: string | null;
  ciudad: string | null;
};

export type PartidoLlave = {
  id: number;
  tie_id: number | null;
  fase: string;
  leg: number | null;
  inicio_utc: string | null;
  status: string;
  sede: string | null;
  marcador_local: number | null;
  marcador_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  resuelto_en: string | null;
  equipo_local_id: number | null;
  equipo_visitante_id: number | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: EquipoLlave | null;
  visitante: EquipoLlave | null;
};

export type Llave = {
  id: number;
  fase: string;
  agregado_a: number | null;
  agregado_b: number | null;
  equipo_avanza_id: number | null;
  /** "agregado" | "prorroga" | "penales" */
  resuelto_en: string | null;
  ref_a: string | null;
  ref_b: string | null;
  equipo_a: EquipoLlave | null;
  equipo_b: EquipoLlave | null;
};

/** Quién dijo cada jugador que pasaría la llave. */
export type AvancePronosticado = {
  usuario_id: string;
  nombre: string;
  equipo_avanza_id: number | null;
  /** Resuelto en el servidor: aquí solo se pinta. */
  equipo_avanza_nombre: string | null;
  points_earned: number;
};

/**
 * La llave con sus legs. Ya no es una unidad visual —cada partido es su
 * propia card— pero sigue siendo la unidad de cálculo: el agregado y quién
 * avanza solo existen a nivel de llave.
 */
export type Cruce = {
  clave: string;
  fase: string;
  llave: Llave | null;
  partidos: PartidoLlave[];
};

function estaJugado(p: PartidoLlave) {
  return p.status === "finished" || p.status === "published";
}


function claveDia(inicioUtc: string | null) {
  if (!inicioUtc) return "sin-fecha";
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

function nombreLado(equipo: EquipoLlave | null, ref: string | null) {
  return equipo?.nombre ?? ref ?? "Por definir";
}

function marcadorDe(p: PartidoLlave): MarcadorPartido | null {
  if (!estaJugado(p)) return null;
  if (p.marcador_local == null || p.marcador_visitante == null) return null;
  return { local: p.marcador_local, visitante: p.marcador_visitante };
}

function detalleInstancia(
  p: PartidoLlave
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

/**
 * Agregado de la llave orientado A-B.
 *
 * Con la llave cerrada manda el dato de la BD. Mientras falte algún leg se
 * suma lo ya jugado, que es el "global parcial" que ve la vuelta antes de
 * disputarse. Si no hay ni un leg jugado devuelve null: un `0-0` sería
 * inventado.
 */
function agregado(cruce: Cruce): { a: number; b: number } | null {
  const { llave, partidos } = cruce;
  if (!llave) return null;

  const idA = llave.equipo_a?.id;
  const idB = llave.equipo_b?.id;
  if (idA == null || idB == null) return null;

  const jugados = partidos.filter(estaJugado);
  if (jugados.length === 0) return null;

  const completo = jugados.length === partidos.length;
  if (completo && llave.agregado_a != null && llave.agregado_b != null) {
    return { a: llave.agregado_a, b: llave.agregado_b };
  }

  let a = 0;
  let b = 0;
  for (const p of jugados) {
    if (p.marcador_local == null || p.marcador_visitante == null) return null;
    if (p.equipo_local_id === idA && p.equipo_visitante_id === idB) {
      a += p.marcador_local;
      b += p.marcador_visitante;
    } else if (p.equipo_local_id === idB && p.equipo_visitante_id === idA) {
      b += p.marcador_local;
      a += p.marcador_visitante;
    } else {
      return null;
    }
  }
  return { a, b };
}

/**
 * Voltea el agregado A-B para que se lea en el mismo orden en que aparecen
 * los equipos en ESTA card. La vuelta invierte la localía, así que sin esto
 * la pill contradiría al marcador que tiene justo debajo.
 */
function orientar(
  global: { a: number; b: number },
  partido: PartidoLlave,
  llave: Llave
): MarcadorPartido | null {
  const idA = llave.equipo_a?.id;
  const idB = llave.equipo_b?.id;
  if (partido.equipo_local_id === idA) {
    return { local: global.a, visitante: global.b };
  }
  if (partido.equipo_local_id === idB) {
    return { local: global.b, visitante: global.a };
  }
  return null;
}

/**
 * Contexto de la llave sobre el marcador:
 *
 *   ida jugada  -> "Partido Ida"
 *   vuelta      -> "Global X-Y", parcial mientras no se juegue
 *
 * La ida sin jugar no lleva pill: todavía es un partido sin historia. Y la
 * vuelta tampoco, si la ida no se ha jugado y no hay nada que agregar.
 */
function pillDe(
  partido: PartidoLlave,
  cruce: Cruce,
  config: ConfigTorneo
): string | null {
  const { llave } = cruce;
  if (!llave) return null;
  if (formatoDeFase(config, partido.fase) !== "ida_vuelta") return null;

  if (partido.leg === 1) return estaJugado(partido) ? "Partido Ida" : null;
  if (partido.leg !== 2) return null;

  const global = agregado(cruce);
  if (!global) return null;

  const orientado = orientar(global, partido, llave);
  if (!orientado) return null;

  return `Global ${orientado.local}-${orientado.visitante}`;
}

/** Bloque de "quién avanza", solo si la Quiniela llegó a capturarlo. */
function BloqueAvances({
  avances,
  usuarioId,
}: {
  avances: AvancePronosticado[];
  usuarioId: string;
}) {
  if (avances.length === 0) return null;

  return (
    <div className="mt-3">
      <div
        className="mb-2 text-label-md-bold"
        style={{ color: "var(--accent-default)" }}
      >
        Quién avanza
      </div>
      <div className="flex flex-col gap-1">
        {avances.map((a) => (
          <div
            key={a.usuario_id}
            className="flex items-center justify-between rounded-lg px-2 py-1"
            style={{
              backgroundColor:
                a.usuario_id === usuarioId
                  ? "var(--accent-subtle)"
                  : "var(--surface-background)",
            }}
          >
            <span className="truncate text-label-md">{a.nombre}</span>
            <span className="flex-shrink-0 pl-2 text-label-md text-text-secondary">
              {a.equipo_avanza_nombre ?? "Sin pronóstico"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TarjetaEliminatoria({
  partido,
  cruce,
  config,
  pronosticos,
  avances,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: PartidoLlave;
  cruce: Cruce;
  config: ConfigTorneo;
  pronosticos: Pronostico[];
  avances: AvancePronosticado[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const jugado = estaJugado(partido);
  const marcador = marcadorDe(partido);
  const avanza = cruce.llave?.equipo_avanza_id ?? null;

  /*
   * El atenuado depende de la LLAVE, no del partido: solo se activa cuando
   * `equipo_avanza_id` está definido, y entonces marca al eliminado en las
   * dos cards, aunque en una de ellas haya ganado.
   *
   * Mientras la llave sigue abierta no se atenúa a nadie, ni siquiera al que
   * perdió la ida: la vuelta puede darle la vuelta al cruce y adelantar un
   * eliminado que todavía no existe sería mentir.
   */
  const atenuarLocal =
    avanza != null &&
    partido.equipo_local_id != null &&
    partido.equipo_local_id !== avanza;
  const atenuarVisitante =
    avanza != null &&
    partido.equipo_visitante_id != null &&
    partido.equipo_visitante_id !== avanza;

  /*
   * `sede` es la excepción (partido a cancha neutral, como la final); el
   * resto se juega en la del local, así que a falta de esa excepción se arma
   * con su estadio/ciudad.
   */
  const sedeLeg =
    partido.sede ??
    (partido.local?.estadio
      ? [partido.local.estadio, partido.local.ciudad].filter(Boolean).join(", ")
      : null);
  const meta = [etiquetaFase(partido.fase), sedeLeg].filter(Boolean).join(" · ");

  // El bloque de la llave va en el último leg, que es donde se resuelve.
  const esUltimoLeg = cruce.partidos[cruce.partidos.length - 1]?.id === partido.id;

  return (
    <TarjetaPartido
      meta={meta}
      finalizado={jugado}
      local={partido.local}
      visitante={partido.visitante}
      nombreLocal={nombreLado(partido.local, partido.ref_local)}
      nombreVisitante={nombreLado(partido.visitante, partido.ref_visitante)}
      marcador={marcador}
      hora={horaLocal(partido.inicio_utc)}
      detalleInstancia={detalleInstancia(partido)}
      pill={pillDe(partido, cruce, config)}
      atenuarLocal={atenuarLocal}
      atenuarVisitante={atenuarVisitante}
      destacada={abierta}
    >
      {jugado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && marcador && (
            <>
              <DetallePronosticos
                pronosticos={pronosticos}
                resultado={marcador}
                usuarioId={usuarioId}
              />
              {esUltimoLeg && (
                <BloqueAvances avances={avances} usuarioId={usuarioId} />
              )}
            </>
          )}
        </>
      )}
    </TarjetaPartido>
  );
}

function TarjetaFinal({
  partido,
  pronosticos,
  avances,
  usuarioId,
  abierta,
  onToggle,
}: {
  partido: PartidoLlave;
  pronosticos: Pronostico[];
  avances: AvancePronosticado[];
  usuarioId: string;
  abierta: boolean;
  onToggle: () => void;
}) {
  const jugado = estaJugado(partido);
  const marcador = marcadorDe(partido);
  const metaLine = [tituloDia(partido.inicio_utc), partido.sede]
    .filter(Boolean)
    .join(" · ");

  return (
    <FinalCard
      className="mb-2"
      finalizado={jugado}
      local={partido.local}
      visitante={partido.visitante}
      nombreLocal={nombreLado(partido.local, partido.ref_local)}
      nombreVisitante={nombreLado(partido.visitante, partido.ref_visitante)}
      marcador={marcador ? `${marcador.local} - ${marcador.visitante}` : null}
      hora={horaLocal(partido.inicio_utc)}
      metaLine={metaLine}
      detalleInstancia={detalleInstancia(partido)}
    >
      {jugado && (
        <>
          <button onClick={onToggle} className="w-full">
            <BotonDetalle abierta={abierta} />
          </button>
          {abierta && marcador && (
            <>
              <DetallePronosticos
                pronosticos={pronosticos}
                resultado={marcador}
                usuarioId={usuarioId}
              />
              <BloqueAvances avances={avances} usuarioId={usuarioId} />
            </>
          )}
        </>
      )}
    </FinalCard>
  );
}

export function EliminatoriasLista({
  cruces,
  pronosticos,
  avances,
  usuarioId,
  config,
}: {
  cruces: Cruce[];
  pronosticos: Record<number, Pronostico[]>;
  avances: Record<number, AvancePronosticado[]>;
  usuarioId: string;
  config: ConfigTorneo;
}) {
  /* Las fases y su orden salen del config: nada de listas fijas de rondas. */
  const fases = useMemo(
    () =>
      config.fases.filter((fase) => {
        const formato = formatoDeFase(config, fase);
        return formato === "ida_vuelta" || formato === "partido_unico";
      }),
    [config]
  );

  /*
   * La llave deja de ser un contenedor visual: cada partido va suelto, en su
   * fecha. Se conserva el cruce al lado para poder calcular pill y atenuado.
   */
  const partidos = useMemo(() => {
    const lista = cruces.flatMap((cruce) =>
      cruce.partidos.map((partido) => ({ partido, cruce }))
    );
    return lista.sort((x, y) =>
      (x.partido.inicio_utc ?? "").localeCompare(y.partido.inicio_utc ?? "")
    );
  }, [cruces]);

  const [faseActiva, setFaseActiva] = useState(
    () => faseInicial(fases, partidos) ?? fases[0] ?? ""
  );
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

  if (fases.length === 0) {
    return (
      <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
        Esta competición no tiene fase eliminatoria.
      </p>
    );
  }

  const delaFase = partidos.filter((x) => x.partido.fase === faseActiva);
  const ultimaFase = config.fases[config.fases.length - 1];

  // Mismo agrupado por día que Partidos: la lista sigue el calendario.
  const dias: {
    clave: string;
    titulo: string;
    items: typeof delaFase;
  }[] = [];
  let claveActual = "";
  for (const item of delaFase) {
    const clave = claveDia(item.partido.inicio_utc);
    if (clave !== claveActual) {
      claveActual = clave;
      dias.push({
        clave,
        titulo: tituloDia(item.partido.inicio_utc),
        items: [],
      });
    }
    dias[dias.length - 1].items.push(item);
  }

  const toggle = (id: number) => setAbierto(abierto === id ? null : id);
  const avancesDe = (cruce: Cruce) =>
    cruce.llave ? avances[cruce.llave.id] ?? [] : [];

  return (
    <div>
      <div className="relative -mx-[18px] mb-4">
        <div
          ref={barraRef}
          className="flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {fases.map((fase) => {
            const activa = fase === faseActiva;
            return (
              <button
                key={fase}
                ref={activa ? chipActivoRef : null}
                onClick={() => setFaseActiva(fase)}
                className="flex-shrink-0 rounded-full px-4 py-2 text-label-md"
                style={{
                  backgroundColor: activa
                    ? "var(--accent-default)"
                    : "var(--surface-card)",
                  color: activa ? "var(--text-on-accent)" : "var(--text-tertiary)",
                }}
              >
                {etiquetaFase(fase)}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-10"
          style={{
            background: "linear-gradient(90deg, transparent, var(--background))",
          }}
        />
      </div>

      {delaFase.length === 0 ? (
        (() => {
          const esFinal = faseActiva === ultimaFase;
          const llaves = llavesPlaceholder(faseActiva, esFinal);

          if (llaves.length === 0) {
            return (
              <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
                El sorteo de esta fase todavía no está hecho.
              </p>
            );
          }

          if (esFinal) {
            return (
              <FinalCard
                className="mb-2"
                finalizado={false}
                local={null}
                visitante={null}
                nombreLocal={llaves[0].local}
                nombreVisitante={llaves[0].visitante}
                marcador={null}
                hora="Por definir"
                metaLine="Información no disponible"
                detalleInstancia={null}
                placeholder
              />
            );
          }

          return llaves.map((llave, i) => (
            <TarjetaPartido
              key={i}
              meta="Información no disponible"
              finalizado={false}
              local={null}
              visitante={null}
              nombreLocal={llave.local}
              nombreVisitante={llave.visitante}
              marcador={null}
              hora="Por definir"
              detalleInstancia={null}
              placeholder
            />
          ));
        })()
      ) : (
        dias.map((dia) => (
          <div key={dia.clave} className="mb-5">
            <h2 className="mb-3 text-body-sm">{dia.titulo}</h2>
            {dia.items.map(({ partido, cruce }) =>
              partido.fase === ultimaFase ? (
                <TarjetaFinal
                  key={partido.id}
                  partido={partido}
                  pronosticos={pronosticos[partido.id] ?? []}
                  avances={avancesDe(cruce)}
                  usuarioId={usuarioId}
                  abierta={abierto === partido.id}
                  onToggle={() => toggle(partido.id)}
                />
              ) : (
                <TarjetaEliminatoria
                  key={partido.id}
                  partido={partido}
                  cruce={cruce}
                  config={config}
                  pronosticos={pronosticos[partido.id] ?? []}
                  avances={avancesDe(cruce)}
                  usuarioId={usuarioId}
                  abierta={abierto === partido.id}
                  onToggle={() => toggle(partido.id)}
                />
              )
            )}
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Fase que se muestra al entrar: la primera con algo por jugar. Si ya está
 * todo jugado, la última que tenga partidos; si no hay nada, ninguna.
 */
function faseInicial(
  fases: string[],
  partidos: { partido: PartidoLlave }[]
): string | null {
  const pendiente = fases.find((fase) =>
    partidos.some((x) => x.partido.fase === fase && !estaJugado(x.partido))
  );
  if (pendiente) return pendiente;

  const conPartidos = fases.filter((fase) =>
    partidos.some((x) => x.partido.fase === fase)
  );
  return conPartidos[conPartidos.length - 1] ?? null;
}
