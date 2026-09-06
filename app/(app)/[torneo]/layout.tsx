import { BottomNav } from "@/components/bottom-nav";
import { getTorneo } from "@/lib/torneo";

/**
 * Todo lo que cuelga de /[torneo] pertenece a un torneo concreto: aquí se
 * valida el slug (getTorneo lanza notFound() si no existe) y se monta la barra
 * de navegación, que fuera de un torneo no tendría a dónde apuntar.
 *
 * La consulta va cacheada por request, así que las páginas hijas pueden volver
 * a llamar a getTorneo(slug) sin costo extra.
 */
export default async function TorneoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ torneo: string }>;
}) {
  const { torneo } = await params;
  await getTorneo(torneo);

  return (
    <div className="min-h-screen pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
