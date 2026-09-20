"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellDot } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { contarSolicitudesPendientes } from "@/lib/solicitudes";

/**
 * Mismo ícono (BellDot) en los dos estados, solo cambia el color: rojo con
 * pendientes, `icons-disable` sin ellas. Solo se renderiza si el caller ya
 * confirmó que el usuario administra al menos un grupo.
 *
 * `hayPendientes` llega del server para el primer render (sin flash), y de
 * ahí en adelante se mantiene sola: se suscribe a cambios en
 * `group_join_requests` vía Realtime, así que si llega una solicitud nueva
 * mientras el usuario está parado en Inicio/Perfil, la campana se enciende
 * sola sin recargar la página.
 */
export function CampanaSolicitudes({
  hayPendientes: hayPendientesInicial,
  usuarioId,
}: {
  hayPendientes: boolean;
  usuarioId: string;
}) {
  const [hayPendientes, setHayPendientes] = useState(hayPendientesInicial);

  useEffect(() => {
    const supabase = createClient();

    // Sin filtro por group_id: la RLS de group_join_requests ya limita lo
    // que Realtime entrega a este usuario (sus propias solicitudes o las de
    // los grupos que administra) — recontar de una en vez de interpretar el
    // payload del evento cubre altas, aprobaciones y rechazos por igual.
    const canal = supabase
      .channel(`solicitudes-admin-${usuarioId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_join_requests" },
        async () => {
          const actualizado = await contarSolicitudesPendientes(supabase, usuarioId);
          setHayPendientes(actualizado.hayPendientes);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  return (
    <Link href="/solicitudes" className="flex-shrink-0">
      <BellDot
        className="h-6 w-6"
        style={{
          color: hayPendientes ? "var(--icons-error)" : "var(--icons-disable)",
        }}
      />
    </Link>
  );
}
