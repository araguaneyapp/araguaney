"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { activarGrupo } from "@/app/(app)/grupos/[torneo]/actions";

type GrupoEncontrado = { id: number; nombre: string; tournament_id: number };

export function GruposNuevoCliente({
  nombre,
  torneoId,
  torneoSlug,
  volverA,
}: {
  nombre: string;
  torneoId: number;
  torneoSlug: string;
  volverA: string;
}) {
  const [nombreGrupo, setNombreGrupo] = useState("");
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  const [codigo, setCodigo] = useState("");
  const [uniendo, setUniendo] = useState(false);
  const [errorUnirse, setErrorUnirse] = useState<string | null>(null);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);

  const crearGrupo = async () => {
    const nombre = nombreGrupo.trim();
    if (!nombre) return;
    setCreando(true);
    setErrorCrear(null);

    const supabase = createClient();
    const { data, error } = await supabase.rpc("crear_grupo", {
      p_nombre: nombre,
      p_tournament_id: torneoId,
    });

    if (error || data == null) {
      setCreando(false);
      setErrorCrear("No se pudo crear el grupo. Intenta de nuevo.");
      return;
    }

    // activarGrupo hace redirect(): no hace falta setCreando(false) después.
    await activarGrupo(data as number, torneoSlug);
  };

  const unirseAGrupo = async () => {
    const codigoLimpio = codigo.trim();
    if (!codigoLimpio) return;
    setUniendo(true);
    setErrorUnirse(null);

    const supabase = createClient();
    const { data: grupos, error: errorBusqueda } = await supabase.rpc(
      "buscar_grupo_por_codigo",
      { p_codigo: codigoLimpio }
    );

    if (errorBusqueda) {
      setUniendo(false);
      setErrorUnirse("No se pudo verificar el código. Intenta de nuevo.");
      return;
    }

    const grupo = ((grupos ?? []) as GrupoEncontrado[])[0];
    if (!grupo) {
      setUniendo(false);
      setErrorUnirse("Código inválido.");
      return;
    }

    if (grupo.tournament_id !== torneoId) {
      setUniendo(false);
      setErrorUnirse("Este código pertenece a otro torneo.");
      return;
    }

    const { error: errorSolicitud } = await supabase.rpc("solicitar_union_grupo", {
      p_group_id: grupo.id,
      p_nota: null,
    });

    setUniendo(false);

    // Índice único de "una pendiente a la vez": una segunda solicitud es la
    // misma confirmación de "ya la mandaste", no un error real.
    if (errorSolicitud && errorSolicitud.code !== "23505") {
      setErrorUnirse("No se pudo enviar la solicitud. Intenta de nuevo.");
      return;
    }

    setSolicitudEnviada(true);
  };

  if (solicitudEnviada) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-8 text-center">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--feedback-success-surface)" }}
        >
          <Check className="h-7 w-7" style={{ color: "var(--feedback-success)" }} />
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-heading-xl">Solicitud enviada</h2>
          <p className="text-body-sm text-text-secondary">
            Te avisamos apenas el admin del grupo te dé acceso.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 pt-8 pb-6">
      <Link
        href={volverA}
        className="mb-4 flex items-center gap-1 text-body-sm text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
        Volver
      </Link>

      <div className="mb-6">
        <p className="text-body-sm text-text-secondary">Hola,</p>
        <h1 className="text-heading-xl leading-tight">{nombre} 👋</h1>
      </div>

      <h2 className="mb-5 text-heading-md">¿Qué quieres hacer?</h2>

      <div className="mb-6 flex flex-col gap-3">
        <h3 className="text-body-md">Crear un nuevo grupo</h3>
        <input
          value={nombreGrupo}
          onChange={(e) => setNombreGrupo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && crearGrupo()}
          placeholder="Escribe un nombre"
          maxLength={60}
          className="w-full rounded-lg px-3 py-3 text-body-sm outline-none"
          style={{
            backgroundColor: "var(--surface-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {errorCrear && (
          <p className="text-label-md text-feedback-danger">{errorCrear}</p>
        )}
        <button
          onClick={crearGrupo}
          disabled={creando || nombreGrupo.trim().length === 0}
          className="w-full rounded-lg py-3 text-center text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: creando || nombreGrupo.trim().length === 0 ? 0.5 : 1,
          }}
        >
          {creando ? "Creando..." : "Crear grupo"}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-body-md">Unirme a un grupo existente</h3>
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && unirseAGrupo()}
          placeholder="ID o código del grupo"
          maxLength={12}
          className="w-full rounded-lg px-3 py-3 text-body-sm outline-none"
          style={{
            backgroundColor: "var(--surface-input)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        {errorUnirse && (
          <p className="text-label-md text-feedback-danger">{errorUnirse}</p>
        )}
        <button
          onClick={unirseAGrupo}
          disabled={uniendo || codigo.trim().length === 0}
          className="w-full rounded-lg py-3 text-center text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: uniendo || codigo.trim().length === 0 ? 0.5 : 1,
          }}
        >
          {uniendo ? "Enviando..." : "Enviar solicitud"}
        </button>
      </div>
    </main>
  );
}
