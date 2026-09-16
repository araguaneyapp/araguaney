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
 */
export default async function HubPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
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

  const [{ data: perfil }, torneos] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user?.id ?? "").maybeSingle(),
    getTorneos(),
  ]);

  return <SelectorTorneo nombre={perfil?.nombre ?? "jugador"} torneos={torneos} />;
}
