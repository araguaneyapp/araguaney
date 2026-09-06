import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { AdminResultadosCliente } from "@/components/admin-resultados-cliente";

export default async function AdminPage() {
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
    .from("matches")
    .select(
      `
      id,
      grupo,
      fase,
      inicio_utc,
      status,
      marcador_local,
      marcador_visitante,
      penales_local,
      penales_visitante,
      prorroga_local,
      prorroga_visitante,
      resuelto_en,
      ref_local,
      ref_visitante,
      local:teams!equipo_local_id(id, nombre, codigo_iso),
      visitante:teams!equipo_visitante_id(id, nombre, codigo_iso)
    `
    )
    .neq("status", "finished")
    .order("inicio_utc", { ascending: true });

  const partidos = (data ?? []).map((p) => ({
    ...p,
    local: Array.isArray(p.local) ? (p.local[0] ?? null) : p.local,
    visitante: Array.isArray(p.visitante) ? (p.visitante[0] ?? null) : p.visitante,
  }));

  return <AdminResultadosCliente partidos={partidos} />;
}