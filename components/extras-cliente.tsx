"use client";

import { useState } from "react";
import { Flag } from "@/components/flag";
import { ScreenHeader } from "@/components/screen-header";
import { ChevronDown, Check, Lock, Trophy, Medal, Target } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Equipo = { id: number; nombre: string; codigo_iso: string };
type Extras = {
  campeon_id: number | null;
  subcampeon_id: number | null;
  goleador_nombre: string | null;
} | null;

function SelectorEquipo({
  titulo,
  icono,
  equipos,
  seleccionado,
  excluir,
  abierto,
  onToggle,
  onElegir,
  bloqueado,
}: {
  titulo: string;
  icono: React.ReactNode;
  equipos: Equipo[];
  seleccionado: number | null;
  excluir: number | null;
  abierto: boolean;
  onToggle: () => void;
  onElegir: (id: number) => void;
  bloqueado: boolean;
}) {
  const equipoSel = equipos.find((e) => e.id === seleccionado) ?? null;
  const lista = equipos.filter((e) => e.id !== excluir);

  return (
    <div className="mb-3 rounded-xl bg-surface-card p-4">
      <button
        onClick={onToggle}
        disabled={bloqueado}
        className="flex w-full items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {icono}
          <span className="text-body-sm">{titulo}</span>
        </div>
        <div className="flex items-center gap-2">
          {equipoSel ? (
            <div className="flex items-center gap-2">
              <Flag iso={equipoSel.codigo_iso} size={22} />
              <span className="text-body-sm">{equipoSel.nombre}</span>
            </div>
          ) : (
            <span className="text-body-sm text-text-secondary">Sin elegir</span>
          )}
          {!bloqueado && (
            <ChevronDown
              className="h-[17px] w-[17px] transition-transform"
              style={{
                color: "var(--icons-secondary)",
                transform: abierto ? "rotate(180deg)" : "none",
              }}
            />
          )}
        </div>
      </button>

      {abierto && !bloqueado && (
        <div className="mt-3 flex max-h-[280px] flex-col gap-1 overflow-y-auto">
          {lista.map((equipo) => {
            const activo = equipo.id === seleccionado;
            return (
              <button
                key={equipo.id}
                onClick={() => onElegir(equipo.id)}
                className="flex items-center gap-2 rounded-lg px-3 py-2"
                style={{
                  backgroundColor: activo ? "var(--accent-subtle)" : "var(--background)",
                  border: activo
                    ? "1px solid var(--accent-default)"
                    : "1px solid var(--border)",
                }}
              >
                <Flag iso={equipo.codigo_iso} size={20} />
                <span className="text-body-sm">{equipo.nombre}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExtrasCliente({
  equipos,
  extras,
  usuarioId,
  deadline,
}: {
  equipos: Equipo[];
  extras: Extras;
  usuarioId: string;
  deadline: string | null;
}) {
  const cerrado = deadline != null && new Date(deadline) <= new Date();

  const [campeon, setCampeon] = useState<number | null>(extras?.campeon_id ?? null);
  const [subcampeon, setSubcampeon] = useState<number | null>(extras?.subcampeon_id ?? null);
  const [goleador, setGoleador] = useState(extras?.goleador_nombre ?? "");
  const [abierto, setAbierto] = useState<"campeon" | "subcampeon" | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const completo =
    campeon !== null && subcampeon !== null && goleador.trim().length > 0;

  const guardar = async () => {
    if (!completo) return;
    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase.from("special_predictions").upsert(
      {
        usuario_id: usuarioId,
        campeon_id: campeon,
        subcampeon_id: subcampeon,
        goleador_nombre: goleador.trim(),
      },
      { onConflict: "usuario_id" }
    );
    setGuardando(false);

    if (!error) {
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 3000);
    } else {
      alert("Hubo un error al guardar. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Tus extras" backHref="/quiniela" />

      {cerrado && (
        <div
          className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-label-md"
          style={{ backgroundColor: "var(--feedback-danger-surface)", color: "var(--feedback-danger)" }}
        >
          <Lock className="h-4 w-4" />
          Las predicciones extras ya están cerradas.
        </div>
      )}

      <SelectorEquipo
        titulo="Campeón"
        icono={<Trophy className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />}
        equipos={equipos}
        seleccionado={campeon}
        excluir={subcampeon}
        abierto={abierto === "campeon"}
        onToggle={() => setAbierto(abierto === "campeon" ? null : "campeon")}
        onElegir={(id) => {
          setCampeon(id);
          setAbierto(null);
        }}
        bloqueado={cerrado}
      />

      <SelectorEquipo
        titulo="Subcampeón"
        icono={<Medal className="h-[18px] w-[18px]" style={{ color: "var(--podium-silver)" }} />}
        equipos={equipos}
        seleccionado={subcampeon}
        excluir={campeon}
        abierto={abierto === "subcampeon"}
        onToggle={() => setAbierto(abierto === "subcampeon" ? null : "subcampeon")}
        onElegir={(id) => {
          setSubcampeon(id);
          setAbierto(null);
        }}
        bloqueado={cerrado}
      />

      <div className="mb-3 rounded-xl bg-surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Target className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />
          <span className="text-body-sm">Goleador</span>
        </div>
        <input
          type="text"
          value={goleador}
          onChange={(e) => setGoleador(e.target.value)}
          disabled={cerrado}
          placeholder="Nombre del jugador"
          className="w-full rounded-lg px-3 py-2 text-body-sm outline-none"
          style={{
            backgroundColor: "var(--background)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      {!cerrado && (
        <button
          disabled={!completo || guardando}
          onClick={guardar}
          className="mt-2 w-full rounded-lg py-3 text-center text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: !completo || guardando ? 0.4 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar extras"}
        </button>
      )}

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