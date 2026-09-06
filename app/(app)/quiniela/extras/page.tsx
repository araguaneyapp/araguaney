import { createClient } from "@/lib/supabase-server";
import { ExtrasCliente } from "@/components/extras-cliente";

export default async function ExtrasPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: equipos } = await supabase
    .from("teams")
    .select("id, nombre, codigo_iso")
    .order("nombre", { ascending: true });

  const { data: extras } = await supabase
    .from("special_predictions")
    .select("campeon_id, subcampeon_id, goleador_nombre")
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle();

  const { data: primerPartido } = await supabase
    .from("matches")
    .select("inicio_utc")
    .eq("fase", "grupos")
    .order("inicio_utc", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <ExtrasCliente
      equipos={equipos ?? []}
      extras={extras ?? null}
      usuarioId={user?.id ?? ""}
      deadline={primerPartido?.inicio_utc ?? null}
    />
  );
}
