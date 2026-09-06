import { Trophy } from "lucide-react";
import { Flag } from "@/components/flag";

type FinalCardProps = {
  finalizado: boolean;
  nombreLocal: string;
  nombreVisitante: string;
  localIso: string | null;
  visitanteIso: string | null;
  marcador: string | null;
  hora: string;
  metaLine: string;
  detalleInstancia: { marcador: string; etiqueta: string } | null;
  className?: string;
  children?: React.ReactNode;
};

function BanderaGrande({ iso }: { iso: string | null }) {
  if (iso) return <Flag iso={iso} size={44} />;
  return (
    <span
      className="inline-block rounded-full"
      style={{ width: 44, height: 44, backgroundColor: "var(--border)" }}
    />
  );
}

export function FinalCard({
  finalizado,
  nombreLocal,
  nombreVisitante,
  localIso,
  visitanteIso,
  marcador,
  hora,
  metaLine,
  detalleInstancia,
  className = "",
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
          <BanderaGrande iso={localIso} />
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
          <BanderaGrande iso={visitanteIso} />
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