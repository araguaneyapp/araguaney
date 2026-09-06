import { Goal, Star, Calculator, Trophy, type LucideIcon } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { getTorneo } from "@/lib/torneo";
import { etiquetaFase } from "@/lib/fases";
import {
  formatoDeFase,
  type ClavePuntaje,
  type ConfigTorneo,
} from "@/lib/config-torneo";

type Fila = { texto: string; sub?: string; valor: string };

function Seccion({
  icono,
  titulo,
  filas,
}: {
  icono: React.ReactNode;
  titulo: string;
  filas: Fila[];
}) {
  if (filas.length === 0) return null;

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        {icono}
        <h2 className="text-heading-md" style={{ color: "var(--accent-default)" }}>
          {titulo}
        </h2>
      </div>
      <div className="rounded-xl bg-surface-card px-4">
        {filas.map((fila, i) => (
          <div
            key={fila.texto}
            className="flex items-center justify-between py-3"
            style={{
              borderBottom:
                i < filas.length - 1 ? "1px solid var(--border)" : "none",
            }}
          >
            <div>
              <div className="text-body-md text-text-secondary">{fila.texto}</div>
              {fila.sub && (
                <div className="mt-px text-label-md text-text-secondary opacity-70">
                  {fila.sub}
                </div>
              )}
            </div>
            <span className="flex-shrink-0 text-body-md-bold">{fila.valor}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function enPuntos(n: number) {
  return `${n} ${Math.abs(n) === 1 ? "pt" : "pts"}`;
}

/**
 * Construye una fila a partir de una clave de config.puntajes.
 * Si la clave no está en el config, la fila no existe: la pantalla nunca
 * inventa un número ni muestra un valor por defecto.
 */
function fila(
  config: ConfigTorneo,
  clave: ClavePuntaje,
  texto: string,
  opciones: { sub?: string; bonus?: boolean } = {}
): Fila | null {
  const valor = config.puntajes[clave];
  if (valor == null) return null;
  return {
    texto,
    sub: opciones.sub,
    valor: opciones.bonus ? `+${enPuntos(valor)}` : enPuntos(valor),
  };
}

function soloFilas(filas: (Fila | null)[]): Fila[] {
  return filas.filter((f): f is Fila => f !== null);
}

/** "A", "A y B", "A, B y C" */
function unirNombres(nombres: string[]) {
  if (nombres.length <= 1) return nombres[0] ?? "";
  return `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

/** Fases contiguas que comparten multiplicador se muestran en una sola fila. */
function filasMultiplicadores(config: ConfigTorneo): Fila[] {
  const grupos: { fases: string[]; valor: number }[] = [];

  for (const fase of config.fases) {
    const valor = config.multiplicadores[fase];
    if (valor == null) continue;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.valor === valor) ultimo.fases.push(fase);
    else grupos.push({ fases: [fase], valor });
  }

  return grupos.map((g) => ({
    texto: unirNombres(g.fases.map(etiquetaFase)),
    valor: `×${g.valor}`,
  }));
}

/** "top8" -> "Top 8". Cualquier otro formato cae en algo genérico. */
function etiquetaClasificacion(tipo: string | null) {
  const match = tipo?.match(/^top(\d+)$/);
  return match ? `Top ${match[1]}` : "la clasificación";
}

export default async function ReglasPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const { config } = await getTorneo(slug);

  const hayEliminatorias = config.fases.some((fase) => {
    const formato = formatoDeFase(config, fase);
    return formato === "ida_vuelta" || formato === "partido_unico";
  });

  const filasPartidos = soloFilas([
    fila(config, "marcador_exacto", "Marcador exacto"),
    fila(config, "acertar_ganador", "Acertar ganador"),
    fila(config, "empate_exacto", "Empate exacto"),
    fila(config, "acertar_empate", "Acertar que es empate"),
  ]);

  const filasBonus = soloFilas([
    fila(config, "llanero", "Llanero solitario", {
      sub: "Si eres el único que clava el marcador",
      bonus: true,
    }),
    hayEliminatorias
      ? fila(config, "quien_avanza", "Quién avanza", {
          sub: "Acertar el equipo que pasa la llave",
          bonus: true,
        })
      : null,
  ]);

  const clasificacion = etiquetaClasificacion(config.prediccionClasificacion.tipo);

  const filasExtras = soloFilas([
    config.prediccionClasificacion.tipo
      ? fila(config, "clasificacion_equipo", `Equipo en el ${clasificacion}`)
      : null,
    config.prediccionClasificacion.tipo
      ? fila(config, "clasificacion_posicion", "Equipo + posición exacta")
      : null,
    config.extras.campeon ? fila(config, "campeon", "Campeón") : null,
    config.extras.subcampeon ? fila(config, "subcampeon", "Subcampeón") : null,
    config.extras.goleador ? fila(config, "goleador", "Goleador") : null,
  ]);

  const filasMult = filasMultiplicadores(config);
  const hayReglas =
    filasPartidos.length + filasBonus.length + filasMult.length + filasExtras.length >
    0;

  const icono = (Icono: LucideIcon) => (
    <Icono className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />
  );

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Reglas y puntuación" backHref={`/${slug}/perfil`} />

      {!hayReglas ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          Las reglas de esta competición todavía no están cargadas.
        </p>
      ) : (
        <>
          <Seccion
            icono={icono(Goal)}
            titulo="Resultado de partidos"
            filas={filasPartidos}
          />
          <Seccion icono={icono(Star)} titulo="Bonus" filas={filasBonus} />
          <Seccion
            icono={icono(Calculator)}
            titulo="Multiplicadores por fase"
            filas={filasMult}
          />
          <Seccion
            icono={icono(Trophy)}
            titulo="Clasificación y extras"
            filas={filasExtras}
          />
        </>
      )}
    </main>
  );
}
