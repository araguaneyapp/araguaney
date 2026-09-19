import { ScreenHeader } from "@/components/screen-header";

/**
 * Placeholder: falta el picker de jugadores (buscador/scroll + doble
 * confirmación) y poblar `players` con el roster real. Ver checklist.
 */
export default function AdminGoleadorPage() {
  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <ScreenHeader title="Cargar goleador" backHref="/admin/resultados" />
      <p className="text-body-sm text-text-secondary">
        Todavía en construcción.
      </p>
    </main>
  );
}
