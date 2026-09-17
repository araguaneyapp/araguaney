import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo, getTorneos } from "@/lib/torneo";
import { uno } from "@/lib/embeds";
import {
  ResultadosCliente,
  type PartidoAdmin,
} from "@/components/resultados-cliente";
import { CerrarSesionAdmin } from "@/components/cerrar-sesion-admin";

/**
 * Panel de SuperAdmin, aparte del contexto de torneos/grupos (sin
 * BottomNav, sin editar perfil): hoy su único poder real es cargar
 * resultados a mano si falla el sync con la API. El selector de torneo
 * de acá abajo reemplaza el slug "champions-2026" que antes quedaba
 * hardcodeado como default.
 */
export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ torneo?: string }>;
}) {
  const { torneo: torneoParam } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nombre, es_admin")
    .eq("id", user?.id ?? "")
    .maybeSingle();

  if (!perfil?.es_admin) {
    redirect("/");
  }

  const torneos = await getTorneos();
  const torneo = await getTorneo(torneoParam ?? torneos[0]?.slug ?? "champions-2026");

  const { data } = await supabase
    .from("matches")
    .select(
      `
      id,
      fase,
      leg,
      tie_id,
      gameday_id,
      inicio_utc,
      status,
      marcador_local,
      marcador_visitante,
      prorroga_local,
      prorroga_visitante,
      penales_local,
      penales_visitante,
      resuelto_en,
      editado_manual,
      ref_local,
      ref_visitante,
      local:teams!equipo_local_id(id, nombre, abreviatura, logo_url, codigo_iso),
      visitante:teams!equipo_visitante_id(id, nombre, abreviatura, logo_url, codigo_iso)
    `
    )
    .eq("tournament_id", torneo.id)
    .order("inicio_utc", { ascending: true, nullsFirst: false });

  const partidos: PartidoAdmin[] = (data ?? []).map((p) => ({
    ...p,
    local: uno(p.local),
    visitante: uno(p.visitante),
  }));

  return (
    <>
      <div className="flex items-center justify-between px-5 pt-6">
        <span className="text-body-sm text-text-secondary">
          {perfil?.nombre ?? "Admin"} · SuperAdmin
        </span>
        <CerrarSesionAdmin />
      </div>

      {torneos.length > 1 && (
        <div className="flex gap-2 px-5 pt-3">
          {torneos.map((t) => (
            <Link
              key={t.id}
              href={`/admin?torneo=${t.slug}`}
              className="rounded-full px-3 py-1 text-label-sm"
              style={{
                backgroundColor:
                  t.slug === torneo.slug ? "var(--accent-default)" : "var(--surface-card)",
                color:
                  t.slug === torneo.slug ? "var(--text-on-accent)" : "var(--text-secondary)",
              }}
            >
              {t.nombre}
            </Link>
          ))}
        </div>
      )}

      <ResultadosCliente partidos={partidos} config={torneo.config} volverA="/" />
    </>
  );
}
