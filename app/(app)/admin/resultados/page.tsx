import { cookies } from "next/headers";
import { getTorneo, getTorneos } from "@/lib/torneo";
import { AdminMenuCliente } from "@/components/admin-menu-cliente";

/**
 * es_admin ya lo valida app/(app)/admin/layout.tsx. El torneo sale de
 * la cookie torneo_activo_admin (fijada desde /torneos); si todavía no
 * hay ninguna, cae al primer torneo disponible como antes.
 */
export default async function AdminResultadosPage() {
  const cookieStore = await cookies();
  const torneoSlug = cookieStore.get("torneo_activo_admin")?.value;

  const torneos = await getTorneos();
  const torneo = await getTorneo(torneoSlug ?? torneos[0]?.slug ?? "champions-2026");

  return <AdminMenuCliente torneoId={torneo.id} />;
}
