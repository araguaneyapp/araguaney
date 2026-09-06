import { Escudo, type EquipoEscudo } from "@/components/escudo";
import { etiquetaFase } from "@/lib/fases";
import { formatoDeFase, type ConfigTorneo } from "@/lib/config-torneo";

export type FilaTabla = {
  equipo_id: number;
  /** Null mientras la clasificación no se haya calculado (antes de la J1). */
  posicion: number | null;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  gc: number;
  dg: number;
  pts: number;
  equipo: EquipoEscudo | null;
};

type Cortes = ConfigTorneo["cortesClasificacion"];

/**
 * Color de la zona de clasificación de una posición.
 *
 * Los cortes salen del config del torneo, nunca de constantes: en Champions
 * son 8 (directo) y 24 (playoff), pero si un torneo no los declara
 * simplemente no se pinta zona. La pantalla no inventa el corte.
 */
function colorZona(rango: number, cortes: Cortes): string | null {
  if (cortes.directo != null && rango <= cortes.directo) {
    return "var(--feedback-success)";
  }
  if (cortes.playoff != null && rango <= cortes.playoff) {
    return "var(--feedback-warning)";
  }
  return null;
}

/** Última posición de una zona: ahí va la línea que separa del resto. */
function esUltimaDeZona(rango: number, cortes: Cortes): boolean {
  return rango === cortes.directo || rango === cortes.playoff;
}

/**
 * A qué fase lleva cada zona, deducido del config: la primera eliminatoria del
 * torneo es el destino de la zona de playoff y la siguiente, el de la zona
 * directa. Así la leyenda dice "octavos" o "dieciseisavos" según el torneo,
 * sin que la pantalla tenga que saber cuál está mirando.
 */
function destinos(config: ConfigTorneo) {
  const cortes = config.cortesClasificacion;

  const eliminatorias = config.fases.filter((fase) => {
    const formato = formatoDeFase(config, fase);
    return formato === "ida_vuelta" || formato === "partido_unico";
  });

  const playoff = cortes.playoff != null ? eliminatorias[0] ?? null : null;
  const directo =
    cortes.directo != null
      ? (cortes.playoff != null ? eliminatorias[1] : eliminatorias[0]) ?? null
      : null;

  return { directo, playoff };
}

/** "Octavos" -> "octavos", para que encaje dentro de una frase. */
function enFrase(etiqueta: string) {
  return etiqueta.charAt(0).toLowerCase() + etiqueta.slice(1);
}

/*
 * Anchos de columna compartidos por el encabezado y las filas. Viven aquí
 * arriba para que las dos rejillas no se puedan desalinear por descuido.
 */
const COL = {
  zona: "mr-2 w-[3px] flex-shrink-0",
  posicion: "w-[20px] flex-shrink-0 text-center",
  escudo: "w-[20px] flex-shrink-0",
  nombre: "ml-[8px] min-w-0 flex-1",
  pj: "w-[24px] flex-shrink-0 text-center",
  g: "w-[20px] flex-shrink-0 text-center",
  e: "w-[20px] flex-shrink-0 text-center",
  p: "w-[20px] flex-shrink-0 text-center",
  dg: "w-[28px] flex-shrink-0 text-center",
  pts: "w-[26px] flex-shrink-0 text-center",
};

function Encabezado() {
  const clase = (col: string) => `${col} text-label-sm text-text-secondary`;

  return (
    <div className="flex items-center">
      {/* La barra de zona no rotula: es solo el color de la franja. */}
      <span className={COL.zona} />
      <span className={clase(COL.posicion)}>#</span>
      {/* El escudo cae bajo el rótulo del equipo, no lleva uno propio. */}
      <span className={COL.escudo} />
      <span className={clase(COL.nombre)}>Equipo</span>
      <span className={clase(COL.pj)}>PJ</span>
      <span className={clase(COL.g)}>G</span>
      <span className={clase(COL.e)}>E</span>
      <span className={clase(COL.p)}>P</span>
      <span className={clase(COL.dg)}>DG</span>
      <span className={clase(COL.pts)}>Pts</span>
    </div>
  );
}

function Fila({
  fila,
  rango,
  cortes,
  ultima,
}: {
  fila: FilaTabla;
  /** Posición real si está calculada; si no, el lugar que ocupa en la lista. */
  rango: number;
  cortes: Cortes;
  ultima: boolean;
}) {
  const zona = colorZona(rango, cortes);
  const corte = esUltimaDeZona(rango, cortes);

  const dato = (col: string) => `${col} text-body-sm text-text-secondary`;

  return (
    <div
      className="flex items-center py-2"
      style={{
        borderBottom: ultima
          ? "none"
          : corte
          ? "1px solid var(--border-strong)"
          : "1px solid var(--border)",
      }}
    >
      <span
        className={`${COL.zona} h-[28px] rounded-full`}
        style={{ backgroundColor: zona ?? "transparent" }}
      />

      {/*
        Sin posición calculada la lista va alfabética: numerarla del 1 al 36
        haría creer que hay una clasificación que todavía no existe.
      */}
      <span
        className={`${COL.posicion} text-body-md-bold`}
        style={fila.posicion == null ? { color: "var(--text-idle)" } : undefined}
      >
        {fila.posicion ?? "–"}
      </span>

      <Escudo equipo={fila.equipo} size={20} />

      <span className={`${COL.nombre} truncate text-body-sm`}>
        {fila.equipo?.nombre ?? "Equipo"}
      </span>

      <span className={dato(COL.pj)}>{fila.pj}</span>
      <span className={dato(COL.g)}>{fila.g}</span>
      <span className={dato(COL.e)}>{fila.e}</span>
      <span className={dato(COL.p)}>{fila.p}</span>
      <span className={dato(COL.dg)}>{fila.dg > 0 ? `+${fila.dg}` : fila.dg}</span>
      <span className={`${COL.pts} text-body-md-bold`}>{fila.pts}</span>
    </div>
  );
}

function Leyenda({ config }: { config: ConfigTorneo }) {
  const cortes = config.cortesClasificacion;
  const destino = destinos(config);

  const entradas: { color: string; texto: string }[] = [];

  if (cortes.directo != null) {
    entradas.push({
      color: "var(--feedback-success)",
      texto: destino.directo
        ? `Clasificación a ${enFrase(etiquetaFase(destino.directo))}`
        : `1–${cortes.directo}: clasifican directo`,
    });
  }

  if (cortes.playoff != null) {
    const desde = cortes.directo != null ? cortes.directo + 1 : 1;
    entradas.push({
      color: "var(--feedback-warning)",
      texto: destino.playoff
        ? `Clasificación a ${enFrase(etiquetaFase(destino.playoff))}`
        : `${desde}–${cortes.playoff}: playoff`,
    });
  }

  if (entradas.length === 0) return null;

  return (
    <div className="mt-4 flex flex-col gap-2 px-1">
      {entradas.map((entrada) => (
        <span
          key={entrada.texto}
          className="flex items-center gap-2 text-label-sm text-text-secondary"
        >
          <span
            className="h-[10px] w-[10px] flex-shrink-0 rounded-full"
            style={{ backgroundColor: entrada.color }}
          />
          {entrada.texto}
        </span>
      ))}
    </div>
  );
}

/**
 * Tabla única de la fase de liga (36 equipos en Champions), sin grupos.
 *
 * Las zonas de clasificación se pintan siempre. Antes de la primera jornada
 * nadie tiene `posicion` y todos están empatados a cero, así que el rango sale
 * del lugar en la lista: es el mismo criterio con el que cualquier tabla
 * arranca una temporada.
 */
export function TablaLiga({
  filas,
  config,
}: {
  filas: FilaTabla[];
  config: ConfigTorneo;
}) {
  if (filas.length === 0) {
    return (
      <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
        La tabla de esta competición todavía no está cargada.
      </p>
    );
  }

  return (
    <div>
      <div className="rounded-xl bg-surface-card px-4 pb-2">
        {/*
          Con 36 filas el encabezado tiene que quedarse a la vista o las
          columnas dejan de significar nada al bajar.

          El `top` lo da el token de la cabecera con tabs, pero el fondo se
          estira 24px hacia arriba (padding-top y `top` compensado) para que
          no asome una franja de filas entre una cabecera y otra: la del
          layout mide ~122px y el token declara 140px.
        */}
        <div
          className="sticky z-10 -mx-4 rounded-t-xl bg-surface-card px-4 pb-2"
          style={{
            top: "calc(var(--layout-header-nav) - 24px)",
            paddingTop: "24px",
          }}
        >
          <Encabezado />
        </div>

        {filas.map((fila, i) => (
          <Fila
            key={fila.equipo_id}
            fila={fila}
            rango={fila.posicion ?? i + 1}
            cortes={config.cortesClasificacion}
            ultima={i === filas.length - 1}
          />
        ))}
      </div>

      <Leyenda config={config} />
    </div>
  );
}
