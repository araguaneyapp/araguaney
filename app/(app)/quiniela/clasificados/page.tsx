import { createClient } from "@/lib/supabase-server";
import { ClasificadosCliente } from "@/components/clasificados-cliente";

export default async function ClasificadosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: equipos } = await supabase
    .from("teams")
    .select("id, nombre, codigo_iso, grupo")
    .order("grupo", { ascending: true })
    .order("nombre", { ascending: true });

  const { data: predicciones } = await supabase
    .from("group_predictions")
    .select("grupo, equipo_id, posicion")
    .eq("usuario_id", user?.id ?? "");

  const { data: primerPartido } = await supabase
    .from("matches")
    .select("inicio_utc")
    .eq("fase", "grupos")
    .order("inicio_utc", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <ClasificadosCliente
      equipos={equipos ?? []}
      predicciones={predicciones ?? []}
      usuarioId={user?.id ?? ""}
      deadline={primerPartido?.inicio_utc ?? null}
    />
  );
}