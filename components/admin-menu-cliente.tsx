"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Flag, RefreshCw, TriangleAlert, Volleyball } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { finalizarTorneo, sincronizarResultados } from "@/app/(app)/admin/resultados/actions";

type Dialogo = "resultados" | "goleador" | "finalizar" | null;

function Dialog({
  titulo,
  texto,
  procesando,
  onCancelar,
  onConfirmar,
}: {
  titulo: string;
  texto: string;
  procesando: boolean;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-8"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
      onClick={() => !procesando && onCancelar()}
    >
      <div
        className="w-full max-w-[300px] rounded-2xl p-5"
        style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-center text-heading-md">{titulo}</h3>
        <p className="mt-1 text-center text-body-sm text-text-secondary">{texto}</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancelar}
            disabled={procesando}
            className="flex-1 rounded-lg py-3 text-action-button"
            style={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
            }}
          >
            No
          </button>
          <button
            onClick={onConfirmar}
            disabled={procesando}
            className="flex-1 rounded-lg py-3 text-action-button"
            style={{
              backgroundColor: "var(--accent-default)",
              color: "var(--text-on-accent)",
              opacity: procesando ? 0.6 : 1,
            }}
          >
            {procesando ? "Actualizando..." : "Sí"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminMenuCliente({ torneoId }: { torneoId: number }) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [procesando, setProcesando] = useState(false);
  const [resumen, setResumenInterno] = useState<{ texto: string; esError: boolean } | null>(null);
  const setResumen = (texto: string, esError = false) => setResumenInterno({ texto, esError });

  const confirmarResultados = async () => {
    setProcesando(true);
    const resultado = await sincronizarResultados(torneoId);
    setProcesando(false);
    setDialogo(null);

    if (resultado.error) {
      setResumen(resultado.error, true);
      return;
    }
    const partes = [`${resultado.actualizados ?? 0} partidos actualizados`];
    if (resultado.sin_resultado_aun) {
      partes.push(`${resultado.sin_resultado_aun} sin resultado todavía`);
    }
    if (resultado.sin_mapear) {
      partes.push(`${resultado.sin_mapear} sin mapear a la API`);
    }
    partes.push(`tabla al día (${resultado.tabla_actualizada ?? 0} equipos)`);
    setResumen(partes.join(" · "));
    router.refresh();
  };

  const confirmarGoleador = () => {
    setDialogo(null);
    setResumen("Función en construcción — todavía no está conectada a la API.");
  };

  const confirmarFinalizar = async () => {
    setProcesando(true);
    const resultado = await finalizarTorneo(torneoId);
    setProcesando(false);
    setDialogo(null);

    if (resultado.error) {
      setResumen(resultado.error, true);
      return;
    }
    setResumen(
      `${resultado.gruposProcesados ?? 0} grupos notificados · ${resultado.correosEnviados ?? 0} correos enviados`
    );
  };

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <ScreenHeader title="Administrador" />

      <div className="mb-2 text-heading-md">Actualización vía API</div>
      <div className="mb-6 flex flex-col gap-2">
        <button
          onClick={() => setDialogo("resultados")}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
          style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
        >
          <RefreshCw className="h-[17px] w-[17px]" />
          Actualizar resultados
        </button>
        <button
          onClick={() => setDialogo("goleador")}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
          style={{ border: "1px solid var(--accent-default)", color: "var(--accent-default)" }}
        >
          <RefreshCw className="h-[17px] w-[17px]" />
          Actualizar al goleador
        </button>
      </div>

      <div className="mb-2 text-heading-md">Actualización manual</div>
      <div className="flex flex-col gap-2">
        <Link
          href="/admin/resultados/partidos"
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
          style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
        >
          <ClipboardList className="h-[17px] w-[17px]" />
          Cargar partidos
        </Link>
        <Link
          href="/admin/resultados/goleador"
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
          style={{ border: "1px solid var(--accent-default)", color: "var(--accent-default)" }}
        >
          <Volleyball className="h-[17px] w-[17px]" />
          Cargar goleador
        </Link>
      </div>

      <div className="mb-2 mt-6 text-heading-md">Cierre de torneo</div>
      <button
        onClick={() => setDialogo("finalizar")}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
        style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
      >
        <Flag className="h-[17px] w-[17px]" />
        Finalizar torneo
      </button>

      {resumen && (
        <div
          className="mt-4 flex items-center justify-center gap-2 text-center text-body-sm"
          style={{ color: resumen.esError ? "var(--feedback-danger)" : "var(--text-secondary)" }}
        >
          {resumen.esError && (
            <TriangleAlert className="h-[18px] w-[18px] flex-shrink-0" style={{ color: "var(--icons-error)" }} />
          )}
          <span>{resumen.texto}</span>
        </div>
      )}

      {dialogo === "resultados" && (
        <Dialog
          titulo="¿Actualizar resultados?"
          texto="Esto trae los resultados más recientes desde la API y sobrescribe los partidos que no hayas editado a mano."
          procesando={procesando}
          onCancelar={() => setDialogo(null)}
          onConfirmar={confirmarResultados}
        />
      )}

      {dialogo === "goleador" && (
        <Dialog
          titulo="¿Actualizar al goleador?"
          texto="Esto trae el goleador del torneo desde la API."
          procesando={false}
          onCancelar={() => setDialogo(null)}
          onConfirmar={confirmarGoleador}
        />
      )}

      {dialogo === "finalizar" && (
        <Dialog
          titulo="¿Finalizar torneo?"
          texto="Esto manda el correo de resultados finales (Top 10) a todos los miembros de todos los grupos de este torneo. No se puede deshacer."
          procesando={procesando}
          onCancelar={() => setDialogo(null)}
          onConfirmar={confirmarFinalizar}
        />
      )}
    </main>
  );
}
