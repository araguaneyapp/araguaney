import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneos } from "@/lib/torneo";
import { SelectorTorneo } from "@/components/selector-torneo";

/**
 * Si hay un grupo activo guardado (cookie "grupo_activo") y el usuario
 * sigue siendo miembro (RLS de `groups` lo garantiza: si ya no lo es, la
 * consulta no devuelve nada), salta directo al torneo de ese grupo sin
 * mostrar el selector. Si no, muestra el grid de torneos — igual que
 * "/torneos", que nunca salta (ver ese archivo).
 *
 * El SuperAdmin no tiene grupo: su equivalente es la cookie
 * "torneo_activo_admin", que lo manda directo a /admin.
 */
export default async function HubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (perfil?.es_admin) {
    if (cookieStore.get("torneo_activo_admin")?.value) {
      redirect("/admin");
    }
    const torneos = await getTorneos();
    return <SelectorTorneo nombre={perfil?.nombre ?? "Admin"} torneos={torneos} esAdmin />;
  }

  const grupoActivo = cookieStore.get("grupo_activo")?.value;

  if (grupoActivo) {
    const { data: grupo } = await supabase
      .from("groups")
      .select("tournaments(slug)")
      .eq("id", grupoActivo)
      .maybeSingle();

    const torneoRef = grupo?.tournaments as
      | { slug: string }
      | { slug: string }[]
      | null;
    const slug = Array.isArray(torneoRef) ? torneoRef[0]?.slug : torneoRef?.slug;

    if (slug) redirect(`/${slug}`);
  }

  const torneos = await getTorneos();

  return <SelectorTorneo nombre={perfil?.nombre ?? "jugador"} torneos={torneos} />;
}
