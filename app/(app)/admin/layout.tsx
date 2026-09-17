import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AdminBottomNav } from "@/components/admin-bottom-nav";

/**
 * Único punto que valida es_admin para todo /admin/**. El torneo que
 * administra se lee de la cookie torneo_activo_admin (fijada desde
 * /torneos vía activarTorneoAdmin), no de la URL — a diferencia de
 * [torneo]/layout.tsx, que sí lo tiene en el segmento dinámico.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!perfil?.es_admin) {
    redirect("/");
  }

  const cookieStore = await cookies();
  const torneoSlug = cookieStore.get("torneo_activo_admin")?.value;

  return (
    <div className="min-h-screen pb-20">
      {children}
      <AdminBottomNav torneoSlug={torneoSlug} />
    </div>
  );
}
