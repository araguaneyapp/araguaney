"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { CerrarSesionAdmin } from "@/components/cerrar-sesion-admin";

export function PanelAdminCliente({
  nombre,
  usuarioId,
  torneoNombre,
  torneoSlug,
}: {
  nombre: string;
  usuarioId: string;
  torneoNombre: string | null;
  torneoSlug: string | null;
}) {
  const [nombreActual, setNombreActual] = useState(nombre);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(nombre);
  const [guardando, setGuardando] = useState(false);

  const inicial = nombreActual.trim().charAt(0).toUpperCase() || "?";

  const abrirEditar = () => {
    setBorrador(nombreActual);
    setEditando(true);
  };

  const guardarNombre = async () => {
    const limpio = borrador.trim();
    if (limpio.length === 0) return;
    setGuardando(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ nombre: limpio })
      .eq("id", usuarioId);
    setGuardando(false);

    if (!error) {
      setNombreActual(limpio);
      setEditando(false);
    } else {
      alert("Hubo un error al guardar. Intenta de nuevo.");
    }
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <div className="pt-6 pb-2 text-heading-xl">Perfil</div>

      <div className="mb-6 flex items-center gap-3 pt-2">
        <div
          className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center rounded-full text-display-lg"
          style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
        >
          {inicial}
        </div>
        {/* Sin correo a propósito: es la cuenta más privilegiada del sistema. */}
        <div className="truncate text-display-sm">{nombreActual || "Sin nombre"}</div>
      </div>

      <div className="mb-2 text-heading-md">Cuenta</div>
      <div className="mb-5 rounded-xl bg-surface-card">
        <button
          onClick={abrirEditar}
          className="flex w-full items-center justify-between px-4 py-4"
        >
          <span className="text-body-md">Cambiar nombre</span>
          <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
        </button>
      </div>

      <div className="mb-2 text-heading-md">Torneo actual</div>
      <div className="mb-5 rounded-xl bg-surface-card p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-body-md">{torneoNombre ?? "Ninguno seleccionado"}</span>
          <Link
            href="/torneos"
            className="flex flex-shrink-0 items-center gap-1 text-body-md"
            style={{ color: "var(--accent-default)" }}
          >
            Cambiar de torneo
            <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />
          </Link>
        </div>
      </div>

      <div className="mb-2 text-heading-md">El juego</div>
      <div className="mb-5 rounded-xl bg-surface-card">
        {torneoSlug ? (
          <Link
            href={`/${torneoSlug}/reglas`}
            className="flex w-full items-center justify-between px-4 py-4"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
              <span className="text-body-md">Reglas y puntuación</span>
            </div>
            <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
          </Link>
        ) : (
          <div className="flex w-full items-center gap-3 px-4 py-4" style={{ color: "var(--text-idle)" }}>
            <BookOpen className="h-[18px] w-[18px]" />
            <span className="text-body-md">Reglas y puntuación</span>
          </div>
        )}
      </div>

      <CerrarSesionAdmin />

      {editando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !guardando && setEditando(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-heading-md">Cambiar nombre</h3>
            <input
              type="text"
              value={borrador}
              onChange={(e) => setBorrador(e.target.value)}
              maxLength={30}
              placeholder="Tu nombre"
              className="mt-3 w-full rounded-lg px-3 py-2 text-body-sm outline-none"
              style={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditando(false)}
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
                onClick={guardarNombre}
                disabled={guardando || borrador.trim().length === 0}
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--accent-default)",
                  color: "var(--text-on-accent)",
                  opacity: guardando || borrador.trim().length === 0 ? 0.5 : 1,
                }}
              >
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
