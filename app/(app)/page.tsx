import Link from "next/link";
import { ChevronRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { getTorneos, type EstadoTorneo } from "@/lib/torneo";

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

export default async function HubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, torneos] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user?.id ?? "").maybeSingle(),
    getTorneos(),
  ]);

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <div className="mb-6">
        <p className="text-text-secondary text-body-sm">Hola,</p>
        <h1 className="text-heading-xl leading-tight">
          {perfil?.nombre ?? "jugador"} 👋
        </h1>
      </div>

      <h2 className="mb-3 text-heading-md">Tus competiciones</h2>

      {torneos.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          Todavía no hay competiciones disponibles.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {torneos.map((torneo) => {
            const estado = ESTADOS[torneo.estado] ?? ESTADOS.proximo;
            const fechas = rangoFechas(torneo.inicio, torneo.fin);
            return (
              <Link
                key={torneo.id}
                href={`/${torneo.slug}`}
                className="flex items-center gap-3 rounded-xl bg-surface-card p-4"
              >
                <span
                  className="flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center overflow-hidden rounded-full"
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
                      className="h-[20px] w-[20px]"
                      style={{ color: "var(--icons-primary)" }}
                    />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="text-body-md leading-tight">{torneo.nombre}</div>
                  <div className="mt-1 flex items-center gap-2">
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
                      <span className="text-label-sm text-text-secondary">
                        {fechas}
                      </span>
                    )}
                  </div>
                </div>

                <ChevronRight
                  className="h-[18px] w-[18px] flex-shrink-0"
                  style={{ color: "var(--icons-secondary)" }}
                />
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
