"use client";

import { useState } from "react";
import { Flag } from "@/components/flag";
import { ScreenHeader } from "@/components/screen-header";
import { Check, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Equipo = { id: number; nombre: string; codigo_iso: string; grupo: string };
type Prediccion = { grupo: string; equipo_id: number; posicion: number };

type Seleccion = Record<string, { primero: number | null; segundo: number | null }>;

export function ClasificadosCliente({
  equipos,
  predicciones,
  usuarioId,
  deadline,
}: {
  equipos: Equipo[];
  predicciones: Prediccion[];
  usuarioId: string;
  deadline: string | null;
}) {
  const grupos = Array.from(new Set(equipos.map((e) => e.grupo))).sort();
  const cerrado = deadline != null && new Date(deadline) <= new Date();

  const [seleccion, setSeleccion] = useState<Seleccion>(() => {
    const estado: Seleccion = {};
    for (const g of grupos) {
      const p1 = predicciones.find((p) => p.grupo === g && p.posicion === 1);
      const p2 = predicciones.find((p) => p.grupo === g && p.posicion === 2);
      estado[g] = { primero: p1?.equipo_id ?? null, segundo: p2?.equipo_id ?? null };
    }
    return estado;
  });

  const [guardando, setGuardando] = useState<string | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);

  const tocarEquipo = (grupo: string, equipoId: number) => {
    if (cerrado) return;
    setSeleccion((prev) => {
      const actual = prev[grupo];
      if (actual.primero === equipoId) {
        return { ...prev, [grupo]: { primero: actual.segundo, segundo: null } };
      }
      if (actual.segundo === equipoId) {
        return { ...prev, [grupo]: { primero: actual.primero, segundo: null } };
      }
      if (actual.primero === null) {
        return { ...prev, [grupo]: { ...actual, primero: equipoId } };
      }
      if (actual.segundo === null) {
        return { ...prev, [grupo]: { ...actual, segundo: equipoId } };
      }
      return prev;
    });
  };

  const guardarGrupo = async (grupo: string) => {
    const sel = seleccion[grupo];
    if (sel.primero === null || sel.segundo === null) return;

    setGuardando(grupo);
    const supabase = createClient();

    await supabase
      .from("group_predictions")
      .delete()
      .eq("usuario_id", usuarioId)
      .eq("grupo", grupo);

    const { error } = await supabase.from("group_predictions").insert([
      { usuario_id: usuarioId, grupo, equipo_id: sel.primero, posicion: 1 },
      { usuario_id: usuarioId, grupo, equipo_id: sel.segundo, posicion: 2 },
    ]);

    setGuardando(null);

    if (!error) {
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 3000);
    } else {
      alert("Hubo un error al guardar. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="¿Quiénes clasifican?" backHref="/quiniela" />

      {cerrado && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-label-md"
          style={{ backgroundColor: "var(--feedback-danger-surface)", color: "var(--feedback-danger)" }}
        >
          <Lock className="h-4 w-4" />
          Las predicciones de clasificados ya están cerradas.
        </div>
      )}

      {grupos.map((grupo) => {
        const equiposGrupo = equipos.filter((e) => e.grupo === grupo);
        const sel = seleccion[grupo];
        const completo = sel.primero !== null && sel.segundo !== null;
        const guardandoEste = guardando === grupo;
        return (
          <div key={grupo} className="mb-5 rounded-xl bg-surface-card p-4">
            <h2 className="mb-3 text-heading-md">Grupo {grupo}</h2>

            <div className="flex flex-col gap-2">
              {equiposGrupo.map((equipo) => {
                const esPrimero = sel.primero === equipo.id;
                const esSegundo = sel.segundo === equipo.id;
                const elegido = esPrimero || esSegundo;
                return (
                  <button
                    key={equipo.id}
                    onClick={() => tocarEquipo(grupo, equipo.id)}
                    disabled={cerrado}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: elegido ? "var(--accent-subtle)" : "var(--background)",
                      border: elegido
                        ? "1px solid var(--accent-default)"
                        : "1px solid var(--border)",
                      opacity: cerrado ? 0.6 : 1,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Flag iso={equipo.codigo_iso} size={22} />
                      <span className="text-body-sm">{equipo.nombre}</span>
                    </div>
                    {elegido && (
                      <span
                        className="flex h-[22px] w-[22px] items-center justify-center rounded-full text-label-md-bold"
                        style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
                      >
                        {esPrimero ? "1º" : "2º"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-label-md text-text-secondary">
              Elige 1º y 2º. No se predicen mejores terceros.
            </p>

            {!cerrado && (
              <button
                disabled={!completo || guardandoEste}
                onClick={() => guardarGrupo(grupo)}
                className="mt-3 w-full rounded-lg py-3 text-center text-action-button"
                style={{
                  backgroundColor: "var(--accent-default)",
                  color: "var(--text-on-accent)",
                  opacity: !completo || guardandoEste ? 0.4 : 1,
                }}
              >
                {guardandoEste ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        );
      })}

      {bannerVisible && (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-body-md-bold shadow-lg"
          style={{ backgroundColor: "var(--feedback-success)", color: "var(--text-on-accent)" }}
        >
          <Check className="h-[18px] w-[18px]" />
          Guardado
        </div>
      )}
    </main>
  );
}