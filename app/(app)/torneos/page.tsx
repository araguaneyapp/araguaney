import { createClient } from "@/lib/supabase-server";
import { getTorneos } from "@/lib/torneo";
import { SelectorTorneo } from "@/components/selector-torneo";

/**
 * Igual que el Hub ("/"), pero sin el salto automático por cookie: es el
 * punto de entrada explícito para "cambiar de torneo/grupo" desde Perfil.
 */
export default async function TorneosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: perfil }, torneos] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user?.id ?? "").maybeSingle(),
    getTorneos(),
  ]);

  return <SelectorTorneo nombre={perfil?.nombre ?? "jugador"} torneos={torneos} />;
}
