import { ChevronDown, ChevronUp, Star } from "lucide-react";

/**
 * Bloque de pronósticos de un partido, compartido por Partidos y
 * Eliminatorias. Vive aparte porque las dos pantallas lo muestran igual y
 * antes estaba duplicado casi línea por línea.
 *
 * No conoce el tipo `Partido` de ninguna de las dos: recibe solo el marcador
 * real contra el que se juzga cada pronóstico.
 */

export type Pronostico = {
  usuario_id: string;
  nombre: string;
  marcador_local: number;
  marcador_visitante: number;
  points_earned: number;
  llanero_solitario: boolean;
};

/** Marcador real del partido, ya confirmado como no nulo por quien llama. */
export type Resultado = { local: number; visitante: number };

function inicial(nombre: string) {
  return nombre.trim().charAt(0).toUpperCase();
}

function motivoPuntaje(pron: Pronostico, resultado: Resultado): string {
  const { local: ml, visitante: mv } = resultado;
  const exacto = pron.marcador_local === ml && pron.marcador_visitante === mv;
  const realEmpate = ml === mv;
  const predEmpate = pron.marcador_local === pron.marcador_visitante;
  const aciertaGanador =
    (ml > mv && pron.marcador_local > pron.marcador_visitante) ||
    (ml < mv && pron.marcador_local < pron.marcador_visitante);

  if (exacto && !realEmpate)
    return pron.llanero_solitario ? "Exacto + llanero" : "Marcador exacto";
  if (exacto && realEmpate)
    return pron.llanero_solitario ? "Empate exacto + llanero" : "Empate exacto";
  if (!realEmpate && aciertaGanador) return "Acertó ganador";
  if (realEmpate && predEmpate) return "Acertó empate";
  return "No acertó";
}

function FilaPronostico({
  pron,
  esUsuario,
  resultado,
}: {
  pron: Pronostico;
  esUsuario: boolean;
  resultado: Resultado;
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
        backgroundColor: esUsuario
          ? "var(--accent-subtle)"
          : "var(--surface-background)",
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
              style={{
                backgroundColor: "var(--accent-default)",
                color: "var(--text-on-accent)",
              }}
            >
              Tú
            </span>
          )}
          {pron.llanero_solitario && (
            <span
              className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-px text-label-xs"
              style={{
                backgroundColor: "var(--surface-background)",
                color: "var(--accent-default)",
              }}
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
          {motivoPuntaje(pron, resultado)}
        </div>
      </div>
    </div>
  );
}

export function DetallePronosticos({
  pronosticos,
  resultado,
  usuarioId,
  /** Rótulo del bloque. En una llave sirve para separar ida de vuelta. */
  titulo = "Pronósticos",
}: {
  pronosticos: Pronostico[];
  resultado: Resultado;
  usuarioId: string;
  titulo?: string;
}) {
  const ordenados = [...pronosticos].sort(
    (a, b) => b.points_earned - a.points_earned
  );

  return (
    <div className="mt-3">
      <div className="mb-3 flex items-center justify-between">
        <span
          className="text-label-md-bold"
          style={{ color: "var(--accent-default)" }}
        >
          {titulo}
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
            resultado={resultado}
          />
        ))
      )}
    </div>
  );
}

export function BotonDetalle({ abierta }: { abierta: boolean }) {
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
