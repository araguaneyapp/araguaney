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
  tabla_actualizada?: number;
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

  // También toca Tabla/Partidos del torneo, cuyo path exacto no se conoce
  // acá (depende del slug) — se invalida todo para no dejar nada cacheado.
  revalidatePath("/", "layout");
  return data as ResultadoSync;
}

type ResultadoFinal = {
  ok?: boolean;
  error?: string;
  gruposProcesados?: number;
  correosEnviados?: number;
};

/**
 * Dispara el correo de resultados finales (Top 10 por grupo). Es una
 * decisión del SuperAdmin, no algo automático — la Edge Function igual
 * valida que la final ya tenga resultado antes de mandar nada.
 */
export async function finalizarTorneo(tournamentId: number): Promise<ResultadoFinal> {
  const supabase = await createClient();

  const { data, error } = await supabase.functions.invoke("finalizar-torneo", {
    body: { tournament_id: tournamentId },
  });

  if (error) {
    // La Edge Function manda un mensaje específico (ej. "la final no tiene
    // resultado todavía") en el body de la respuesta no-2xx — vale la pena
    // mostrarlo tal cual en vez de un genérico, es información accionable.
    const contexto = (error as { context?: Response }).context;
    const mensaje = await contexto?.json().catch(() => null);
    return { error: mensaje?.error ?? "No se pudo conectar con el cierre de torneo. Intenta de nuevo." };
  }

  return data as ResultadoFinal;
}
