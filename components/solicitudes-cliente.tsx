"use client";

import { useState } from "react";
import { Check, Inbox, X } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";

export type Solicitud = {
  id: number;
  email: string;
  nota: string | null;
  creado_en: string;
};

function fecha(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SolicitudesCliente({
  solicitudes: iniciales,
}: {
  solicitudes: Solicitud[];
}) {
  const [solicitudes, setSolicitudes] = useState(iniciales);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const resolver = async (id: number, aprobar: boolean) => {
    setProcesando(id);
    const supabase = createClient();
    const { error } = await supabase.rpc("resolver_solicitud", {
      solicitud_id: id,
      aprobar,
    });
    setProcesando(null);

    if (error) {
      setAviso("No se pudo procesar la solicitud. Intenta de nuevo.");
      setTimeout(() => setAviso(null), 4000);
      return;
    }

    setSolicitudes((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Solicitudes de acceso" backHref="/perfil" />

      {solicitudes.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          No hay solicitudes pendientes.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {solicitudes.map((s) => (
            <div key={s.id} className="rounded-xl bg-surface-card p-4">
              <div className="flex items-center gap-3">
                <Inbox
                  className="h-[18px] w-[18px] flex-shrink-0"
                  style={{ color: "var(--icons-secondary)" }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-body-md">{s.email}</div>
                  <div className="mt-px text-label-md text-text-secondary">
                    {fecha(s.creado_en)}
                    {s.nota ? ` · ${s.nota}` : ""}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => resolver(s.id, false)}
                  disabled={procesando === s.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-action-button"
                  style={{
                    border: "1px solid var(--border)",
                    color: "var(--feedback-danger)",
                    opacity: procesando === s.id ? 0.5 : 1,
                  }}
                >
                  <X className="h-[16px] w-[16px]" />
                  Rechazar
                </button>
                <button
                  onClick={() => resolver(s.id, true)}
                  disabled={procesando === s.id}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-action-button"
                  style={{
                    backgroundColor: "var(--accent-default)",
                    color: "var(--text-on-accent)",
                    opacity: procesando === s.id ? 0.5 : 1,
                  }}
                >
                  <Check className="h-[16px] w-[16px]" />
                  Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {aviso && (
        <div
          className="fixed bottom-6 left-1/2 z-50 flex max-w-[calc(100%-36px)] -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-center text-body-md-bold shadow-lg"
          style={{
            backgroundColor: "var(--feedback-danger-surface)",
            color: "var(--feedback-danger)",
          }}
        >
          {aviso}
        </div>
      )}
    </main>
  );
}
