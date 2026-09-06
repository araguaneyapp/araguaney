"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Flag } from "@/components/flag";
import { ScreenHeader } from "@/components/screen-header";
import {
  Plus,
  Minus,
  Lock,
  Check,
  ArrowUpDown,
  ChevronRight,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";

type Equipo = { id: number; nombre: string; codigo_iso: string };
type Prediccion = {
  marcador_local: number;
  marcador_visitante: number;
  usuario_id: string;
  equipo_avanza_predicho: number | null;
};
type Partido = {
  id: number;
  grupo: string | null;
  fase: string;
  gameday_id: number;
  inicio_utc: string;
  deadline: string;
  sede: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: Equipo | null;
  visitante: Equipo | null;
  predictions: Prediccion[];
};
type Gameday = { id: number; fecha: string; fase: string };

const FASES = [
  { valor: "grupos", label: "Grupos" },
  { valor: "dieciseisavos", label: "Dieciseisavos" },
  { valor: "octavos", label: "Octavos" },
  { valor: "cuartos", label: "Cuartos" },
  { valor: "semifinal", label: "Semifinales" },
  { valor: "tercer_lugar", label: "Tercer lugar" },
  { valor: "final", label: "Final" },
];

const ORDEN_FASES = [
  "grupos",
  "dieciseisavos",
  "octavos",
  "cuartos",
  "semifinal",
  "tercer_lugar",
  "final",
];

function calcularFaseActiva(partidos: Partido[]): string {
  const ahora = Date.now();

  const futuros = partidos
    .filter((p) => new Date(p.inicio_utc).getTime() >= ahora)
    .sort(
      (a, b) =>
        new Date(a.inicio_utc).getTime() - new Date(b.inicio_utc).getTime()
    );

  if (futuros.length > 0) {
    return futuros[0].fase;
  }

  const fasesConPartidos = partidos.map((p) => p.fase);
  for (let i = ORDEN_FASES.length - 1; i >= 0; i--) {
    if (fasesConPartidos.includes(ORDEN_FASES[i])) {
      return ORDEN_FASES[i];
    }
  }

  return "grupos";
}

type MarcadorState = Record<number, { local: number; visitante: number; tocado: boolean; avanza: number | null }>;

function tituloGameday(fecha: string) {
  const f = new Date(fecha + "T12:00:00");
  const nombre = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${dd}/${mm}`;
}

function FilaEquipo({
  nombre,
  iso,
  valor,
  tocado,
  bloqueado,
  onCambio,
}: {
  nombre: string;
  iso: string | null;
  valor: number;
  tocado: boolean;
  bloqueado: boolean;
  onCambio: (delta: number) => void;
}) {
  const colorNumero = !tocado ? "var(--text-idle)" : "var(--text-primary)";
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {iso ? (
          <Flag iso={iso} size={24} />
        ) : (
          <span
            className="inline-block flex-shrink-0 rounded-full"
            style={{ width: 24, height: 24, backgroundColor: "var(--border)" }}
          />
        )}
        <span className="truncate text-body-md">{nombre}</span>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          disabled={bloqueado || valor === 0}
          onClick={() => onCambio(-1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border"
          style={{
            borderColor: "var(--border-strong)",
            opacity: bloqueado || valor === 0 ? 0.4 : 1,
          }}
        >
          <Minus className="h-[16px] w-[16px]" style={{ color: "var(--icons-secondary)" }} />
        </button>

        <span
          className="w-[28px] text-center text-display-md leading-none"
          style={{ color: colorNumero }}
        >
          {valor}
        </span>

        <button
          disabled={bloqueado}
          onClick={() => onCambio(1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--accent-default)", opacity: bloqueado ? 0.4 : 1 }}
        >
          <Plus className="h-[16px] w-[16px]" style={{ color: "var(--text-on-accent)" }} />
        </button>
      </div>
    </div>
  );
}

function TarjetaPartido({
  partido,
  marcador,
  bloqueado,
  onCambio,
  onAvanza,
}: {
  partido: Partido;
  marcador: { local: number; visitante: number; tocado: boolean; avanza: number | null };
  bloqueado: boolean;
  onCambio: (lado: "local" | "visitante", delta: number) => void;
  onAvanza: (equipoId: number) => void;
}) {
  const hora = new Date(partido.inicio_utc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const nombreLocal = partido.local?.nombre ?? partido.ref_local ?? "Por definir";
  const nombreVisitante =
    partido.visitante?.nombre ?? partido.ref_visitante ?? "Por definir";

  const esEliminatoria = partido.fase !== "grupos";
  const esEmpate = marcador.local === marcador.visitante;
  const mostrarAvanza =
    esEliminatoria && marcador.tocado && esEmpate && partido.local && partido.visitante;

  return (
    <div
      className="mb-2 rounded-xl bg-surface-card p-3"
      style={{ opacity: bloqueado ? 0.85 : 1 }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-label-md text-text-secondary">
          {hora}
          {partido.sede ? ` · ${partido.sede}` : ""}
        </span>
        {bloqueado ? (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-1 text-label-sm"
            style={{ backgroundColor: "var(--surface-card)", color: "var(--text-secondary)" }}
          >
            <Lock className="h-[11px] w-[11px]" />
            Bloqueado
          </span>
        ) : (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-1 text-label-sm"
            style={{
              backgroundColor: marcador.tocado ? "var(--feedback-success-surface)" : "var(--accent-subtle)",
              color: marcador.tocado ? "var(--feedback-success)" : "var(--accent-default)",
            }}
          >
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{
                backgroundColor: marcador.tocado
                  ? "var(--feedback-success)"
                  : "var(--accent-default)",
              }}
            />
            {marcador.tocado ? "Predicho" : "Pendiente"}
          </span>
        )}
      </div>

      <FilaEquipo
        nombre={nombreLocal}
        iso={partido.local?.codigo_iso ?? null}
        valor={marcador.local}
        tocado={marcador.tocado}
        bloqueado={bloqueado}
        onCambio={(delta) => onCambio("local", delta)}
      />
      <FilaEquipo
        nombre={nombreVisitante}
        iso={partido.visitante?.codigo_iso ?? null}
        valor={marcador.visitante}
        tocado={marcador.tocado}
        bloqueado={bloqueado}
        onCambio={(delta) => onCambio("visitante", delta)}
      />

      {mostrarAvanza && (
        <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
          <p className="mb-2 text-label-md-bold" style={{ color: "var(--accent-default)" }}>
            Empate: ¿quién avanza?
          </p>
          <div className="flex gap-2">
            <button
              disabled={bloqueado}
              onClick={() => onAvanza(partido.local!.id)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-label-md"
              style={{
                backgroundColor:
                  marcador.avanza === partido.local!.id ? "var(--accent-subtle)" : "var(--background)",
                border:
                  marcador.avanza === partido.local!.id
                    ? "1px solid var(--accent-default)"
                    : "1px solid var(--border)",
                opacity: bloqueado ? 0.5 : 1,
              }}
            >
              <Flag iso={partido.local!.codigo_iso} size={16} />
              <span className="truncate">{nombreLocal}</span>
            </button>
            <button
              disabled={bloqueado}
              onClick={() => onAvanza(partido.visitante!.id)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg px-2 py-2 text-label-md"
              style={{
                backgroundColor:
                  marcador.avanza === partido.visitante!.id ? "var(--accent-subtle)" : "var(--background)",
                border:
                  marcador.avanza === partido.visitante!.id
                    ? "1px solid var(--accent-default)"
                    : "1px solid var(--border)",
                opacity: bloqueado ? 0.5 : 1,
              }}
            >
              <Flag iso={partido.visitante!.codigo_iso} size={16} />
              <span className="truncate">{nombreVisitante}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function QuinielaCliente({
  partidos,
  gamedays,
  usuarioId,
  gruposCompletos,
  extrasCompletos,
}: {
  partidos: Partido[];
  gamedays: Gameday[];
  usuarioId: string;
  gruposCompletos: number;
  extrasCompletos: boolean;
}) {
  const [faseActiva, setFaseActiva] = useState(() => calcularFaseActiva(partidos));
  const [guardando, setGuardando] = useState<number | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const gamedayRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const barraFasesRef = useRef<HTMLDivElement | null>(null);
  const chipFaseActivaRef = useRef<HTMLButtonElement | null>(null);

  const [marcadores, setMarcadores] = useState<MarcadorState>(() => {
    const estado: MarcadorState = {};
    for (const p of partidos) {
      const pred = p.predictions.find((pr) => pr.usuario_id === usuarioId);
      estado[p.id] = pred
        ? {
            local: pred.marcador_local,
            visitante: pred.marcador_visitante,
            tocado: true,
            avanza: pred.equipo_avanza_predicho ?? null,
          }
        : { local: 0, visitante: 0, tocado: false, avanza: null };
    }
    return estado;
  });

  const cambiar = (partidoId: number, lado: "local" | "visitante", delta: number) => {
    setMarcadores((prev) => {
      const actual = prev[partidoId];
      const nuevoValor = Math.max(0, actual[lado] + delta);
      const nuevo = { ...actual, [lado]: nuevoValor, tocado: true };
      if (nuevo.local !== nuevo.visitante) {
        nuevo.avanza = null;
      }
      return { ...prev, [partidoId]: nuevo };
    });
  };

  const elegirAvanza = (partidoId: number, equipoId: number) => {
    setMarcadores((prev) => ({
      ...prev,
      [partidoId]: { ...prev[partidoId], avanza: equipoId, tocado: true },
    }));
  };

  const guardarJornada = async (idsPartidos: number[], gamedayId: number) => {
    const ahora = new Date();
    const idsAbiertos = new Set(
      partidos
        .filter((p) => new Date(p.deadline) > ahora)
        .map((p) => p.id)
    );

    const partidosPorId = new Map(partidos.map((p) => [p.id, p]));

    const candidatos = idsPartidos.filter(
      (id) => marcadores[id]?.tocado && idsAbiertos.has(id)
    );

    for (const id of candidatos) {
      const p = partidosPorId.get(id);
      if (!p) continue;
      const m = marcadores[id];
      const esEliminatoria = p.fase !== "grupos";
      const esEmpate = m.local === m.visitante;
      if (esEliminatoria && esEmpate && m.avanza == null) {
        setErrorMsg(
          "En los partidos de eliminatorias que empatas, debes elegir quién avanza antes de guardar."
        );
        setTimeout(() => setErrorMsg(null), 4000);
        return;
      }
    }

    const aGuardar = candidatos.map((id) => {
      const p = partidosPorId.get(id);
      const m = marcadores[id];
      const esEliminatoria = p?.fase !== "grupos";
      const esEmpate = m.local === m.visitante;
      return {
        usuario_id: usuarioId,
        match_id: id,
        marcador_local: m.local,
        marcador_visitante: m.visitante,
        equipo_avanza_predicho: esEliminatoria && esEmpate ? m.avanza : null,
      };
    });

    if (aGuardar.length === 0) return;

    setGuardando(gamedayId);
    const supabase = createClient();
    const { error } = await supabase
      .from("predictions")
      .upsert(aGuardar, { onConflict: "usuario_id,match_id" });
    setGuardando(null);

    if (!error) {
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 3000);
    } else {
      alert("Hubo un error al guardar. Intenta de nuevo.");
    }
  };

  const partidosFase = partidos.filter((p) => p.fase === faseActiva);
  const gamedaysFase = gamedays.filter((g) => g.fase === faseActiva);
  const grupos = gamedaysFase
    .map((gd) => ({
      gameday: gd,
      partidos: partidosFase.filter((p) => p.gameday_id === gd.id),
    }))
    .filter((g) => g.partidos.length > 0);

  useEffect(() => {
    const barra = barraFasesRef.current;
    const chip = chipFaseActivaRef.current;
    if (!barra || !chip) return;
    const offset = chip.offsetLeft - barra.clientWidth / 2 + chip.clientWidth / 2;
    barra.scrollTo({ left: Math.max(0, offset), behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const relevante =
      grupos.find((g) => {
        const f = new Date(g.gameday.fecha + "T12:00:00");
        f.setHours(0, 0, 0, 0);
        return f >= hoy;
      }) ?? null;

    if (relevante) {
      const el = gamedayRefs.current[relevante.gameday.id];
      if (el) {
        el.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }
    }
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faseActiva]);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader
        title="Quiniela"
        bar={
          <div className="relative -mx-5">
            <div
              ref={barraFasesRef}
              className="flex h-11 items-center gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {FASES.map((fase) => {
                const activa = fase.valor === faseActiva;
                return (
                  <button
                    key={fase.valor}
                    ref={activa ? chipFaseActivaRef : null}
                    onClick={() => setFaseActiva(fase.valor)}
                    className="h-9 flex-shrink-0 rounded-full px-4 text-label-md"
                    style={{
                      backgroundColor: activa ? "var(--accent-default)" : "var(--surface-card)",
                      color: activa ? "var(--text-on-accent)" : "var(--text-tertiary)",
                    }}
                  >
                    {fase.label}
                  </button>
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute right-0 top-0 h-full w-10"
              style={{ background: "linear-gradient(90deg, transparent, var(--background))" }}
            />
          </div>
        }
      />

      {faseActiva === "grupos" && (
        <div className="mb-4 flex flex-col gap-2">
          <Link
            href="/quiniela/clasificados"
            className="caja-dorada flex items-center justify-between rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <ArrowUpDown
                className="h-[17px] w-[17px]"
                style={{ color: "var(--icons-primary)" }}
              />
              <div>
                <div className="text-body-sm">¿Quiénes clasifican?</div>
                <div className="mt-px text-label-sm text-text-secondary">
                  {gruposCompletos} de 12 grupos
                </div>
              </div>
            </div>
            <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
          </Link>

          <Link
            href="/quiniela/extras"
            className="caja-dorada flex items-center justify-between rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <Star className="h-[17px] w-[17px]" style={{ color: "var(--icons-primary)" }} />
              <div>
                <div className="text-body-sm">Tus extras</div>
                <div className="mt-px text-label-sm text-text-secondary">
                  {extrasCompletos ? "Completo" : "Por elegir"}
                </div>
              </div>
            </div>
            <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
          </Link>
        </div>
      )}

      {grupos.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No hay partidos en esta fase todavía.
        </p>
      ) : (
        grupos.map(({ gameday, partidos: ps }) => {
          const idsJornada = ps.map((p) => p.id);
          const hayTocadosNoBloqueados = ps.some(
            (p) => marcadores[p.id]?.tocado && new Date(p.deadline) > new Date()
          );
          const guardandoEsta = guardando === gameday.id;
          return (
            <div
              key={gameday.id}
              ref={(el) => {
                gamedayRefs.current[gameday.id] = el;
              }}
              className="mb-6 scroll-mt-[var(--layout-content-offset-nav)]"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-body-sm">
                  {tituloGameday(gameday.fecha)}
                </span>
                <span className="text-label-sm text-text-secondary">
                  {ps.length} {ps.length === 1 ? "partido" : "partidos"}
                </span>
              </div>

              {ps.map((p) => {
                const bloqueado = new Date(p.deadline) <= new Date();
                return (
                  <TarjetaPartido
                    key={p.id}
                    partido={p}
                    marcador={marcadores[p.id]}
                    bloqueado={bloqueado}
                    onCambio={(lado, delta) => cambiar(p.id, lado, delta)}
                    onAvanza={(equipoId) => elegirAvanza(p.id, equipoId)}
                  />
                );
              })}

              <button
                disabled={!hayTocadosNoBloqueados || guardandoEsta}
                onClick={() => guardarJornada(idsJornada, gameday.id)}
                className="mt-1 w-full rounded-lg py-3 text-center text-action-button"
                style={{
                  backgroundColor: "var(--accent-default)",
                  color: "var(--text-on-accent)",
                  opacity: !hayTocadosNoBloqueados || guardandoEsta ? 0.4 : 1,
                }}
              >
                {guardandoEsta ? "Guardando..." : "Guardar jornada"}
              </button>
            </div>
          );
        })
      )}

      {errorMsg && (
        <div
          className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-36px)] max-w-[400px] -translate-x-1/2 rounded-xl px-4 py-3 text-center text-body-sm shadow-lg"
          style={{ backgroundColor: "var(--feedback-danger-surface)", color: "var(--feedback-danger)" }}
        >
          {errorMsg}
        </div>
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