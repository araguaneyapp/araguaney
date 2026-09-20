import Link from "next/link";
import { ArrowLeft, Check, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { resolverSolicitud } from "./actions";

type Solicitud = {
  id: number;
  nota: string | null;
  creado_en: string;
  solicitante: { nombre: string | null } | { nombre: string | null }[] | null;
  grupo: { nombre: string } | { nombre: string }[] | null;
};

function uno<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? valor[0] ?? null : valor;
}

/**
 * Solicitudes pendientes de TODOS los grupos que administra el usuario
 * (no solo uno). Se resuelve en dos pasos, no con un select+join filtrado
 * por `groups.creado_por` en el embed: la RLS de group_join_requests
 * también deja ver "mis propias solicitudes hechas en otros grupos", así
 * que filtrar explícito por los IDs de grupos propios evita mezclarlas acá.
 */
export default async function SolicitudesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: grupos } = await supabase
    .from("groups")
    .select("id, nombre")
    .eq("creado_por", user?.id ?? "");

  const idsGrupos = (grupos ?? []).map((g) => g.id);

  const { data: solicitudesData } = idsGrupos.length
    ? await supabase
        .from("group_join_requests")
        .select(
          `
          id,
          nota,
          creado_en,
          solicitante:profiles!usuario_id(nombre),
          grupo:groups!group_id(nombre)
        `
        )
        .in("group_id", idsGrupos)
        .eq("estado", "pendiente")
        .order("creado_en", { ascending: true })
    : { data: [] };

  const solicitudes = (solicitudesData ?? []) as Solicitud[];

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <Link
        href="/"
        className="mb-4 flex items-center gap-1 text-body-sm text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
        Volver
      </Link>

      <h1 className="mb-6 text-heading-xl">Solicitudes</h1>

      {solicitudes.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {solicitudes.map((s) => {
            const solicitante = uno(s.solicitante);
            const grupo = uno(s.grupo);
            const aprobar = resolverSolicitud.bind(null, s.id, true);
            const rechazar = resolverSolicitud.bind(null, s.id, false);

            return (
              <div key={s.id} className="rounded-xl bg-surface-card p-4">
                <div className="mb-3 flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--accent-subtle)" }}
                  >
                    <Users className="h-5 w-5" style={{ color: "var(--icons-primary)" }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-label-md-caps text-accent-default">
                      {grupo?.nombre ?? "Tu grupo"}
                    </div>
                    <div className="truncate text-body-md-bold">
                      {solicitante?.nombre ?? "Alguien"}
                    </div>
                    <div className="truncate text-body-sm text-text-secondary">
                      quiere unirse a este grupo
                    </div>
                    {s.nota && (
                      <div className="mt-1 truncate text-body-sm text-text-secondary">
                        “{s.nota}”
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <form action={rechazar} className="flex-1">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-action-button"
                      style={{
                        backgroundColor: "var(--background)",
                        border: "1px solid var(--border)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <X className="h-[16px] w-[16px]" />
                      Rechazar
                    </button>
                  </form>
                  <form action={aprobar} className="flex-1">
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-1 rounded-lg py-2.5 text-action-button"
                      style={{
                        backgroundColor: "var(--accent-default)",
                        color: "var(--text-on-accent)",
                      }}
                    >
                      <Check className="h-[16px] w-[16px]" />
                      Aprobar
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
