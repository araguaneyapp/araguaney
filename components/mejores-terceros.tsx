import { Flag } from "@/components/flag";

type Fila = {
  equipo_id: number;
  nombre: string;
  grupo: string;
  codigo_iso: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  dg: number;
  pts: number;
  ranking_tercero: number;
  clasifica: boolean;
};

function FilaTercero({ fila }: { fila: Fila }) {
  return (
    <div className="flex items-center border-b border-border py-2 last:border-0">
      <span
        className="mr-2 h-[28px] w-[3px] flex-shrink-0 rounded-full"
        style={{
          backgroundColor: fila.clasifica ? "var(--feedback-success)" : "transparent",
        }}
      />
      <span className="w-[18px] flex-shrink-0 text-body-md-bold">
        {fila.ranking_tercero}
      </span>
      <Flag iso={fila.codigo_iso} size={20} />
      <span className="ml-[8px] flex-1 truncate text-body-sm">
        {fila.nombre}
      </span>
      <span className="w-[26px] flex-shrink-0 text-center text-body-sm text-text-secondary">
        {fila.pj}
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-body-sm text-text-secondary">
        {fila.g}
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-body-sm text-text-secondary">
        {fila.e}
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-body-sm text-text-secondary">
        {fila.p}
      </span>
      <span className="w-[30px] flex-shrink-0 text-center text-body-sm text-text-secondary">
        {fila.dg > 0 ? `+${fila.dg}` : fila.dg}
      </span>
      <span className="w-[28px] flex-shrink-0 text-center text-body-md-bold">
        {fila.pts}
      </span>
    </div>
  );
}

function Encabezado() {
  return (
    <div className="flex items-center pb-2">
      <span className="mr-2 w-[3px] flex-shrink-0" />
      <span className="w-[18px] flex-shrink-0" />
      <span className="w-[20px] flex-shrink-0" />
      <span className="ml-[8px] flex-1" />
      <span className="w-[26px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        PJ
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        G
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        E
      </span>
      <span className="w-[22px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        P
      </span>
      <span className="w-[30px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        DG
      </span>
      <span className="w-[28px] flex-shrink-0 text-center text-label-sm text-text-secondary">
        Pts
      </span>
    </div>
  );
}

export function MejoresTerceros({ filas }: { filas: Fila[] }) {
  if (filas.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl bg-surface-card p-4">
      <h2 className="text-heading-md">Mejores terceros</h2>
      <p className="mb-2 text-label-md text-text-secondary">
        Los 8 mejores avanzan
      </p>
      <Encabezado />
      {filas.map((f) => (
        <FilaTercero key={f.equipo_id} fila={f} />
      ))}
    </div>
  );
}