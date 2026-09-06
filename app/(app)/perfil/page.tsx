import { createClient } from "@/lib/supabase-server";
import { PerfilCliente } from "@/components/perfil-cliente";

export default async function PerfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  const { data: rankingFila } = await supabase
    .from("ranking")
    .select("posicion, puntos_total")
    .eq("usuario_id", user?.id ?? "")
    .maybeSingle();

  return (
    <PerfilCliente
      nombre={perfil?.nombre ?? ""}
      correo={user?.email ?? ""}
      usuarioId={user?.id ?? ""}
      posicion={rankingFila?.posicion ?? null}
      puntos={rankingFila?.puntos_total ?? 0}
      esAdmin={perfil?.es_admin ?? false}
    />
  );
}