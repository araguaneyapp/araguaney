import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import type { EstadoTorneo, Torneo } from "@/lib/torneo";

const ESTADOS: Record<EstadoTorneo, { texto: string; color: string; bg: string }> = {
  activo: {
    texto: "En juego",
    color: "var(--feedback-success)",
    bg: "var(--feedback-success-surface)",
  },
  proximo: {
    texto: "Próximamente",
    color: "var(--accent-default)",
    bg: "var(--accent-subtle)",
  },
  finalizado: {
    texto: "Finalizado",
    color: "var(--text-secondary)",
    bg: "var(--surface-background)",
  },
};

function rangoFechas(inicio: string | null, fin: string | null) {
  const formato = (fecha: string) => {
    const f = new Date(fecha + "T12:00:00");
    const mes = f.toLocaleDateString("es", { month: "short" }).replace(".", "");
    return `${mes} ${f.getFullYear()}`;
  };
  if (inicio && fin) return `${formato(inicio)} – ${formato(fin)}`;
  if (inicio) return `Desde ${formato(inicio)}`;
  return null;
}

/**
 * Grid de torneos disponibles. Lo usan tanto "/" (con salto automático si ya
 * hay un grupo activo guardado) como "/torneos" (siempre visible, para
 * cambiar de torneo/grupo desde Perfil) — mismo componente, sin duplicar
 * el fetch ni el layout.
 */
export function SelectorTorneo({
  nombre,
  torneos,
}: {
  nombre: string;
  torneos: Torneo[];
}) {
  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <div className="mb-6">
        <p className="text-body-sm text-text-secondary">Hola,</p>
        <h1 className="text-heading-xl leading-tight">{nombre} 👋</h1>
      </div>

      <h2 className="mb-3 text-heading-md">Selecciona un torneo</h2>

      {torneos.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          Todavía no hay competiciones disponibles.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {torneos.map((torneo) => {
            const estado = ESTADOS[torneo.estado] ?? ESTADOS.proximo;
            const fechas = rangoFechas(torneo.inicio, torneo.fin);
            return (
              <Link
                key={torneo.id}
                href={`/grupos/${torneo.slug}`}
                className="flex flex-col items-center gap-2 rounded-xl bg-surface-card p-4 text-center"
              >
                <span
                  className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
                  style={{ backgroundColor: "var(--accent-subtle)" }}
                >
                  {torneo.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={torneo.logo_url}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Trophy
                      className="h-6 w-6"
                      style={{ color: "var(--icons-primary)" }}
                    />
                  )}
                </span>

                <div className="text-body-md leading-tight">{torneo.nombre}</div>

                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-px text-label-sm"
                  style={{ backgroundColor: estado.bg, color: estado.color }}
                >
                  <span
                    className="h-[6px] w-[6px] rounded-full"
                    style={{ backgroundColor: estado.color }}
                  />
                  {estado.texto}
                </span>
                {fechas && (
                  <span className="text-label-sm text-text-secondary">{fechas}</span>
                )}

                <span
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-label-md-bold"
                  style={{
                    backgroundColor: "var(--accent-default)",
                    color: "var(--text-on-accent)",
                  }}
                >
                  Seleccionar
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
