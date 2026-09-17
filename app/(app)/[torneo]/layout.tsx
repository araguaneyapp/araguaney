import { BottomNav } from "@/components/bottom-nav";
import { AdminBottomNav } from "@/components/admin-bottom-nav";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";

/**
 * Todo lo que cuelga de /[torneo] pertenece a un torneo concreto: aquí se
 * valida el slug (getTorneo lanza notFound() si no existe) y se monta la
 * barra de navegación. Si es_admin, se monta el BottomNav de 3 botones
 * del SuperAdmin en vez del normal — así Partidos/Tabla/Eliminatorias/
 * Reglas se reusan tal cual para el admin, sin duplicar nada; las páginas
 * que no le sirven (Inicio, Quiniela, Perfil, Ranking) lo redirigen a
 * /admin cada una por su cuenta.
 *
 * La consulta de getTorneo va cacheada por request, así que las páginas
 * hijas pueden volver a llamarla sin costo extra.
 */
export default async function TorneoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ torneo: string }>;
}) {
  const { torneo } = await params;
  await getTorneo(torneo);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  return (
    <div className="min-h-screen pb-20">
      {children}
      {perfil?.es_admin ? <AdminBottomNav torneoSlug={torneo} /> : <BottomNav />}
    </div>
  );
}
