import Link from "next/link";
import { BellDot } from "lucide-react";

/**
 * Mismo ícono (BellDot) en los dos estados, solo cambia el color: rojo con
 * pendientes, `icons-disable` sin ellas. Solo se renderiza si el caller ya
 * confirmó que el usuario administra al menos un grupo.
 */
export function CampanaSolicitudes({ hayPendientes }: { hayPendientes: boolean }) {
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
