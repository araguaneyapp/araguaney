"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Search, X } from "lucide-react";
import { ScreenHeader } from "@/components/screen-header";
import { Escudo } from "@/components/escudo";
import { coincide } from "@/lib/texto";
import { guardarGoleadorOficial } from "@/app/(app)/admin/resultados/actions";
import type { JugadorOpcion } from "@/components/extras-cliente";

export function GoleadorPickerCliente({
  torneoId,
  jugadores,
  goleadorActualId,
}: {
  torneoId: number;
  jugadores: JugadorOpcion[];
  goleadorActualId: number | null;
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [candidato, setCandidato] = useState<JugadorOpcion | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actual = jugadores.find((j) => j.id === goleadorActualId) ?? null;
  const filtrados = jugadores.filter((j) => coincide(busqueda, [j.nombre, j.nombre_corto]));

  const confirmar = async () => {
    if (!candidato) return;
    setGuardando(true);
    setError(null);

    const resultado = await guardarGoleadorOficial(torneoId, candidato.id);
    setGuardando(false);

    if (resultado.error) {
      setError(resultado.error);
      return;
    }

    setCandidato(null);
    router.refresh();
  };

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <ScreenHeader title="Goleador oficial" backHref="/admin/resultados" />

      <p className="mb-4 text-body-sm text-text-secondary">
        Se usa para resolver la predicción especial de Goleador al
        finalizar el torneo. Se puede fijar en cualquier momento, incluso
        antes de la final.
      </p>

      {actual && (
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-card p-4">
          <Escudo equipo={actual.equipo} size={28} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-body-md-bold">{actual.nombre}</div>
            <div className="truncate text-label-sm text-text-secondary">
              Goleador oficial actual
            </div>
          </div>
          <Check className="h-5 w-5 flex-shrink-0" style={{ color: "var(--feedback-success)" }} />
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 rounded-lg bg-surface-card px-3 py-2.5">
        <Search className="h-[18px] w-[18px] flex-shrink-0" style={{ color: "var(--icons-secondary)" }} />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar jugador"
          className="w-full bg-transparent text-body-sm outline-none"
        />
        {busqueda && (
          <button onClick={() => setBusqueda("")}>
            <X className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
          </button>
        )}
      </div>

      {jugadores.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          Todavía no hay jugadores cargados en este torneo.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="rounded-xl bg-surface-card p-4 text-center text-body-sm text-text-secondary">
          No se encontró ningún jugador.
        </p>
      ) : (
        <div className="flex flex-col">
          {filtrados.map((jugador) => (
            <button
              key={jugador.id}
              onClick={() => setCandidato(jugador)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left"
            >
              <Escudo equipo={jugador.equipo} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-body-sm">{jugador.nombre}</span>
                {jugador.equipo && (
                  <span className="mt-px block truncate text-label-md text-text-secondary">
                    {jugador.equipo.nombre}
                  </span>
                )}
              </span>
              {jugador.id === goleadorActualId && (
                <Check className="h-4 w-4 flex-shrink-0" style={{ color: "var(--accent-default)" }} />
              )}
            </button>
          ))}
        </div>
      )}

      {candidato && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !guardando && setCandidato(null)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-center gap-3">
              <Escudo equipo={candidato.equipo} size={32} />
            </div>
            <h3 className="text-center text-heading-md">¿Confirmar goleador?</h3>
            <p className="mt-1 text-center text-body-sm text-text-secondary">
              <strong className="text-text-primary">{candidato.nombre}</strong> quedará
              como el goleador oficial del torneo.
            </p>
            {error && (
              <p className="mt-2 text-center text-label-md" style={{ color: "var(--feedback-danger)" }}>
                {error}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setCandidato(null)}
                disabled={guardando}
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
                onClick={confirmar}
                disabled={guardando}
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--accent-default)",
                  color: "var(--text-on-accent)",
                  opacity: guardando ? 0.6 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Sí"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
