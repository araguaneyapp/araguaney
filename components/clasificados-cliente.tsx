"use client";

import { useState, useEffect, useMemo } from "react";
import { Check, Lock, Search, X } from "lucide-react";
import { Escudo, type EquipoEscudo } from "@/components/escudo";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";
import { coincide } from "@/lib/texto";
import { ahoraMs } from "@/lib/tiempo";

export type EquipoOpcion = EquipoEscudo & { id: number };

export type PrediccionClasificacion = {
  equipo_id: number;
  posicion: number;
};

function fechaLarga(iso: string) {
  const f = new Date(iso);
  const dia = f.toLocaleDateString("es", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const hora = f.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
  return `${dia.charAt(0).toUpperCase() + dia.slice(1)}, ${hora}`;
}

function ordinal(posicion: number) {
  return `${posicion}º`;
}

function HojaSelector({
  equipos,
  posicion,
  ocupados,
  onElegir,
  onCerrar,
}: {
  equipos: EquipoOpcion[];
  posicion: number;
  /** equipo_id -> posición que ya ocupa en otra casilla. */
  ocupados: Map<number, number>;
  onElegir: (equipoId: number) => void;
  onCerrar: () => void;
}) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(
    () => equipos.filter((e) => coincide(busqueda, [e.nombre])),
    [equipos, busqueda]
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0"
        style={{ backgroundColor: "var(--overlay-scrim)", opacity: 0.6 }}
      />

      <div
        className="relative mb-20 flex max-h-[calc(78dvh-5rem)] flex-col rounded-t-2xl bg-surface-card"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-heading-md">Equipo para el {ordinal(posicion)}</h2>
          <button onClick={onCerrar} className="flex items-center">
            <X className="h-5 w-5" style={{ color: "var(--icons-secondary)" }} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ backgroundColor: "var(--surface-input)" }}
          >
            <Search
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "var(--icons-secondary)" }}
            />
            <input
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar equipo"
              className="w-full bg-transparent text-body-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {filtrados.length === 0 ? (
            <p className="py-6 text-center text-body-sm text-text-secondary">
              Ningún equipo coincide.
            </p>
          ) : (
            filtrados.map((equipo) => {
              const ocupa = ocupados.get(equipo.id);
              // El equipo de esta misma casilla sí se puede volver a elegir.
              const bloqueado = ocupa != null && ocupa !== posicion;

              return (
                <button
                  key={equipo.id}
                  disabled={bloqueado}
                  onClick={() => onElegir(equipo.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left"
                  style={{ opacity: bloqueado ? 0.4 : 1 }}
                >
                  <Escudo equipo={equipo} size={24} />
                  <span className="min-w-0 flex-1 truncate text-body-sm">
                    {equipo.nombre}
                  </span>
                  {ocupa != null && (
                    <span
                      className="flex-shrink-0 rounded-full px-2 py-px text-label-xs"
                      style={{
                        backgroundColor: "var(--surface-input)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {ordinal(ocupa)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function Casilla({
  posicion,
  equipo,
  cerrado,
  onAbrir,
  onVaciar,
}: {
  posicion: number;
  equipo: EquipoOpcion | null;
  cerrado: boolean;
  onAbrir: () => void;
  onVaciar: () => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl bg-surface-card p-3">
      <span
        className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-full text-label-md-bold"
        style={{
          backgroundColor: equipo
            ? "var(--accent-default)"
            : "var(--surface-background)",
          color: equipo ? "var(--text-on-accent)" : "var(--text-secondary)",
        }}
      >
        {posicion}
      </span>

      <button
        disabled={cerrado}
        onClick={onAbrir}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {equipo ? (
          <>
            <Escudo equipo={equipo} size={24} />
            <span className="truncate text-body-md">{equipo.nombre}</span>
          </>
        ) : (
          <span className="text-body-sm" style={{ color: "var(--text-idle)" }}>
            {cerrado ? "Sin elegir" : "Elegir equipo"}
          </span>
        )}
      </button>

      {equipo && !cerrado && (
        <button
          onClick={onVaciar}
          aria-label={`Quitar del ${ordinal(posicion)}`}
          className="flex flex-shrink-0 items-center"
        >
          <X className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
        </button>
      )}
    </div>
  );
}

export function ClasificadosCliente({
  equipos,
  predicciones,
  usuarioId,
  torneoId,
  torneoSlug,
  plazas,
  cierre,
  ahoraServidor,
}: {
  equipos: EquipoOpcion[];
  predicciones: PrediccionClasificacion[];
  usuarioId: string;
  torneoId: number;
  torneoSlug: string;
  plazas: number;
  /** Instante en que cierra la predicción. Null = sin fecha conocida. */
  cierre: string | null;
  ahoraServidor: number;
}) {
  const [slots, setSlots] = useState<(number | null)[]>(() => {
    const inicial: (number | null)[] = Array(plazas).fill(null);
    for (const p of predicciones) {
      if (p.posicion >= 1 && p.posicion <= plazas) {
        inicial[p.posicion - 1] = p.equipo_id;
      }
    }
    return inicial;
  });

  const [abierto, setAbierto] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
    null
  );

  /*
   * Misma mecánica que la Quiniela: se arranca con la hora del servidor para
   * que SSR e hidratación pinten lo mismo, y se refresca sola para que una
   * pestaña abierta durante horas acabe bloqueándose al llegar el cierre.
   */
  const [ahora, setAhora] = useState(ahoraServidor);
  useEffect(() => {
    const id = setInterval(() => setAhora(ahoraMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cerrado = cierre != null && new Date(cierre).getTime() <= ahora;

  const porId = useMemo(
    () => new Map(equipos.map((e) => [e.id, e])),
    [equipos]
  );

  const ocupados = useMemo(() => {
    const mapa = new Map<number, number>();
    slots.forEach((id, i) => {
      if (id != null) mapa.set(id, i + 1);
    });
    return mapa;
  }, [slots]);

  const elegidos = slots.filter((id) => id != null).length;

  const mostrarAviso = (tipo: "ok" | "error", texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 4000);
  };

  const asignar = (indice: number, equipoId: number) => {
    setSlots((prev) => {
      const copia = [...prev];
      copia[indice] = equipoId;
      return copia;
    });
    setSucio(true);
    setAbierto(null);
  };

  const vaciar = (indice: number) => {
    setSlots((prev) => {
      const copia = [...prev];
      copia[indice] = null;
      return copia;
    });
    setSucio(true);
  };

  const guardar = async () => {
    if (cerrado) return;

    const filas = slots
      .map((equipoId, i) =>
        equipoId == null
          ? null
          : {
              tournament_id: torneoId,
              usuario_id: usuarioId,
              equipo_id: equipoId,
              posicion: i + 1,
            }
      )
      .filter((f): f is NonNullable<typeof f> => f !== null);

    setGuardando(true);
    const supabase = createClient();

    /*
     * Borrar y reinsertar, no upsert: la tabla tiene unique en
     * (usuario_id, equipo_id) y en (usuario_id, posicion), así que cualquier
     * permutación de la selección choca con una de las dos a mitad del lote.
     *
     * Si la base rechaza el borrado, la selección anterior sigue intacta y no
     * se intenta insertar nada.
     */
    const { error: errorBorrado } = await supabase
      .from("standings_predictions")
      .delete()
      .eq("tournament_id", torneoId)
      .eq("usuario_id", usuarioId);

    if (errorBorrado) {
      setGuardando(false);
      setAhora(ahoraMs());
      mostrarAviso(
        "error",
        "No se pudo guardar: la predicción ya está cerrada."
      );
      return;
    }

    if (filas.length === 0) {
      setGuardando(false);
      setSucio(false);
      mostrarAviso("ok", "Selección vaciada");
      return;
    }

    const { error } = await supabase
      .from("standings_predictions")
      .insert(filas);

    setGuardando(false);

    if (error) {
      setAhora(ahoraMs());
      /*
       * El borrado pasó y la inserción no: la selección guardada se perdió,
       * pero la de pantalla sigue en pie. Hay que decirlo tal cual en vez de
       * un "error al guardar" que haría creer que no se tocó nada.
       */
      mostrarAviso(
        "error",
        "No se guardó y se perdió lo anterior. Vuelve a intentarlo."
      );
      return;
    }

    setSucio(false);
    mostrarAviso("ok", "Guardado");
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title={`Top ${plazas}`}
        backHref={`/${torneoSlug}/quiniela/extras`}
        right={
          <span className="text-label-md text-text-secondary">
            {elegidos} de {plazas}
          </span>
        }
      />

      {cerrado ? (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-label-md"
          style={{
            backgroundColor: "var(--feedback-danger-surface)",
            color: "var(--feedback-danger)",
          }}
        >
          <Lock className="h-4 w-4 flex-shrink-0" />
          La predicción del Top {plazas} ya está cerrada.
        </div>
      ) : (
        cierre && (
          <div className="mb-4 rounded-xl bg-surface-card px-4 py-3">
            <div className="text-label-md text-text-secondary">
              Puedes editar hasta
            </div>
            <div className="text-body-md-bold">{fechaLarga(cierre)}</div>
          </div>
        )
      )}

      <p className="mb-4 text-body-sm text-text-secondary">
        Elige los {plazas} equipos que crees que terminarán arriba en la fase de
        liga, en orden.
      </p>

      {slots.map((equipoId, i) => (
        <Casilla
          key={i}
          posicion={i + 1}
          equipo={equipoId != null ? porId.get(equipoId) ?? null : null}
          cerrado={cerrado}
          onAbrir={() => setAbierto(i)}
          onVaciar={() => vaciar(i)}
        />
      ))}

      {!cerrado && (
        <button
          disabled={!sucio || guardando}
          onClick={guardar}
          className="mt-3 w-full rounded-lg py-3 text-center text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: !sucio || guardando ? 0.4 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      )}

      {abierto != null && (
        <HojaSelector
          equipos={equipos}
          posicion={abierto + 1}
          ocupados={ocupados}
          onElegir={(equipoId) => asignar(abierto, equipoId)}
          onCerrar={() => setAbierto(null)}
        />
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
