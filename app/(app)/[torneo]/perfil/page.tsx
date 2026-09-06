import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { PerfilCliente } from "@/components/perfil-cliente";

export default async function PerfilPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // La posición y los puntos son los de ESTE torneo, no un acumulado global.
  const [{ data: perfil }, { data: fila }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, es_admin")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("ranking")
      .select("posicion, puntos_total")
      .eq("tournament_id", torneo.id)
      .eq("usuario_id", user?.id ?? "")
      .maybeSingle(),
  ]);

  return (
    <PerfilCliente
      nombre={perfil?.nombre ?? ""}
      correo={user?.email ?? ""}
      usuarioId={user?.id ?? ""}
      posicion={fila?.posicion ?? null}
      puntos={fila?.puntos_total ?? 0}
      esAdmin={perfil?.es_admin ?? false}
      torneoNombre={torneo.nombre}
      torneoSlug={torneo.slug}
    />
  );
}
