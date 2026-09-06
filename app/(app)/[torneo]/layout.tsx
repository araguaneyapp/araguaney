import { getTorneo } from "@/lib/torneo";

/**
 * Valida el slug de la URL para todo lo que cuelga de /[torneo].
 * Si no existe el torneo, getTorneo() lanza notFound().
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

  return <>{children}</>;
}
