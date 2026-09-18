"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

type ResultadoSync = {
  ok?: boolean;
  error?: string;
  llamadas?: number;
  revisados?: number;
  actualizados?: number;
  sin_resultado_aun?: number;
  sin_mapear?: number;
  motivo?: string;
};

/**
 * Dispara la Edge Function sync-resultados bajo demanda (no hay cron: el
 * plan gratis de la API es de 100 requests/mes, alcanza para unos clicks
 * manuales por jornada, no para polling automático).
 */
export async function sincronizarResultados(tournamentId: number): Promise<ResultadoSync> {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke("sync-resultados", {
    body: { tournament_id: tournamentId },
  });

  if (error) {
    return { error: "No se pudo conectar con la sincronización. Intenta de nuevo." };
  }

  revalidatePath("/admin/resultados");
  return data as ResultadoSync;
}
