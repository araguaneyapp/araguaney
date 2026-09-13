"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Minus,
  Lock,
  Check,
  ChevronRight,
  ListOrdered,
  Trophy,
} from "lucide-react";
import { Escudo, type EquipoEscudo } from "@/components/escudo";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";
import { etiquetaFase, etiquetaLeg } from "@/lib/fases";
import {
  esIdaVuelta,
  plazasClasificacion,
  type ConfigTorneo,
} from "@/lib/config-torneo";
import { ahoraMs } from "@/lib/tiempo";

type EquipoQuiniela = EquipoEscudo & { id: number };

type PrediccionPropia = {
  marcador_local: number;
  marcador_visitante: number;
  usuario_id: string;
};

export type PartidoQuiniela = {
  id: number;
  fase: string;
  leg: number | null;
  gameday_id: number | null;
  inicio_utc: string | null;
  deadline: string | null;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: EquipoQuiniela | null;
  visitante: EquipoQuiniela | null;
  predictions: PrediccionPropia[];
};

export type Jornada = {
  id: number;
  numero: number | null;
  nombre: string | null;
  fase: string;
  fecha: string | null;
  estado: string;
};

type Marcador = { local: number; visitante: number; tocado: boolean };
type MarcadorState = Record<number, Marcador>;

/** Bloque de una jornada (o de los partidos sueltos de una fase). */
type Bloque = {
  clave: string;
  titulo: string;
  /** Estado de la jornada, solo informativo: el bloqueo lo manda el deadline. */
  estado: string | null;
  fecha: string | null;
  partidos: PartidoQuiniela[];
};

const ESTADOS_VISIBLES: Record<string, string> = {
  cerrada: "Cerrada",
  finalizada: "Finalizada",
};

const CLAVE_SIN_FECHA = "sin-fecha";

/**
 * Un partido sin deadline se considera abierto: lo contrario dejaría partidos
 * imposibles de predecir si falta cargar la fecha.
 */
function estaBloqueado(partido: PartidoQuiniela, ahora: number) {
  return partido.deadline != null && new Date(partido.deadline).getTime() <= ahora;
}

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

function nombreEquipo(equipo: EquipoQuiniela | null, ref: string | null) {
  return equipo?.nombre ?? ref ?? "Por definir";
}

function calcularFaseActiva(
  partidos: PartidoQuiniela[],
  config: ConfigTorneo,
  ahora: number
): string {
  const proximo = partidos
    .filter((p) => p.inicio_utc && new Date(p.inicio_utc).getTime() >= ahora)
    .sort(
      (a, b) =>
        new Date(a.inicio_utc as string).getTime() -
        new Date(b.inicio_utc as string).getTime()
    )[0];

  if (proximo) return proximo.fase;

  // Sin partidos por delante, la última fase del torneo que tenga partidos.
  const conPartidos = new Set(partidos.map((p) => p.fase));
  for (let i = config.fases.length - 1; i >= 0; i--) {
    if (conPartidos.has(config.fases[i])) return config.fases[i];
  }

  return config.fases[0] ?? "liga";
}

function FilaEquipo({
  equipo,
  nombre,
  valor,
  tocado,
  bloqueado,
  onCambio,
}: {
  equipo: EquipoQuiniela | null;
  nombre: string;
  valor: number;
  tocado: boolean;
  bloqueado: boolean;
  onCambio: (delta: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Escudo equipo={equipo} size={24} />
        <span className="truncate text-body-md">{nombre}</span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          disabled={bloqueado || valor === 0}
          onClick={() => onCambio(-1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border"
          style={{
            borderColor: "var(--border-strong)",
            opacity: bloqueado || valor === 0 ? 0.4 : 1,
          }}
        >
          <Minus
            className="h-[16px] w-[16px]"
            style={{ color: "var(--icons-secondary)" }}
          />
        </button>

        <span
          className="w-[28px] text-center text-display-md leading-none"
          style={{ color: tocado ? "var(--text-primary)" : "var(--text-idle)" }}
        >
          {valor}
        </span>

        <button
          disabled={bloqueado}
          onClick={() => onCambio(1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--accent-default)",
            opacity: bloqueado ? 0.4 : 1,
          }}
        >
          <Plus
            className="h-[16px] w-[16px]"
            style={{ color: "var(--text-on-accent)" }}
          />
        </button>
      </div>
    </div>
  );
}

function TarjetaPartido({
  partido,
  marcador,
  bloqueado,
  config,
  onCambio,
}: {
  partido: PartidoQuiniela;
  marcador: Marcador;
  bloqueado: boolean;
  config: ConfigTorneo;
  onCambio: (lado: "local" | "visitante", delta: number) => void;
}) {
  const leg = etiquetaLeg(partido.leg);
  const meta = [
    horaLocal(partido.inicio_utc),
    leg && esIdaVuelta(config, partido.fase) ? leg : null,
    partido.sede,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="mb-2 rounded-xl bg-surface-card p-3"
      style={{ opacity: bloqueado ? 0.85 : 1 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate text-label-md text-text-secondary">{meta}</span>
        {bloqueado ? (
          <span
            className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-label-sm"
            style={{
              backgroundColor: "var(--surface-background)",
              color: "var(--text-secondary)",
            }}
          >
            <Lock className="h-[11px] w-[11px]" />
            Bloqueado
          </span>
        ) : (
          <span
            className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-label-sm"
            style={{
              backgroundColor: marcador.tocado
                ? "var(--feedback-success-surface)"
                : "var(--accent-subtle)",
              color: marcador.tocado
                ? "var(--feedback-success)"
                : "var(--accent-default)",
            }}
          >
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{
                backgroundColor: marcador.tocado
                  ? "var(--feedback-success)"
                  : "var(--accent-default)",
              }}
            />
            {marcador.tocado ? "Predicho" : "Pendiente"}
          </span>
        )}
      </div>

      <FilaEquipo
        equipo={partido.local}
        nombre={nombreEquipo(partido.local, partido.ref_local)}
        valor={marcador.local}
        tocado={marcador.tocado}
        bloqueado={bloqueado}
        onCambio={(delta) => onCambio("local", delta)}
      />
      <FilaEquipo
        equipo={partido.visitante}
        nombre={nombreEquipo(partido.visitante, partido.ref_visitante)}
        valor={marcador.visitante}
        tocado={marcador.tocado}
        bloqueado={bloqueado}
        onCambio={(delta) => onCambio("visitante", delta)}
      />
    </div>
  );
}

/** "Campeón, subcampeón y goleador", con solo los extras que el torneo tenga. */
function detalleExtras(config: ConfigTorneo) {
  const partes = [
    config.extras.campeon ? "campeón" : null,
    config.extras.subcampeon ? "subcampeón" : null,
    config.extras.goleador ? "goleador" : null,
  ].filter((p): p is string => p !== null);

  const texto =
    partes.length <= 1
      ? partes[0] ?? ""
      : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Puerta a una pantalla de predicción de todo el torneo (Top N, extras). */
function AccesoPrediccion({
  href,
  icono,
  titulo,
  detalle,
}: {
  href: string;
  icono: React.ReactNode;
  titulo: string;
  detalle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl bg-surface-card p-4"
    >
      <span
        className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "var(--accent-subtle)" }}
      >
        {icono}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-md leading-tight">{titulo}</span>
        <span className="mt-px block text-label-md text-text-secondary">
          {detalle}
        </span>
      </span>
      <ChevronRight
        className="h-[18px] w-[18px] flex-shrink-0"
        style={{ color: "var(--icons-secondary)" }}
      />
    </Link>
  );
}

export function QuinielaCliente({
  partidos,
  jornadas,
  usuarioId,
  torneoId,
  torneoSlug,
  config,
  ahoraServidor,
}: {
  partidos: PartidoQuiniela[];
  jornadas: Jornada[];
  usuarioId: string;
  torneoId: number;
  torneoSlug: string;
  config: ConfigTorneo;
  /** Hora del servidor al renderizar, para que SSR y cliente coincidan. */
  ahoraServidor: number;
}) {
  const [faseActiva, setFaseActiva] = useState(() =>
    calcularFaseActiva(partidos, config, ahoraServidor)
  );
  const [guardando, setGuardando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{
    tipo: "ok" | "error";
    texto: string;
  } | null>(null);

  const mostrarAviso = (tipo: "ok" | "error", texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 4000);
  };

  /*
   * Accesos a las pantallas de predicción de todo el torneo. Cada uno aparece
   * solo si el torneo lo declara: uno sin extras no debe mostrar la puerta a
   * una pantalla que no aplica.
   */
  const plazas = plazasClasificacion(config);
  const hayTop = Boolean(config.prediccionClasificacion.tipo && plazas);
  const hayExtras =
    config.extras.campeon || config.extras.subcampeon || config.extras.goleador;

  const bloqueRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const barraFasesRef = useRef<HTMLDivElement | null>(null);
  const chipFaseActivaRef = useRef<HTMLButtonElement | null>(null);

  const [marcadores, setMarcadores] = useState<MarcadorState>(() => {
    const estado: MarcadorState = {};
    for (const p of partidos) {
      const pred = p.predictions[0];
      estado[p.id] = pred
        ? {
            local: pred.marcador_local,
            visitante: pred.marcador_visitante,
            tocado: true,
          }
        : { local: 0, visitante: 0, tocado: false };
    }
    return estado;
  });

  /*
   * Arranca con la hora del servidor (así SSR e hidratación pintan lo mismo) y
   * se refresca cada medio minuto, para que una pestaña abierta durante horas
   * vaya bloqueando los partidos a medida que vencen sus deadlines.
   */
  const [ahora, setAhora] = useState(ahoraServidor);

  useEffect(() => {
    const id = setInterval(() => setAhora(ahoraMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cambiar = (
    partidoId: number,
    lado: "local" | "visitante",
    delta: number
  ) => {
    setMarcadores((prev) => {
      const actual = prev[partidoId];
      return {
        ...prev,
        [partidoId]: {
          ...actual,
          [lado]: Math.max(0, actual[lado] + delta),
          tocado: true,
        },
      };
    });
  };

  const guardarDia = async (clave: string, delDia: PartidoQuiniela[]) => {
    // Se revalida el deadline al guardar, no con el `ahora` del render: la
    // pestaña puede llevar horas abierta.
    const aGuardar = delDia
      .filter((p) => marcadores[p.id]?.tocado && !estaBloqueado(p, ahoraMs()))
      .map((p) => ({
        tournament_id: torneoId,
        usuario_id: usuarioId,
        match_id: p.id,
        marcador_local: marcadores[p.id].local,
        marcador_visitante: marcadores[p.id].visitante,
      }));

    if (aGuardar.length === 0) return;

    setGuardando(clave);
    const supabase = createClient();

    const { error } = await supabase
      .from("predictions")
      .upsert(aGuardar, { onConflict: "usuario_id,match_id" });

    let rechazados = 0;

    /*
     * La base rechaza predicciones de partidos con el deadline vencido, y un
     * upsert por lotes es todo o nada: si cae una fila, no se guarda ninguna.
     * Ante un fallo se reintenta fila por fila para que lo válido sí persista
     * y solo quede fuera lo que la base rechaza de verdad.
     */
    if (error) {
      const resultados = await Promise.all(
        aGuardar.map((fila) =>
          supabase
            .from("predictions")
            .upsert(fila, { onConflict: "usuario_id,match_id" })
        )
      );
      rechazados = resultados.filter((r) => r.error).length;
      // Si la base cerró partidos que el cliente creía abiertos, su reloj va
      // atrasado: se resincroniza para que la pantalla los bloquee.
      setAhora(ahoraMs());
    }

    setGuardando(null);

    const guardados = aGuardar.length - rechazados;

    if (guardados === 0) {
      mostrarAviso(
        "error",
        "No se pudo guardar: esos partidos ya están cerrados."
      );
      return;
    }

    mostrarAviso(
      rechazados > 0 ? "error" : "ok",
      rechazados > 0
        ? `Guardados ${guardados}. ${rechazados} ya estaban cerrados.`
        : "Guardado"
    );
  };

  // Bloques de la fase activa: una jornada por bloque, más uno final con los
  // partidos de la fase que todavía no cuelgan de ninguna jornada.
  const partidosFase = partidos.filter((p) => p.fase === faseActiva);
  const jornadasFase = jornadas.filter((j) => j.fase === faseActiva);
  const idsJornadaFase = new Set(jornadasFase.map((j) => j.id));

  const bloques: Bloque[] = jornadasFase
    .map((j) => ({
      clave: `jornada-${j.id}`,
      titulo: j.nombre ?? `Jornada ${j.numero ?? ""}`.trim(),
      estado: j.estado,
      fecha: j.fecha,
      partidos: partidosFase.filter((p) => p.gameday_id === j.id),
    }))
    .filter((b) => b.partidos.length > 0);

  const sueltos = partidosFase.filter(
    (p) => p.gameday_id == null || !idsJornadaFase.has(p.gameday_id)
  );

  if (sueltos.length > 0) {
    bloques.push({
      clave: "sin-jornada",
      titulo: etiquetaFase(faseActiva),
      estado: null,
      fecha: sueltos[0].inicio_utc,
      partidos: sueltos,
    });
  }

  // Centra el chip de la fase activa al entrar.
  useEffect(() => {
    const barra = barraFasesRef.current;
    const chip = chipFaseActivaRef.current;
    if (!barra || !chip) return;
    const offset = chip.offsetLeft - barra.clientWidth / 2 + chip.clientWidth / 2;
    barra.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
  }, []);

  // Lleva a la jornada relevante al entrar y al cambiar de fase.
  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const indice = bloques.findIndex((b) => {
      const referencia = b.fecha ?? b.partidos[0]?.inicio_utc ?? null;
      if (!referencia) return false;
      // `gamedays.fecha` es un DATE (sin hora); inicio_utc es un timestamp.
      const f = new Date(
        referencia.length === 10 ? `${referencia}T12:00:00` : referencia
      );
      f.setHours(0, 0, 0, 0);
      return f >= hoy;
    });

    /*
     * Solo se baja si hay jornadas por delante que saltarse. Cuando la
     * relevante ya es la primera —al arrancar el torneo— bajar hasta ella no
     * adelanta nada y esconde la cabecera y el acceso al Top N.
     */
    if (indice > 0) {
      const el = bloqueRefs.current[bloques[indice].clave];
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faseActiva]);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title="Quiniela"
        bar={
          <div className="relative -mx-5">
            <div
              ref={barraFasesRef}
              className="flex h-11 items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {config.fases.map((fase) => {
                const activa = fase === faseActiva;
                return (
                  <button
                    key={fase}
                    ref={activa ? chipFaseActivaRef : null}
                    onClick={() => setFaseActiva(fase)}
                    className="h-9 flex-shrink-0 rounded-full px-4 text-label-md"
                    style={{
                      backgroundColor: activa
                        ? "var(--accent-default)"
                        : "var(--surface-card)",
                      color: activa
                        ? "var(--text-on-accent)"
                        : "var(--text-tertiary)",
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
                background:
                  "linear-gradient(90deg, transparent, var(--background))",
              }}
            />
          </div>
        }
      />

      {(hayTop || hayExtras) && (
        <div className="mb-5 flex flex-col gap-3">
          {hayTop && (
            <AccesoPrediccion
              href={`/${torneoSlug}/quiniela/clasificados`}
              icono={
                <ListOrdered
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--icons-primary)" }}
                />
              }
              titulo={`Top ${plazas} de la fase de liga`}
              detalle="Predice quiénes clasifican directo"
            />
          )}

          {hayExtras && (
            <AccesoPrediccion
              href={`/${torneoSlug}/quiniela/extras`}
              icono={
                <Trophy
                  className="h-[18px] w-[18px]"
                  style={{ color: "var(--icons-primary)" }}
                />
              }
              titulo="Extras"
              detalle={detalleExtras(config)}
            />
          )}
        </div>
      )}

      {bloques.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No hay partidos en esta fase todavía.
        </p>
      ) : (
        bloques.map((bloque) => {
          const etiquetaEstado = bloque.estado
            ? ESTADOS_VISIBLES[bloque.estado]
            : null;

          // Subgrupos por día: una jornada de Champions abarca varios días.
          const dias: {
            clave: string;
            titulo: string;
            partidos: PartidoQuiniela[];
          }[] = [];
          for (const p of bloque.partidos) {
            const clave = claveDia(p.inicio_utc);
            const ultimo = dias[dias.length - 1];
            if (!ultimo || ultimo.clave !== clave) {
              dias.push({ clave, titulo: tituloDia(p.inicio_utc), partidos: [p] });
            } else {
              ultimo.partidos.push(p);
            }
          }

          return (
            <div
              key={bloque.clave}
              ref={(el) => {
                bloqueRefs.current[bloque.clave] = el;
              }}
              className="mb-6 scroll-mt-[var(--layout-content-offset-nav)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-heading-md">
                  {bloque.titulo}
                  {etiquetaEstado && (
                    <span
                      className="rounded-full px-2 py-px text-label-sm"
                      style={{
                        backgroundColor: "var(--surface-background)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {etiquetaEstado}
                    </span>
                  )}
                </span>
                <span className="text-label-sm text-text-secondary">
                  {bloque.partidos.length}{" "}
                  {bloque.partidos.length === 1 ? "partido" : "partidos"}
                </span>
              </div>

              {dias.map((dia) => {
                /*
                 * El botón es por día, no por jornada: los partidos de cada
                 * día cierran en momentos distintos, y un único botón mezclaba
                 * partidos ya cerrados con otros todavía abiertos.
                 */
                const claveDiaCompleta = `${bloque.clave}/${dia.clave}`;
                const hayAbiertos = dia.partidos.some(
                  (p) => !estaBloqueado(p, ahora)
                );
                const hayGuardable = dia.partidos.some(
                  (p) => marcadores[p.id]?.tocado && !estaBloqueado(p, ahora)
                );
                const guardandoEste = guardando === claveDiaCompleta;

                return (
                  <div key={dia.clave} className="mb-4">
                    <div className="mb-2 text-body-sm text-text-secondary">
                      {dia.titulo}
                    </div>
                    {dia.partidos.map((p) => (
                      <TarjetaPartido
                        key={p.id}
                        partido={p}
                        marcador={marcadores[p.id]}
                        bloqueado={estaBloqueado(p, ahora)}
                        config={config}
                        onCambio={(lado, delta) => cambiar(p.id, lado, delta)}
                      />
                    ))}

                    {hayAbiertos && (
                      <button
                        disabled={!hayGuardable || guardandoEste}
                        onClick={() =>
                          guardarDia(claveDiaCompleta, dia.partidos)
                        }
                        className="mt-1 w-full rounded-lg py-3 text-center text-action-button"
                        style={{
                          backgroundColor: "var(--accent-default)",
                          color: "var(--text-on-accent)",
                          opacity: !hayGuardable || guardandoEste ? 0.4 : 1,
                        }}
                      >
                        {guardandoEste ? "Guardando..." : "Guardar"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })
      )}

      {aviso && (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex max-w-[calc(100%-36px)] -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-center text-body-md-bold shadow-lg"
          style={
            aviso.tipo === "ok"
              ? {
                  backgroundColor: "var(--feedback-success)",
                  color: "var(--text-on-accent)",
                }
              : {
                  backgroundColor: "var(--feedback-danger-surface)",
                  color: "var(--feedback-danger)",
                }
          }
        >
          {aviso.tipo === "ok" && <Check className="h-[18px] w-[18px]" />}
          {aviso.texto}
        </div>
      )}
    </main>
  );
}
