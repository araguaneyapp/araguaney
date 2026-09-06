"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flag } from "@/components/flag";
import { ScreenHeader } from "@/components/screen-header";
import { createClient } from "@/lib/supabase-browser";
import { Plus, Minus, Check } from "lucide-react";

type Equipo = { id: number; nombre: string; codigo_iso: string };

type Partido = {
  id: number;
  grupo: string | null;
  fase: string;
  inicio_utc: string;
  status: string;
  marcador_local: number | null;
  marcador_visitante: number | null;
  penales_local: number | null;
  penales_visitante: number | null;
  prorroga_local: number | null;
  prorroga_visitante: number | null;
  resuelto_en: string | null;
  ref_local: string | null;
  ref_visitante: string | null;
  local: Equipo | null;
  visitante: Equipo | null;
};

type MarcadorState = Record<number, { local: number; visitante: number }>;
type Resolucion = "prorroga" | "penales" | null;

function claveDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  return `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
}

function tituloDia(inicioUtc: string) {
  const f = new Date(inicioUtc);
  const nombre = f.toLocaleDateString("es", { weekday: "long" });
  const dd = String(f.getDate()).padStart(2, "0");
  const mm = String(f.getMonth() + 1).padStart(2, "0");
  return `${nombre.charAt(0).toUpperCase() + nombre.slice(1)} ${dd}/${mm}`;
}

function horaLocal(inicioUtc: string) {
  return new Date(inicioUtc).toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nombreFase(fase: string) {
  const limpia = fase.replace(/_/g, " ");
  return limpia.charAt(0).toUpperCase() + limpia.slice(1);
}

function FilaEquipo({
  nombre,
  iso,
  valor,
  onCambio,
}: {
  nombre: string;
  iso: string | null;
  valor: number;
  onCambio: (delta: number) => void;
}) {
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
          disabled={valor === 0}
          onClick={() => onCambio(-1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border"
          style={{ borderColor: "var(--border-strong)", opacity: valor === 0 ? 0.4 : 1 }}
        >
          <Minus className="h-[16px] w-[16px]" style={{ color: "var(--icons-secondary)" }} />
        </button>

        <span
          className="w-[28px] text-center text-display-md leading-none"
          style={{ color: "var(--text-primary)" }}
        >
          {valor}
        </span>

        <button
          onClick={() => onCambio(1)}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--accent-default)" }}
        >
          <Plus className="h-[16px] w-[16px]" style={{ color: "var(--text-on-accent)" }} />
        </button>
      </div>
    </div>
  );
}

function StepperInstancia({
  etiqueta,
  isoLocal,
  isoVisitante,
  valorLocal,
  valorVisitante,
  onLocal,
  onVisitante,
}: {
  etiqueta: string;
  isoLocal: string | null;
  isoVisitante: string | null;
  valorLocal: number;
  valorVisitante: number;
  onLocal: (delta: number) => void;
  onVisitante: (delta: number) => void;
}) {
  return (
    <div className="flex items-start justify-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onLocal(-1)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <Minus className="h-[14px] w-[14px]" style={{ color: "var(--icons-secondary)" }} />
          </button>
          <span className="w-[24px] text-center text-display-md">{valorLocal}</span>
          <button
            onClick={() => onLocal(1)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--accent-default)" }}
          >
            <Plus className="h-[14px] w-[14px]" style={{ color: "var(--text-on-accent)" }} />
          </button>
        </div>
        {isoLocal && (
          <span className="text-label-sm uppercase text-text-secondary">
            {isoLocal}
          </span>
        )}
      </div>

      <span className="mt-2 text-label-sm text-text-secondary">{etiqueta}</span>

      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onVisitante(-1)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg border"
            style={{ borderColor: "var(--border-strong)" }}
          >
            <Minus className="h-[14px] w-[14px]" style={{ color: "var(--icons-secondary)" }} />
          </button>
          <span className="w-[24px] text-center text-display-md">{valorVisitante}</span>
          <button
            onClick={() => onVisitante(1)}
            className="flex h-[28px] w-[28px] items-center justify-center rounded-lg"
            style={{ backgroundColor: "var(--accent-default)" }}
          >
            <Plus className="h-[14px] w-[14px]" style={{ color: "var(--text-on-accent)" }} />
          </button>
        </div>
        {isoVisitante && (
          <span className="text-label-sm uppercase text-text-secondary">
            {isoVisitante}
          </span>
        )}
      </div>
    </div>
  );
}

export function AdminResultadosCliente({ partidos }: { partidos: Partido[] }) {
  const router = useRouter();

  const [marcadores, setMarcadores] = useState<MarcadorState>(() => {
    const estado: MarcadorState = {};
    for (const p of partidos) {
      estado[p.id] = {
        local: p.marcador_local ?? 0,
        visitante: p.marcador_visitante ?? 0,
      };
    }
    return estado;
  });

  const [confirmando, setConfirmando] = useState<Partido | null>(null);
  const [avanzaId, setAvanzaId] = useState<number | null>(null);
  const [resolucion, setResolucion] = useState<Resolucion>(null);
  const [penalesLocal, setPenalesLocal] = useState(0);
  const [penalesVisitante, setPenalesVisitante] = useState(0);
  const [prorrogaLocal, setProrrogaLocal] = useState(0);
  const [prorrogaVisitante, setProrrogaVisitante] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const cambiar = (partidoId: number, lado: "local" | "visitante", delta: number) => {
    setMarcadores((prev) => {
      const actual = prev[partidoId];
      const nuevoValor = Math.max(0, actual[lado] + delta);
      return { ...prev, [partidoId]: { ...actual, [lado]: nuevoValor } };
    });
  };

  const abrirConfirmacion = (p: Partido) => {
    setAvanzaId(null);
    setResolucion(null);
    setPenalesLocal(p.penales_local ?? 0);
    setPenalesVisitante(p.penales_visitante ?? 0);
    setProrrogaLocal(p.prorroga_local ?? marcadores[p.id].local);
    setProrrogaVisitante(p.prorroga_visitante ?? marcadores[p.id].visitante);
    setConfirmando(p);
  };

  const esEliminatoria = (p: Partido) => p.fase !== "grupos";

  const esEmpate = (p: Partido) =>
    marcadores[p.id].local === marcadores[p.id].visitante;

  const guardar = async () => {
    if (!confirmando) return;
    const p = confirmando;

    if (esEliminatoria(p) && avanzaId == null) return;
    if (esEliminatoria(p) && esEmpate(p) && resolucion == null) return;

    if (esEliminatoria(p) && esEmpate(p)) {
      let ganadorInstancia: number | null | undefined = undefined;
      if (resolucion === "penales" && penalesLocal !== penalesVisitante) {
        ganadorInstancia = penalesLocal > penalesVisitante ? p.local?.id : p.visitante?.id;
      } else if (resolucion === "prorroga" && prorrogaLocal !== prorrogaVisitante) {
        ganadorInstancia = prorrogaLocal > prorrogaVisitante ? p.local?.id : p.visitante?.id;
      }
      if (ganadorInstancia != null && ganadorInstancia !== avanzaId) {
        const ok = window.confirm(
          "El marcador de la instancia no concuerda con el equipo que marcaste como ganador. ¿Guardar de todas formas?"
        );
        if (!ok) return;
      }
    }

    setGuardando(true);
    const supabase = createClient();

    const payload: {
      marcador_local: number;
      marcador_visitante: number;
      status: string;
      equipo_avanza_id?: number;
      penales_local?: number | null;
      penales_visitante?: number | null;
      prorroga_local?: number | null;
      prorroga_visitante?: number | null;
      resuelto_en?: string | null;
    } = {
      marcador_local: marcadores[p.id].local,
      marcador_visitante: marcadores[p.id].visitante,
      status: "finished",
    };

    if (esEliminatoria(p) && avanzaId != null) {
      payload.equipo_avanza_id = avanzaId;
    }

    if (esEliminatoria(p)) {
      if (esEmpate(p)) {
        payload.resuelto_en = resolucion;
        if (resolucion === "penales") {
          payload.penales_local = penalesLocal;
          payload.penales_visitante = penalesVisitante;
          payload.prorroga_local = null;
          payload.prorroga_visitante = null;
        } else if (resolucion === "prorroga") {
          payload.prorroga_local = prorrogaLocal;
          payload.prorroga_visitante = prorrogaVisitante;
          payload.penales_local = null;
          payload.penales_visitante = null;
        }
      } else {
        payload.resuelto_en = "90";
        payload.penales_local = null;
        payload.penales_visitante = null;
        payload.prorroga_local = null;
        payload.prorroga_visitante = null;
      }
    }

    const { error } = await supabase
      .from("matches")
      .update(payload)
      .eq("id", p.id);

    setGuardando(false);
    setConfirmando(null);
    setAvanzaId(null);
    setResolucion(null);

    if (!error) {
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 3000);
      router.refresh();
    } else {
      alert("Hubo un error al guardar el resultado. Intenta de nuevo.");
    }
  };

  const grupos: { clave: string; titulo: string; partidos: Partido[] }[] = [];
  let claveActual = "";
  for (const p of partidos) {
    const clave = claveDia(p.inicio_utc);
    if (clave !== claveActual) {
      claveActual = clave;
      grupos.push({ clave, titulo: tituloDia(p.inicio_utc), partidos: [] });
    }
    grupos[grupos.length - 1].partidos.push(p);
  }

  const nombreLocal = (p: Partido) =>
    p.local?.nombre ?? p.ref_local ?? "Por definir";
  const nombreVisitante = (p: Partido) =>
    p.visitante?.nombre ?? p.ref_visitante ?? "Por definir";

  const empateElim =
    confirmando != null && esEliminatoria(confirmando) && esEmpate(confirmando);

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Cargar resultados" backHref="/perfil" />

      {partidos.length === 0 ? (
        <p className="text-body-sm text-text-secondary">
          No hay partidos pendientes por cargar.
        </p>
      ) : (
        grupos.map((g) => (
          <div key={g.clave} className="mb-5">
            <h2 className="mb-3 text-body-sm">{g.titulo}</h2>
            {g.partidos.map((p) => (
              <div key={p.id} className="mb-2 rounded-xl bg-surface-card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-label-md text-text-secondary">
                    {horaLocal(p.inicio_utc)}
                    {p.grupo ? ` · Grupo ${p.grupo}` : ` · ${nombreFase(p.fase)}`}
                  </span>
                </div>

                <FilaEquipo
                  nombre={nombreLocal(p)}
                  iso={p.local?.codigo_iso ?? null}
                  valor={marcadores[p.id].local}
                  onCambio={(delta) => cambiar(p.id, "local", delta)}
                />
                <FilaEquipo
                  nombre={nombreVisitante(p)}
                  iso={p.visitante?.codigo_iso ?? null}
                  valor={marcadores[p.id].visitante}
                  onCambio={(delta) => cambiar(p.id, "visitante", delta)}
                />

                <button
                  onClick={() => abrirConfirmacion(p)}
                  className="mt-2 w-full rounded-lg py-3 text-center text-action-button"
                  style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
                >
                  Cargar resultado
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !guardando && setConfirmando(null)}
        >
          <div
            className="w-full max-w-[320px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center text-heading-md">Confirmar resultado</h3>
            <div className="mt-4 flex items-center justify-center gap-3 text-body-sm">
              <span className="truncate">{nombreLocal(confirmando)}</span>
              <span className="text-display-md" style={{ color: "var(--accent-default)" }}>
                {marcadores[confirmando.id].local} - {marcadores[confirmando.id].visitante}
              </span>
              <span className="truncate">{nombreVisitante(confirmando)}</span>
            </div>

            {empateElim && (
              <>
                <p className="mt-4 text-center text-label-md-bold" style={{ color: "var(--accent-default)" }}>
                  ¿Cómo se resolvió?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setResolucion("prorroga")}
                    className="flex-1 rounded-lg py-2 text-label-md"
                    style={{
                      backgroundColor: resolucion === "prorroga" ? "var(--accent-subtle)" : "var(--background)",
                      border: resolucion === "prorroga" ? "1px solid var(--accent-default)" : "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Prórroga
                  </button>
                  <button
                    onClick={() => setResolucion("penales")}
                    className="flex-1 rounded-lg py-2 text-label-md"
                    style={{
                      backgroundColor: resolucion === "penales" ? "var(--accent-subtle)" : "var(--background)",
                      border: resolucion === "penales" ? "1px solid var(--accent-default)" : "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    Penales
                  </button>
                </div>

                {resolucion === "prorroga" && (
                  <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "var(--background)" }}>
                    <p className="mb-1 text-center text-label-md-bold" style={{ color: "var(--accent-default)" }}>
                      Marcador con prórroga
                    </p>
                    <StepperInstancia
                      etiqueta="AET"
                      isoLocal={confirmando.local?.codigo_iso ?? null}
                      isoVisitante={confirmando.visitante?.codigo_iso ?? null}
                      valorLocal={prorrogaLocal}
                      valorVisitante={prorrogaVisitante}
                      onLocal={(d) => setProrrogaLocal((v) => Math.max(0, v + d))}
                      onVisitante={(d) => setProrrogaVisitante((v) => Math.max(0, v + d))}
                    />
                  </div>
                )}

                {resolucion === "penales" && (
                  <div className="mt-3 rounded-xl p-3" style={{ backgroundColor: "var(--background)" }}>
                    <p className="mb-1 text-center text-label-md-bold" style={{ color: "var(--accent-default)" }}>
                      Penales
                    </p>
                    <StepperInstancia
                      etiqueta="PEN"
                      isoLocal={confirmando.local?.codigo_iso ?? null}
                      isoVisitante={confirmando.visitante?.codigo_iso ?? null}
                      valorLocal={penalesLocal}
                      valorVisitante={penalesVisitante}
                      onLocal={(d) => setPenalesLocal((v) => Math.max(0, v + d))}
                      onVisitante={(d) => setPenalesVisitante((v) => Math.max(0, v + d))}
                    />
                  </div>
                )}
              </>
            )}

            {esEliminatoria(confirmando) ? (
              <>
                <p className="mt-4 text-center text-label-md-bold" style={{ color: "var(--accent-default)" }}>
                  ¿Qué equipo avanzó?
                </p>
                <div className="mt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setAvanzaId(confirmando.local?.id ?? null)}
                    disabled={!confirmando.local}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-label-md"
                    style={{
                      backgroundColor:
                        avanzaId === confirmando.local?.id ? "var(--accent-subtle)" : "var(--background)",
                      border:
                        avanzaId === confirmando.local?.id
                          ? "1px solid var(--accent-default)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {confirmando.local?.codigo_iso && (
                      <Flag iso={confirmando.local.codigo_iso} size={20} />
                    )}
                    {nombreLocal(confirmando)}
                  </button>
                  <button
                    onClick={() => setAvanzaId(confirmando.visitante?.id ?? null)}
                    disabled={!confirmando.visitante}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-label-md"
                    style={{
                      backgroundColor:
                        avanzaId === confirmando.visitante?.id ? "var(--accent-subtle)" : "var(--background)",
                      border:
                        avanzaId === confirmando.visitante?.id
                          ? "1px solid var(--accent-default)"
                          : "1px solid var(--border)",
                    }}
                  >
                    {confirmando.visitante?.codigo_iso && (
                      <Flag iso={confirmando.visitante.codigo_iso} size={20} />
                    )}
                    {nombreVisitante(confirmando)}
                  </button>
                </div>
                <p className="mt-3 text-center text-label-md leading-tight text-text-secondary">
                  El marcador grande corresponde al final en 90 minutos (define puntajes). Indica cómo se resolvió y quién avanzó.
                </p>
              </>
            ) : (
              <p className="mt-3 text-center text-label-md text-text-secondary">
                Se marcará como finalizado y se calcularán los puntos.
              </p>
            )}

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmando(null)}
                disabled={guardando}
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--background)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={
                  guardando ||
                  (esEliminatoria(confirmando) && avanzaId == null) ||
                  (empateElim && resolucion == null)
                }
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--accent-default)",
                  color: "var(--text-on-accent)",
                  opacity:
                    guardando ||
                    (esEliminatoria(confirmando) && avanzaId == null) ||
                    (empateElim && resolucion == null)
                      ? 0.5
                      : 1,
                }}
              >
                {guardando ? "Guardando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {bannerVisible && (
        <div
          className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-body-md-bold shadow-lg"
          style={{ backgroundColor: "var(--feedback-success)", color: "var(--text-on-accent)" }}
        >
          <Check className="h-[18px] w-[18px]" />
          Resultado cargado
        </div>
      )}
    </main>
  );
}