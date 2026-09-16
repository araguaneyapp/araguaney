import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { activarGrupo } from "./actions";

const ESTADOS_GRUPO: Record<string, { texto: string; color: string; bg: string }> = {
  activo: {
    texto: "En juego",
    color: "var(--feedback-success)",
    bg: "var(--feedback-success-surface)",
  },
};

/**
 * Lista los grupos del usuario para este torneo. La RLS de `groups` ya
 * filtra a "los grupos de los que soy miembro/admin" (ver
 * supabase/sql/grupos.sql), así que un select plano alcanza — no hace
 * falta joinear group_members a mano.
 */
export default async function GruposPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, { data: grupos, error: errorGrupos }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user?.id ?? "").maybeSingle(),
    supabase
      .from("groups")
      .select("id, nombre, estado, creado_en")
      .eq("tournament_id", torneo.id)
      .order("creado_en", { ascending: true }),
  ]);

  // Un error real (RLS rota, etc.) no debe verse igual que "no tienes
  // grupos todavía" — lo uno manda a crear/unirse, lo otro rompería el
  // flujo en silencio si se tratara como si no tuviera nada.
  if (errorGrupos) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 text-center">
        <p className="text-body-sm text-text-secondary">
          No se pudieron cargar tus grupos. Intenta de nuevo en un momento.
        </p>
      </main>
    );
  }

  if (!grupos || grupos.length === 0) {
    redirect(`/grupos/${slug}/nuevo`);
  }

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <Link
        href="/torneos"
        className="mb-4 flex items-center gap-1 text-body-sm text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
        Volver
      </Link>

      <div className="mb-6">
        <p className="text-body-sm text-text-secondary">Hola,</p>
        <h1 className="text-heading-xl leading-tight">{perfil?.nombre ?? "jugador"} 👋</h1>
      </div>

      <h2 className="mb-1 text-heading-md">Selecciona un grupo</h2>
      <p className="mb-6 text-body-sm text-text-secondary">{torneo.nombre}</p>

      <div className="flex flex-col gap-2">
        {grupos.map((grupo) => {
          const estado = ESTADOS_GRUPO[grupo.estado] ?? null;
          const activar = activarGrupo.bind(null, grupo.id, slug);
          return (
            <form key={grupo.id} action={activar}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl bg-surface-card p-4 text-left"
              >
                <span
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--accent-subtle)" }}
                >
                  <Users className="h-5 w-5" style={{ color: "var(--icons-primary)" }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body-md leading-tight">{grupo.nombre}</div>
                  {estado && (
                    <span
                      className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-px text-label-sm"
                      style={{ backgroundColor: estado.bg, color: estado.color }}
                    >
                      <span
                        className="h-[6px] w-[6px] rounded-full"
                        style={{ backgroundColor: estado.color }}
                      />
                      {estado.texto}
                    </span>
                  )}
                </div>
                <ChevronRight
                  className="h-[18px] w-[18px] flex-shrink-0"
                  style={{ color: "var(--icons-secondary)" }}
                />
              </button>
            </form>
          );
        })}
      </div>

      <Link
        href={`/grupos/${slug}/nuevo`}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
        style={{
          backgroundColor: "var(--accent-default)",
          color: "var(--text-on-accent)",
        }}
      >
        Crear o unirme a otro grupo
      </Link>
    </main>
  );
}
