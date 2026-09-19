"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * Se usa tanto desde el registro (sin sesión) como desde Perfil (con
 * sesión), así que vuelve por historial del navegador en vez de un href
 * fijo.
 */
export function LegalVolver() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-6 flex items-center gap-1 text-body-sm text-text-secondary"
    >
      <ChevronLeft className="h-5 w-5" style={{ color: "var(--icons-secondary)" }} />
      Volver
    </button>
  );
}
