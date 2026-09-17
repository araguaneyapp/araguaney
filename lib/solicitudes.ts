import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Para la campana de notificaciones: si el usuario administra al menos un
 * grupo (`groups.creado_por`), y si alguno de esos grupos tiene solicitudes
 * pendientes. Se hace en dos pasos (no un join filtrado por `creado_por` en
 * el embed) porque la RLS de group_join_requests también deja ver "mis
 * propias solicitudes hechas en otros grupos", y eso contaría de más.
 */
export async function contarSolicitudesPendientes(
  supabase: SupabaseClient,
  usuarioId: string
): Promise<{ administraAlgunGrupo: boolean; hayPendientes: boolean }> {
  const { data: grupos } = await supabase
    .from("groups")
    .select("id")
    .eq("creado_por", usuarioId);

  const idsGrupos = (grupos ?? []).map((g) => g.id);
  if (idsGrupos.length === 0) {
    return { administraAlgunGrupo: false, hayPendientes: false };
  }

  const { count } = await supabase
    .from("group_join_requests")
    .select("id", { count: "exact", head: true })
    .in("group_id", idsGrupos)
    .eq("estado", "pendiente");

  return { administraAlgunGrupo: true, hayPendientes: (count ?? 0) > 0 };
}
