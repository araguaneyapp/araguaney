import { Trophy } from "lucide-react";
import { Escudo, type EquipoEscudo } from "@/components/escudo";

type FinalCardProps = {
  finalizado: boolean;
  nombreLocal: string;
  nombreVisitante: string;
  local: EquipoEscudo | null;
  visitante: EquipoEscudo | null;
  marcador: string | null;
  hora: string;
  metaLine: string;
  detalleInstancia: { marcador: string; etiqueta: string } | null;
  className?: string;
  /** La llave todavía no tiene equipos: escudos con "?" en vez de vacíos. */
  placeholder?: boolean;
  children?: React.ReactNode;
};

export function FinalCard({
  finalizado,
  nombreLocal,
  nombreVisitante,
  local,
  visitante,
  marcador,
  hora,
  metaLine,
  detalleInstancia,
  className = "",
  placeholder = false,
  children,
}: FinalCardProps) {
  return (
    <div className={`caja-dorada rounded-2xl p-5 ${className}`}>
      <div className="mb-4 flex flex-col items-center">
        <Trophy className="h-7 w-7" style={{ color: "var(--icons-primary)" }} />
        <span
          className="mt-1 text-label-md-bold"
          style={{ color: "var(--accent-default)" }}
        >
          FINAL
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 flex-col items-center gap-2">
          <Escudo equipo={local} size={44} placeholder={placeholder} />
          <span className="text-center text-body-md-bold leading-tight">
            {nombreLocal}
          </span>
        </div>

        <div className="flex flex-shrink-0 flex-col items-center px-1">
          {finalizado ? (
            <span className="text-display-md">{marcador}</span>
          ) : (
            <span className="rounded-lg bg-surface-background px-3 py-1.5 text-heading-md text-text-secondary">
              {hora}
            </span>
          )}
          {finalizado && detalleInstancia && (
            <div className="mt-1 text-center leading-tight text-text-secondary">
              <div className="text-label-md-bold">{detalleInstancia.marcador}</div>
              <div className="text-label-sm">{detalleInstancia.etiqueta}</div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center gap-2">
          <Escudo equipo={visitante} size={44} placeholder={placeholder} />
          <span className="text-center text-body-md-bold leading-tight">
            {nombreVisitante}
          </span>
        </div>
      </div>

      <div className="mt-4 text-center text-label-md text-text-secondary">
        {metaLine}
      </div>

      {children}
    </div>
  );
}