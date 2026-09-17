"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase-server";

/**
 * Aprueba/rechaza vía el RPC que ya valida que quien llama sea el
 * `creado_por` del grupo (ver supabase/sql/grupos.sql). Revalida esta
 * pantalla y el layout raíz: la campana vive en Inicio, que es otra ruta.
 */
export async function resolverSolicitud(solicitudId: number, aprobar: boolean) {
  const supabase = await createClient();
  await supabase.rpc("resolver_solicitud_grupo", {
    p_solicitud_id: solicitudId,
    p_aprobar: aprobar,
  });

  revalidatePath("/solicitudes");
  revalidatePath("/", "layout");
}
