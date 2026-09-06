import { Flag } from "@/components/flag";

type Estado = {
  texto: string;
  color: string;
  bg: string;
};

export type MatchCardProps = {
  meta: string;
  estado: Estado;
  localNombre: string;
  localIso: string | null;
  visitanteNombre: string;
  visitanteIso: string | null;
  marcador: string | null;
  hora: string;
};

function BanderaOPlaceholder({ iso }: { iso: string | null }) {
  if (iso) return <Flag iso={iso} size={20} />;
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 20, height: 20, backgroundColor: "var(--border)" }}
    />
  );
}

export function MatchCard({
  meta,
  estado,
  localNombre,
  localIso,
  visitanteNombre,
  visitanteIso,
  marcador,
  hora,
}: MatchCardProps) {
  const esVS = marcador === null;

  return (
    <div className="mb-2 rounded-xl bg-surface-card p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-label-md text-text-secondary">
          {meta}
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-label-sm"
          style={{ backgroundColor: estado.bg, color: estado.color }}
        >
          <span
            className="h-[6px] w-[6px] rounded-full"
            style={{ backgroundColor: estado.color }}
          />
          {estado.texto}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <BanderaOPlaceholder iso={localIso} />
          <span className="text-body-sm">{localNombre}</span>
        </div>

        {esVS ? (
          <span className="flex-shrink-0 rounded-md bg-surface-background px-2 py-1 text-label-md text-text-secondary">
            {hora}
          </span>
        ) : (
          <span className="px-2 text-heading-md text-foreground">
            {marcador}
          </span>
        )}

        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="text-body-sm">{visitanteNombre}</span>
          <BanderaOPlaceholder iso={visitanteIso} />
        </div>
      </div>
    </div>
  );
}