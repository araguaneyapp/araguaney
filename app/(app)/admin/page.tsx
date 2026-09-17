import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { PanelAdminCliente } from "@/components/panel-admin-cliente";

/**
 * Pantalla "Inicio" del SuperAdmin. es_admin ya lo valida
 * app/(app)/admin/layout.tsx — acá solo hace falta el nombre y el
 * torneo activo (cookie torneo_activo_admin, fijada desde /torneos).
 */
export default async function AdminInicioPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const cookieStore = await cookies();
  const torneoSlug = cookieStore.get("torneo_activo_admin")?.value ?? null;
  const torneo = torneoSlug ? await getTorneo(torneoSlug) : null;

  return (
    <PanelAdminCliente
      nombre={perfil?.nombre ?? "Admin"}
      usuarioId={user?.id ?? ""}
      torneoNombre={torneo?.nombre ?? null}
      torneoSlug={torneo?.slug ?? null}
    />
  );
}
