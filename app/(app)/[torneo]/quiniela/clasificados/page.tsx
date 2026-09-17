import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { ahoraMs } from "@/lib/tiempo";
import { plazasClasificacion } from "@/lib/config-torneo";
import {
  ClasificadosCliente,
  type EquipoOpcion,
  type PrediccionClasificacion,
} from "@/components/clasificados-cliente";

export default async function ClasificadosPage({
  params,
}: {
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);
  const { config } = torneo;

  const plazas = plazasClasificacion(config);

  // Un torneo que no declara esta predicción no tiene la pantalla.
  if (!config.prediccionClasificacion.tipo || plazas == null || plazas <= 0) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usuarioId = user?.id ?? "";

  const { data: perfil } = await supabase
    .from("profiles")
    .select("es_admin")
    .eq("id", usuarioId)
    .maybeSingle();
  if (perfil?.es_admin) redirect("/admin");

  const cierreJornada = config.prediccionClasificacion.cierreJornada;

  const [{ data: equiposData }, { data: predicciones }, { data: jornadas }] =
    await Promise.all([
      supabase
        .from("teams")
        .select("id, nombre, abreviatura, logo_url, codigo_iso")
        .eq("tournament_id", torneo.id)
        .order("nombre", { ascending: true }),
      supabase
        .from("standings_predictions")
        .select("equipo_id, posicion")
        .eq("tournament_id", torneo.id)
        .eq("usuario_id", usuarioId),
      cierreJornada == null
        ? Promise.resolve({ data: [] })
        : supabase
            .from("gamedays")
            .select("id")
            .eq("tournament_id", torneo.id)
            .eq("numero", cierreJornada),
    ]);

  /*
   * El cierre no se hardcodea: es el inicio del primer partido de la jornada
   * que diga el config. Si el calendario se mueve, el cierre se mueve con él.
   */
  let cierre: string | null = null;
  const jornadaCierre = (jornadas ?? [])[0];

  if (jornadaCierre) {
    const { data: primerPartido } = await supabase
      .from("matches")
      .select("inicio_utc")
      .eq("tournament_id", torneo.id)
      .eq("gameday_id", jornadaCierre.id)
      .not("inicio_utc", "is", null)
      .order("inicio_utc", { ascending: true })
      .limit(1)
      .maybeSingle();

    cierre = primerPartido?.inicio_utc ?? null;
  }

  return (
    <ClasificadosCliente
      equipos={(equiposData ?? []) as EquipoOpcion[]}
      predicciones={(predicciones ?? []) as PrediccionClasificacion[]}
      usuarioId={usuarioId}
      torneoId={torneo.id}
      torneoSlug={torneo.slug}
      plazas={plazas}
      cierre={cierre}
      ahoraServidor={ahoraMs()}
    />
  );
}
