import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { contarSolicitudesPendientes } from "@/lib/solicitudes";
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

  const cookieStore = await cookies();
  const grupoActivo = cookieStore.get("grupo_activo")?.value;

  // La posición y los puntos son los de ESTE grupo, no un acumulado global.
  const [{ data: perfil }, solicitudes, { data: fila }, { data: grupo }] = await Promise.all([
    supabase
      .from("profiles")
      .select("nombre, es_admin")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    contarSolicitudesPendientes(supabase, user?.id ?? ""),
    grupoActivo
      ? supabase
          .from("ranking")
          .select("posicion, puntos_total")
          .eq("group_id", grupoActivo)
          .eq("usuario_id", user?.id ?? "")
          .maybeSingle()
      : Promise.resolve({ data: null }),
    grupoActivo
      ? supabase
          .from("groups")
          .select("nombre, codigo_invitacion")
          .eq("id", grupoActivo)
          .eq("tournament_id", torneo.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (perfil?.es_admin) redirect("/admin");

  return (
    <PerfilCliente
      nombre={perfil?.nombre ?? ""}
      correo={user?.email ?? ""}
      usuarioId={user?.id ?? ""}
      posicion={fila?.posicion ?? null}
      puntos={fila?.puntos_total ?? 0}
      torneoNombre={torneo.nombre}
      torneoSlug={torneo.slug}
      grupoNombre={grupo?.nombre ?? null}
      grupoCodigo={grupo?.codigo_invitacion ?? null}
      administraAlgunGrupo={solicitudes.administraAlgunGrupo}
      hayPendientes={solicitudes.hayPendientes}
    />
  );
}
