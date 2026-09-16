"use client";

import { useMemo, useState } from "react";
import { Lock, RotateCcw } from "lucide-react";
import { Escudo, type EquipoEscudo } from "@/components/escudo";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";
import { etiquetaFase, etiquetaLeg } from "@/lib/fases";
import { formatoDeFase, ordenarFases, type ConfigTorneo } from "@/lib/config-torneo";

type EquipoAdmin = EquipoEscudo & { id: number };

export type PartidoAdmin = {
  id: number;
  fase: string;
  leg: number | null;
  tie_id: number | null;
  gameday_id: number | null;
  inicio_utc: string | null;
  status: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  resuelto_en: string | null;
  editado_manual: boolean;
  ref_local: string | null;
  ref_visitante: string | null;
  local: EquipoAdmin | null;
  visitante: EquipoAdmin | null;
};

type Borrador = {
  marcador_local: string;
  marcador_visitante: string;
  prorroga_local: string;
  prorroga_visitante: string;
  penales_local: string;
  penales_visitante: string;
};

function aBorrador(p: PartidoAdmin): Borrador {
  const s = (n: number | null) => (n == null ? "" : String(n));
  return {
    marcador_local: s(p.marcador_local),
    marcador_visitante: s(p.marcador_visitante),
    prorroga_local: s(p.prorroga_local),
    prorroga_visitante: s(p.prorroga_visitante),
    penales_local: s(p.penales_local),
    penales_visitante: s(p.penales_visitante),
  };
}

function aNumero(v: string): number | null {
  const limpio = v.trim();
  if (limpio === "") return null;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function nombreLado(equipo: EquipoAdmin | null, ref: string | null) {
  return equipo?.nombre ?? ref ?? "Por definir";
}

function horaLocal(iso: string | null) {
  if (!iso) return "Por definir";
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CampoNumero({
  valor,
  onChange,
  disabled,
  ancho = "w-14",
}: {
  valor: string;
  onChange: (v: string) => void;
  disabled: boolean;
  ancho?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={valor}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
      className={`${ancho} rounded-lg px-2 py-1.5 text-center text-body-sm outline-none`}
      style={{
        backgroundColor: "var(--surface-input)",
        border: "1px solid var(--border)",
        color: "var(--text-primary)",
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

function FilaPartido({
  partido,
  esKO,
  onGuardado,
}: {
  partido: PartidoAdmin;
  esKO: boolean;
  onGuardado: (id: number, cambios: Partial<PartidoAdmin>) => void;
}) {
  const [borrador, setBorrador] = useState(() => aBorrador(partido));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (campo: keyof Borrador) => (v: string) =>
    setBorrador((prev) => ({ ...prev, [campo]: v }));

  const guardar = async () => {
    setGuardando(true);
    setError(null);

    const ml = aNumero(borrador.marcador_local);
    const mv = aNumero(borrador.marcador_visitante);
    if (ml == null || mv == null) {
      setGuardando(false);
      setError("Falta el marcador.");
      return;
    }

    const pl = aNumero(borrador.prorroga_local);
    const pv = aNumero(borrador.prorroga_visitante);
    const kl = aNumero(borrador.penales_local);
    const kv = aNumero(borrador.penales_visitante);

    const cambios: Record<string, unknown> = {
      marcador_local: ml,
      marcador_visitante: mv,
      status: "finished",
      editado_manual: true,
    };

    if (esKO) {
      cambios.prorroga_local = pl;
      cambios.prorroga_visitante = pv;
      cambios.penales_local = kl;
      cambios.penales_visitante = kv;
      cambios.resuelto_en =
        kl != null && kv != null ? "penales" : pl != null && pv != null ? "prorroga" : "agregado";
    }

    const supabase = createClient();
    const { error: errorGuardado } = await supabase
      .from("matches")
      .update(cambios)
      .eq("id", partido.id);

    setGuardando(false);

    if (errorGuardado) {
      setError("No se pudo guardar. Intenta de nuevo.");
      return;
    }

    onGuardado(partido.id, { ...cambios, editado_manual: true } as Partial<PartidoAdmin>);
  };

  const devolverAAutomatico = async () => {
    setGuardando(true);
    const supabase = createClient();
    const { error: errorGuardado } = await supabase
      .from("matches")
      .update({ editado_manual: false })
      .eq("id", partido.id);
    setGuardando(false);

    if (!errorGuardado) {
      onGuardado(partido.id, { editado_manual: false });
    }
  };

  const leg = etiquetaLeg(partido.leg);
  const meta = [horaLocal(partido.inicio_utc), leg].filter(Boolean).join(" · ");

  return (
    <div className="mb-2 rounded-xl bg-surface-card p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-label-md text-text-secondary">{meta}</span>
        {partido.editado_manual && (
          <span
            className="flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-1 text-label-sm"
            style={{
              backgroundColor: "var(--feedback-warning-surface)",
              color: "var(--feedback-warning)",
            }}
          >
            <Lock className="h-[11px] w-[11px]" />
            Editado a mano
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Escudo equipo={partido.local} size={22} />
          <span className="truncate text-body-sm">
            {nombreLado(partido.local, partido.ref_local)}
          </span>
        </div>
        <CampoNumero
          valor={borrador.marcador_local}
          onChange={set("marcador_local")}
          disabled={guardando}
        />
        <span className="text-label-md text-text-secondary">-</span>
        <CampoNumero
          valor={borrador.marcador_visitante}
          onChange={set("marcador_visitante")}
          disabled={guardando}
        />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-right">
          <span className="truncate text-body-sm">
            {nombreLado(partido.visitante, partido.ref_visitante)}
          </span>
          <Escudo equipo={partido.visitante} size={22} />
        </div>
      </div>

      {esKO && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-label-md text-text-secondary">
          <span className="flex items-center gap-1">
            Prórroga
            <CampoNumero
              valor={borrador.prorroga_local}
              onChange={set("prorroga_local")}
              disabled={guardando}
              ancho="w-10"
            />
            -
            <CampoNumero
              valor={borrador.prorroga_visitante}
              onChange={set("prorroga_visitante")}
              disabled={guardando}
              ancho="w-10"
            />
          </span>
          <span className="flex items-center gap-1">
            Penales
            <CampoNumero
              valor={borrador.penales_local}
              onChange={set("penales_local")}
              disabled={guardando}
              ancho="w-10"
            />
            -
            <CampoNumero
              valor={borrador.penales_visitante}
              onChange={set("penales_visitante")}
              disabled={guardando}
              ancho="w-10"
            />
          </span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-label-md" style={{ color: "var(--feedback-danger)" }}>
          {error}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 rounded-lg py-2 text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: guardando ? 0.5 : 1,
          }}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
        {partido.editado_manual && (
          <button
            onClick={devolverAAutomatico}
            disabled={guardando}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-action-button"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-secondary)",
              opacity: guardando ? 0.5 : 1,
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Automático
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultadosCliente({
  partidos: iniciales,
  config,
  volverA,
}: {
  partidos: PartidoAdmin[];
  config: ConfigTorneo;
  volverA: string;
}) {
  const [partidos, setPartidos] = useState(iniciales);

  const actualizar = (id: number, cambios: Partial<PartidoAdmin>) => {
    setPartidos((prev) => prev.map((p) => (p.id === id ? { ...p, ...cambios } : p)));
  };

  const grupos = useMemo(() => {
    const fases = ordenarFases(config, partidos.map((p) => p.fase));
    return fases.map((fase) => ({
      fase,
      partidos: partidos.filter((p) => p.fase === fase),
    }));
  }, [partidos, config]);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Cargar resultados" backHref={volverA} />

      <p className="mb-4 text-body-sm text-text-secondary">
        Uso de emergencia: si la sincronización con la API falla, carga el
        resultado acá. Ese partido queda &quot;editado a mano&quot; y el sync automático
        lo deja en paz hasta que lo devuelvas.
      </p>

      {grupos.map(({ fase, partidos: delaFase }) => {
        if (delaFase.length === 0) return null;
        const esKO = formatoDeFase(config, fase) !== "puntos";

        return (
          <div key={fase} className="mb-5">
            <h2 className="mb-3 text-heading-md">{etiquetaFase(fase)}</h2>
            {delaFase.map((partido) => (
              <FilaPartido
                key={partido.id}
                partido={partido}
                esKO={esKO && (partido.leg === 2 || partido.leg == null)}
                onGuardado={actualizar}
              />
            ))}
          </div>
        );
      })}
    </main>
  );
}
