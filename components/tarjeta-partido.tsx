import { Escudo, type EquipoEscudo } from "@/components/escudo";

export type MarcadorPartido = { local: number; visitante: number };

/**
 * Card de partido, compartida por Partidos y Eliminatorias.
 *
 * Es presentacional: no sabe de llaves ni de fases. Quien la usa decide qué
 * va en la meta, qué pill mostrar sobre el marcador y a qué equipo atenuar
 * (en Partidos es el perdedor del partido; en Eliminatorias, el eliminado de
 * la llave, que no siempre es el mismo).
 */
export function TarjetaPartido({
  meta,
  finalizado,
  local,
  visitante,
  nombreLocal,
  nombreVisitante,
  marcador,
  hora,
  detalleInstancia,
  pill = null,
  atenuarLocal = false,
  atenuarVisitante = false,
  destacada = false,
  children,
}: {
  meta: string;
  finalizado: boolean;
  local: EquipoEscudo | null;
  visitante: EquipoEscudo | null;
  nombreLocal: string;
  nombreVisitante: string;
  /** Null mientras no haya resultado: en su lugar se muestra la hora. */
  marcador: MarcadorPartido | null;
  hora: string;
  detalleInstancia: { marcador: string; etiqueta: string } | null;
  /** Contexto sobre el marcador, ej. "Partido Ida" o "Global 3-2". */
  pill?: string | null;
  atenuarLocal?: boolean;
  atenuarVisitante?: boolean;
  destacada?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="mb-2 rounded-xl bg-surface-card p-3"
      style={{
        border: destacada
          ? "1px solid var(--accent-default)"
          : "1px solid transparent",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="truncate text-label-md text-text-secondary">
          {meta}
        </span>
        {finalizado && (
          <span className="flex-shrink-0 pl-2 text-label-sm text-feedback-success">
            Finalizado
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div
          className="flex min-w-0 flex-1 items-center gap-2"
          style={{ opacity: atenuarLocal ? 0.45 : 1 }}
        >
          <Escudo equipo={local} size={20} />
          <span className="truncate text-body-sm">{nombreLocal}</span>
        </div>

        {/*
          Las medidas de la pill salen de los tokens del DS por variable CSS,
          no por clases de Tailwind: `--spacing-px` son 2px y el `py-px` de
          Tailwind es 1px, así que no son intercambiables.
        */}
        <div
          className="flex flex-shrink-0 flex-col items-center"
          style={{ gap: "var(--spacing-px)" }}
        >
          {pill && (
            <span
              className="whitespace-nowrap rounded-full text-label-xs"
              style={{
                paddingInline: "var(--spacing-1)",
                paddingBlock: "var(--spacing-px)",
                backgroundColor: "var(--surface-input)",
                color: "var(--text-primary)",
              }}
            >
              {pill}
            </span>
          )}

          {marcador ? (
            <span className="text-heading-md">
              {marcador.local} - {marcador.visitante}
            </span>
          ) : (
            <span className="rounded-md bg-surface-background px-2 py-1 text-label-md text-text-secondary">
              {hora}
            </span>
          )}
        </div>

        <div
          className="flex min-w-0 flex-1 items-center justify-end gap-2"
          style={{ opacity: atenuarVisitante ? 0.45 : 1 }}
        >
          <span className="truncate text-right text-body-sm">
            {nombreVisitante}
          </span>
          <Escudo equipo={visitante} size={20} />
        </div>
      </div>

      {finalizado && detalleInstancia && (
        <div className="mt-1 text-center leading-tight text-text-secondary">
          <div className="text-label-md-bold">{detalleInstancia.marcador}</div>
          <div className="text-label-sm">{detalleInstancia.etiqueta}</div>
        </div>
      )}

      {children}
    </div>
  );
}
