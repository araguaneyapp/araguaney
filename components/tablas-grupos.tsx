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
  posicion: number;
};

function bordePosicion(posicion: number) {
  if (posicion <= 2) return "var(--feedback-success)";
  if (posicion === 3) return "var(--feedback-warning)";
  return "transparent";
}

function FilaEquipo({ fila }: { fila: Fila }) {
  return (
    <div className="flex items-center border-b border-border py-2 last:border-0">
      <span
        className="mr-2 h-[28px] w-[3px] flex-shrink-0 rounded-full"
        style={{ backgroundColor: bordePosicion(fila.posicion) }}
      />
      <span className="w-[18px] flex-shrink-0 text-body-md-bold">
        {fila.posicion}
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

export function TablasGrupos({ filas }: { filas: Fila[] }) {
  const grupos: { grupo: string; filas: Fila[] }[] = [];
  let grupoActual = "";
  for (const f of filas) {
    if (f.grupo !== grupoActual) {
      grupoActual = f.grupo;
      grupos.push({ grupo: f.grupo, filas: [] });
    }
    grupos[grupos.length - 1].filas.push(f);
  }

  return (
    <div>
      {grupos.map((g) => (
        <div key={g.grupo} className="mb-4 rounded-xl bg-surface-card p-4">
          <h2 className="mb-2 text-heading-md">Grupo {g.grupo}</h2>
          <Encabezado />
          {g.filas.map((f) => (
            <FilaEquipo key={f.equipo_id} fila={f} />
          ))}
        </div>
      ))}

      <div className="mb-5 flex items-center gap-4 px-1">
        <span className="flex items-center gap-2 text-label-sm text-text-secondary">
          <span
            className="h-[10px] w-[10px] rounded-sm"
            style={{ backgroundColor: "var(--feedback-success)" }}
          />
          1º y 2º clasifican
        </span>
        <span className="flex items-center gap-2 text-label-sm text-text-secondary">
          <span
            className="h-[10px] w-[10px] rounded-sm"
            style={{ backgroundColor: "var(--feedback-warning)" }}
          />
          3º: mejor tercero
        </span>
      </div>
    </div>
  );
}