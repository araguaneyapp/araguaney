import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import { leerConfig, type ConfigTorneo } from "@/lib/config-torneo";

export type EstadoTorneo = "proximo" | "activo" | "finalizado";

export type Torneo = {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string | null;
  estado: EstadoTorneo;
  inicio: string | null;
  fin: string | null;
  orden: number;
  config: ConfigTorneo;
};

const COLUMNAS = "id, nombre, slug, logo_url, estado, config, inicio, fin, orden";

type FilaTorneo = {
  id: number;
  nombre: string;
  slug: string;
  logo_url: string | null;
  estado: EstadoTorneo;
  config: unknown;
  inicio: string | null;
  fin: string | null;
  orden: number;
};

function aTorneo(fila: FilaTorneo): Torneo {
  return { ...fila, config: leerConfig(fila.config) };
}

/** Todos los torneos, en el orden en que se muestran en el hub. */
export const getTorneos = cache(async (): Promise<Torneo[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select(COLUMNAS)
    .order("orden", { ascending: true });

  return ((data ?? []) as FilaTorneo[]).map(aTorneo);
});

/**
 * Torneo por slug de la URL. Lanza notFound() si no existe.
 *
 * Va envuelto en `cache` para que el layout y la página de una misma request
 * compartan una sola consulta.
 */
export const getTorneo = cache(async (slug: string): Promise<Torneo> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select(COLUMNAS)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  return aTorneo(data as FilaTorneo);
});
