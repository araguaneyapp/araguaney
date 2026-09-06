import { ScreenHeader } from "@/components/screen-header";
import { CompeticionTabs } from "@/components/competicion-tabs";
import { getTorneo } from "@/lib/torneo";

/**
 * Cabecera y tabs compartidas por Partidos, Eliminatorias y Tabla.
 * El route group (competicion) agrupa las tres sin añadir segmento a la URL.
 */
export default async function CompeticionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ torneo: string }>;
}) {
  const { torneo: slug } = await params;
  const torneo = await getTorneo(slug);

  return (
    <main className="min-h-screen px-5 pb-6">
      {/*
        Sin flecha de volver: dentro del torneo no hay "atrás" que tenga
        sentido. Se cambia de competición desde Perfil.
      */}
      <ScreenHeader title={torneo.nombre} bar={<CompeticionTabs />} />
      {children}
    </main>
  );
}
