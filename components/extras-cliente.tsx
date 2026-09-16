"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Check, Lock, Medal, Search, Star, Trophy, Volleyball, X } from "lucide-react";
import { Escudo, type EquipoEscudo } from "@/components/escudo";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";
import { coincide } from "@/lib/texto";
import { ahoraMs } from "@/lib/tiempo";
import { useVisualViewport } from "@/lib/use-visual-viewport";

export type EquipoOpcion = EquipoEscudo & { id: number };

export type JugadorOpcion = {
  id: number;
  nombre: string;
  nombre_corto: string | null;
  posicion: string | null;
  equipo: EquipoEscudo | null;
};

export type ExtrasGuardados = {
  campeon_id: number | null;
  subcampeon_id: number | null;
  goleador_id: number | null;
  goleador_nombre: string | null;
};

/** Qué extras declara el torneo. Una sección en false no se pinta. */
export type SeccionesExtras = {
  campeon: boolean;
  subcampeon: boolean;
  goleador: boolean;
};

/** Predicción del Top N: cuántas plazas y qué equipo va en cada una. */
export type TopOpcion = {
  plazas: number;
  seleccionados: (EquipoOpcion | null)[];
};

type Ranura = "campeon" | "subcampeon" | "goleador";

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

/**
 * Hoja inferior con buscador, igual que la del Top 8.
 *
 * La hoja solo pone el marco y la caja de búsqueda; quien la usa decide qué
 * lista pinta y cómo compara, y recibe la consulta tal como se escribió.
 */
function Hoja({
  titulo,
  placeholder,
  onCerrar,
  children,
}: {
  titulo: string;
  placeholder: string;
  onCerrar: () => void;
  children: (consulta: string) => React.ReactNode;
}) {
  const [busqueda, setBusqueda] = useState("");
  const viewport = useVisualViewport();

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex h-dvh flex-col justify-end"
      style={
        viewport ? { top: viewport.offsetTop, height: viewport.height } : undefined
      }
    >
      <button
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0"
        style={{ backgroundColor: "var(--overlay-scrim)", opacity: 0.6 }}
      />

      <div
        className="relative mb-20 flex max-h-[calc(78%-5rem)] flex-col rounded-t-2xl bg-surface-card"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-heading-md">{titulo}</h2>
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
              placeholder={placeholder}
              className="w-full bg-transparent text-body-sm outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6">
          {children(busqueda)}
        </div>
      </div>
    </div>
  );
}

function SinResultados({ texto }: { texto: string }) {
  return (
    <p className="py-6 text-center text-body-sm text-text-secondary">{texto}</p>
  );
}

function Insignia({ texto }: { texto: string }) {
  return (
    <span
      className="flex-shrink-0 rounded-full px-2 py-px text-label-xs"
      style={{
        backgroundColor: "var(--surface-input)",
        color: "var(--text-secondary)",
      }}
    >
      {texto}
    </span>
  );
}

function ListaEquipos({
  equipos,
  busqueda,
  seleccionado,
  ocupado,
  onElegir,
}: {
  equipos: EquipoOpcion[];
  busqueda: string;
  seleccionado: number | null;
  /** Equipo tomado por la otra ranura: campeón y subcampeón son distintos. */
  ocupado: { id: number; etiqueta: string } | null;
  onElegir: (id: number) => void;
}) {
  const filtrados = equipos.filter((e) => coincide(busqueda, [e.nombre]));

  if (filtrados.length === 0) {
    return <SinResultados texto="Ningún equipo coincide." />;
  }

  return (
    <>
      {filtrados.map((equipo) => {
        const bloqueado = ocupado?.id === equipo.id;

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
            {bloqueado && <Insignia texto={ocupado.etiqueta} />}
            {equipo.id === seleccionado && (
              <Check
                className="h-4 w-4 flex-shrink-0"
                style={{ color: "var(--accent-default)" }}
              />
            )}
          </button>
        );
      })}
    </>
  );
}

function ListaJugadores({
  jugadores,
  busqueda,
  seleccionado,
  onElegir,
}: {
  jugadores: JugadorOpcion[];
  busqueda: string;
  seleccionado: number | null;
  onElegir: (jugador: JugadorOpcion) => void;
}) {
  const filtrados = jugadores.filter((j) =>
    coincide(busqueda, [j.nombre, j.nombre_corto])
  );

  /*
   * "No hay plantilla" y "tu búsqueda no coincide" son problemas distintos y
   * se dicen distinto: con el mismo mensaje, una tabla vacía se lee como si
   * el buscador estuviera roto.
   */
  if (jugadores.length === 0) {
    return <SinResultados texto="Todavía no hay jugadores cargados en este torneo." />;
  }

  if (filtrados.length === 0) {
    return <SinResultados texto="No se encontró ningún jugador." />;
  }

  return (
    <>
      {filtrados.map((jugador) => (
        <button
          key={jugador.id}
          onClick={() => onElegir(jugador)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left"
        >
          <Escudo equipo={jugador.equipo} size={24} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm">{jugador.nombre}</span>
            {jugador.equipo && (
              <span className="mt-px block truncate text-label-md text-text-secondary">
                {jugador.equipo.nombre}
              </span>
            )}
          </span>
          {jugador.id === seleccionado && (
            <Check
              className="h-4 w-4 flex-shrink-0"
              style={{ color: "var(--accent-default)" }}
            />
          )}
        </button>
      ))}
    </>
  );
}

/** Un círculo con el escudo elegido, o vacío/punteado si esa plaza no tiene equipo. */
function CirculoTop({ equipo }: { equipo: EquipoOpcion | null }) {
  if (!equipo) {
    return (
      <span
        className="h-6 w-6 flex-shrink-0 rounded-full"
        style={{ border: "1px dashed var(--icons-secondary)" }}
      />
    );
  }
  return <Escudo equipo={equipo} size={24} />;
}

/**
 * Tarjeta del Top N: a diferencia de Campeón/Subcampeón/Goleador no elige
 * nada acá mismo, navega a la pantalla de las 8 casillas. La vista previa
 * (círculos llenos/vacíos en orden) evita repetir 8 nombres de equipo en un
 * espacio pensado para uno solo.
 */
function TarjetaTop({
  torneoSlug,
  top,
}: {
  torneoSlug: string;
  top: TopOpcion;
}) {
  const elegidos = top.seleccionados.filter((e) => e != null).length;

  return (
    <Link
      href={`/${torneoSlug}/quiniela/clasificados`}
      className="mb-3 block rounded-xl bg-surface-card p-4"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Star
            className="h-[18px] w-[18px] flex-shrink-0"
            style={{ color: "var(--icons-secondary)" }}
          />
          <span className="text-label-md-caps text-text-secondary">
            Top {top.plazas}
          </span>
        </div>
        <span className="text-label-md text-text-secondary">
          {elegidos} de {top.plazas} elegidos
        </span>
      </div>

      {elegidos === 0 ? (
        <span className="text-body-sm" style={{ color: "var(--text-idle)" }}>
          Elegir equipos
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {top.seleccionados.map((equipo, i) => (
            <CirculoTop key={i} equipo={equipo} />
          ))}
        </div>
      )}
    </Link>
  );
}

function Tarjeta({
  titulo,
  icono,
  vacio,
  cerrado,
  hayValor,
  onAbrir,
  onVaciar,
  children,
}: {
  titulo: string;
  icono: React.ReactNode;
  /** Texto cuando no hay nada elegido y la pantalla sigue abierta. */
  vacio: string;
  cerrado: boolean;
  hayValor: boolean;
  onAbrir: () => void;
  onVaciar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 rounded-xl bg-surface-card p-4">
      <div className="mb-3 flex items-center gap-2">
        {icono}
        <span className="text-label-md-caps text-text-secondary">{titulo}</span>
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={cerrado}
          onClick={onAbrir}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          {hayValor ? (
            children
          ) : (
            <span className="text-body-sm" style={{ color: "var(--text-idle)" }}>
              {cerrado ? "Sin elegir" : vacio}
            </span>
          )}
        </button>

        {hayValor && !cerrado && (
          <button
            onClick={onVaciar}
            aria-label={`Quitar ${titulo.toLowerCase()}`}
            className="flex flex-shrink-0 items-center"
          >
            <X className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export function ExtrasCliente({
  equipos,
  jugadores,
  extras,
  secciones,
  top,
  usuarioId,
  torneoId,
  torneoSlug,
  cierre,
  ahoraServidor,
}: {
  equipos: EquipoOpcion[];
  jugadores: JugadorOpcion[];
  /** Lo ya guardado. Null = el usuario todavía no tiene fila. */
  extras: ExtrasGuardados | null;
  secciones: SeccionesExtras;
  /** Null = el torneo no declara predicción de Top N. */
  top: TopOpcion | null;
  usuarioId: string;
  torneoId: number;
  torneoSlug: string;
  /** Instante en que cierran los extras. Null = sin fecha conocida. */
  cierre: string | null;
  ahoraServidor: number;
}) {
  const [campeonId, setCampeonId] = useState<number | null>(
    extras?.campeon_id ?? null
  );
  const [subcampeonId, setSubcampeonId] = useState<number | null>(
    extras?.subcampeon_id ?? null
  );
  /*
   * El goleador se lleva por partida doble: el id apunta a `players` y el
   * nombre es la copia legible. Cuando la API recargue la plantilla los ids
   * pueden cambiar, y entonces el nombre es lo único que queda en pie.
   */
  const [goleadorId, setGoleadorId] = useState<number | null>(
    extras?.goleador_id ?? null
  );
  const [goleadorNombre, setGoleadorNombre] = useState<string | null>(
    extras?.goleador_nombre ?? null
  );

  const [abierto, setAbierto] = useState<Ranura | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sucio, setSucio] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(
    null
  );

  /*
   * Misma mecánica que la Quiniela y el Top 8: se arranca con la hora del
   * servidor para que SSR e hidratación pinten lo mismo, y se refresca sola
   * para que una pestaña abierta durante horas acabe bloqueándose al llegar
   * el cierre.
   */
  const [ahora, setAhora] = useState(ahoraServidor);
  useEffect(() => {
    const id = setInterval(() => setAhora(ahoraMs()), 30_000);
    return () => clearInterval(id);
  }, []);

  const cerrado = cierre != null && new Date(cierre).getTime() <= ahora;

  const equipoPorId = useMemo(
    () => new Map(equipos.map((e) => [e.id, e])),
    [equipos]
  );
  const jugadorPorId = useMemo(
    () => new Map(jugadores.map((j) => [j.id, j])),
    [jugadores]
  );

  const campeon = campeonId != null ? equipoPorId.get(campeonId) ?? null : null;
  const subcampeon =
    subcampeonId != null ? equipoPorId.get(subcampeonId) ?? null : null;
  const goleador =
    goleadorId != null ? jugadorPorId.get(goleadorId) ?? null : null;

  const activas = [
    top != null,
    secciones.campeon,
    secciones.subcampeon,
    secciones.goleador,
  ].filter(Boolean).length;

  const elegidas = [
    top != null && top.seleccionados.every((e) => e != null),
    secciones.campeon && campeonId != null,
    secciones.subcampeon && subcampeonId != null,
    secciones.goleador && (goleadorId != null || goleadorNombre != null),
  ].filter(Boolean).length;

  const mostrarAviso = (tipo: "ok" | "error", texto: string) => {
    setAviso({ tipo, texto });
    setTimeout(() => setAviso(null), 4000);
  };

  const elegirCampeon = (id: number) => {
    setCampeonId(id);
    setSucio(true);
    setAbierto(null);
  };

  const elegirSubcampeon = (id: number) => {
    setSubcampeonId(id);
    setSucio(true);
    setAbierto(null);
  };

  const elegirGoleador = (jugador: JugadorOpcion) => {
    setGoleadorId(jugador.id);
    setGoleadorNombre(jugador.nombre);
    setSucio(true);
    setAbierto(null);
  };

  const vaciarGoleador = () => {
    setGoleadorId(null);
    setGoleadorNombre(null);
    setSucio(true);
  };

  const guardar = async () => {
    if (cerrado) return;

    /*
     * Solo se mandan las columnas de las secciones que el torneo declara: en
     * un upsert de PostgREST una columna ausente conserva su valor previo, así
     * que un torneo sin goleador nunca pisa el goleador de otro.
     */
    const fila: Record<string, unknown> = {
      usuario_id: usuarioId,
      tournament_id: torneoId,
    };
    if (secciones.campeon) fila.campeon_id = campeonId;
    if (secciones.subcampeon) fila.subcampeon_id = subcampeonId;
    if (secciones.goleador) {
      fila.goleador_id = goleadorId;
      fila.goleador_nombre = goleadorNombre;
    }

    setGuardando(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("special_predictions")
      .upsert(fila, { onConflict: "usuario_id,tournament_id" })
      .select("id");

    setGuardando(false);

    /*
     * El upsert es un solo statement: si la policy del cierre lo rechaza no
     * queda nada a medias, la fila guardada sigue como estaba.
     *
     * Ese rechazo llega de dos formas distintas y hay que mirar las dos: un
     * 42501 cuando la fila se inserta, y un update que no alcanza ninguna
     * fila y vuelve vacío sin error. Un fallo de red, en cambio, no es un
     * cierre y merece otro mensaje.
     */
    if (error || (data?.length ?? 0) === 0) {
      setAhora(ahoraMs());
      const porCierre = !error || error.code === "42501";
      mostrarAviso(
        "error",
        porCierre
          ? "No se pudo guardar: los extras ya están cerrados."
          : "No se pudo guardar. Vuelve a intentarlo."
      );
      return;
    }

    setSucio(false);
    mostrarAviso("ok", "Guardado");
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title="Extras"
        backHref={`/${torneoSlug}/quiniela`}
        right={
          <span className="text-label-md text-text-secondary">
            {elegidas} de {activas}
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
          Las predicciones extras ya están cerradas.
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
        Predicciones de todo el torneo. Puedes guardar solo las que tengas
        decididas y completar el resto más adelante.
      </p>

      {top && <TarjetaTop torneoSlug={torneoSlug} top={top} />}

      {secciones.campeon && (
        <Tarjeta
          titulo="Campeón"
          icono={
            <Trophy
              className="h-[18px] w-[18px] flex-shrink-0"
              style={{ color: "var(--icons-secondary)" }}
            />
          }
          vacio="Elegir equipo"
          cerrado={cerrado}
          hayValor={campeon != null}
          onAbrir={() => setAbierto("campeon")}
          onVaciar={() => {
            setCampeonId(null);
            setSucio(true);
          }}
        >
          <Escudo equipo={campeon} size={24} />
          <span className="truncate text-body-md">{campeon?.nombre}</span>
        </Tarjeta>
      )}

      {secciones.subcampeon && (
        <Tarjeta
          titulo="Subcampeón"
          icono={
            <Medal
              className="h-[18px] w-[18px] flex-shrink-0"
              style={{ color: "var(--icons-secondary)" }}
            />
          }
          vacio="Elegir equipo"
          cerrado={cerrado}
          hayValor={subcampeon != null}
          onAbrir={() => setAbierto("subcampeon")}
          onVaciar={() => {
            setSubcampeonId(null);
            setSucio(true);
          }}
        >
          <Escudo equipo={subcampeon} size={24} />
          <span className="truncate text-body-md">{subcampeon?.nombre}</span>
        </Tarjeta>
      )}

      {secciones.goleador && (
        <Tarjeta
          titulo="Goleador"
          icono={
            <Volleyball
              className="h-[18px] w-[18px] flex-shrink-0"
              style={{ color: "var(--icons-secondary)" }}
            />
          }
          vacio="Buscar jugador"
          cerrado={cerrado}
          hayValor={goleador != null || goleadorNombre != null}
          onAbrir={() => setAbierto("goleador")}
          onVaciar={vaciarGoleador}
        >
          {goleador ? (
            <>
              <Escudo equipo={goleador.equipo} size={24} />
              <span className="min-w-0">
                <span className="block truncate text-body-md">
                  {goleador.nombre}
                </span>
                {goleador.equipo && (
                  <span className="mt-px block truncate text-label-md text-text-secondary">
                    {goleador.equipo.nombre}
                  </span>
                )}
              </span>
            </>
          ) : (
            /*
             * El id guardado ya no está en `players` (plantilla recargada
             * desde la API). El nombre de respaldo es justo para esto: se
             * muestra tal cual, sin escudo, y sigue siendo editable.
             */
            <span className="truncate text-body-md">{goleadorNombre}</span>
          )}
        </Tarjeta>
      )}

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

      {abierto === "campeon" && (
        <Hoja
          titulo="Campeón"
          placeholder="Buscar equipo"
          onCerrar={() => setAbierto(null)}
        >
          {(busqueda) => (
            <ListaEquipos
              equipos={equipos}
              busqueda={busqueda}
              seleccionado={campeonId}
              ocupado={
                subcampeonId != null
                  ? { id: subcampeonId, etiqueta: "Subcampeón" }
                  : null
              }
              onElegir={elegirCampeon}
            />
          )}
        </Hoja>
      )}

      {abierto === "subcampeon" && (
        <Hoja
          titulo="Subcampeón"
          placeholder="Buscar equipo"
          onCerrar={() => setAbierto(null)}
        >
          {(busqueda) => (
            <ListaEquipos
              equipos={equipos}
              busqueda={busqueda}
              seleccionado={subcampeonId}
              ocupado={
                campeonId != null
                  ? { id: campeonId, etiqueta: "Campeón" }
                  : null
              }
              onElegir={elegirSubcampeon}
            />
          )}
        </Hoja>
      )}

      {abierto === "goleador" && (
        <Hoja
          titulo="Goleador del torneo"
          placeholder="Buscar jugador"
          onCerrar={() => setAbierto(null)}
        >
          {(busqueda) => (
            <ListaJugadores
              jugadores={jugadores}
              busqueda={busqueda}
              seleccionado={goleadorId}
              onElegir={elegirGoleador}
            />
          )}
        </Hoja>
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
