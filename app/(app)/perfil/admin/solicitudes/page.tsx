import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import {
  SolicitudesCliente,
  type Solicitud,
} from "@/components/solicitudes-cliente";

export default async function SolicitudesPage() {
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
    redirect("/perfil");
  }

  const { data } = await supabase
    .from("access_requests")
    .select("id, email, nota, creado_en")
    .eq("estado", "pendiente")
    .order("creado_en", { ascending: true });

  return <SolicitudesCliente solicitudes={(data ?? []) as Solicitud[]} />;
}
