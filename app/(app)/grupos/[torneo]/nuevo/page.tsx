import { createClient } from "@/lib/supabase-server";
import { getTorneo } from "@/lib/torneo";
import { GruposNuevoCliente } from "@/components/grupos-nuevo-cliente";

export default async function GruposNuevoPage({
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

  const [{ data: perfil }, { data: grupos }] = await Promise.all([
    supabase.from("profiles").select("nombre").eq("id", user?.id ?? "").maybeSingle(),
    supabase.from("groups").select("id").eq("tournament_id", torneo.id).limit(1),
  ]);

  // Si ya tiene grupos, "Volver" debe llevarlo a su lista, no saltarse al
  // selector de torneos; si no tiene ninguno, ahí sí no hay lista a la que
  // volver.
  const volverA = grupos && grupos.length > 0 ? `/grupos/${slug}` : "/torneos";

  return (
    <GruposNuevoCliente
      nombre={perfil?.nombre ?? "jugador"}
      torneoId={torneo.id}
      torneoSlug={torneo.slug}
      volverA={volverA}
    />
  );
}
