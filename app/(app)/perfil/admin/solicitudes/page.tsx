import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  SolicitudesCliente,
  type Solicitud,
} from "@/components/solicitudes-cliente";

export default async function SolicitudesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string }>;
}) {
  const { desde } = await searchParams;
  // Perfil vive por torneo (/[torneo]/perfil); sin saber de cuál se vino,
  // no hay a dónde volver más que al hub.
  const volverA = desde ? `/${desde}/perfil` : "/";

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
    redirect(volverA);
  }

  const { data } = await supabase
    .from("access_requests")
    .select("id, email, nota, creado_en")
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: true });

  return (
    <SolicitudesCliente
      solicitudes={(data ?? []) as Solicitud[]}
      volverA={volverA}
    />
  );
}
