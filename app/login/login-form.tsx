"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { LogIn, ArrowLeft } from "lucide-react";

const SEGUNDOS_REENVIO = 120;

export function LoginForm() {
  const router = useRouter();
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (segundosRestantes <= 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSegundosRestantes((s) => s - 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [segundosRestantes]);

  const formatoTiempo = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  async function enviarCodigo() {
    const correo = email.trim().toLowerCase();
    if (!correo) return;
    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.status === 429) {
        setStatus("error");
        setErrorMsg(
          "Demasiados intentos. Espera un momento antes de pedir otro código."
        );
      } else {
        setPaso("codigo");
        setStatus("idle");
        setSegundosRestantes(SEGUNDOS_REENVIO);
      }
    } else {
      setPaso("codigo");
      setStatus("idle");
      setSegundosRestantes(SEGUNDOS_REENVIO);
    }
  }

  async function verificarCodigo() {
    const correo = email.trim().toLowerCase();
    const token = codigo.trim();
    if (token.length !== 6) {
      setStatus("error");
      setErrorMsg("El código debe tener 6 dígitos.");
      return;
    }
    setStatus("verifying");
    setErrorMsg("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: correo,
      token,
      type: "email",
    });

    if (error) {
      setStatus("error");
      if (error.message.toLowerCase().includes("expired")) {
        setErrorMsg("El código expiró. Pide uno nuevo.");
      } else {
        setErrorMsg("Código incorrecto. Revísalo o pide uno nuevo.");
      }
    } else {
      router.push("/");
      router.refresh();
    }
  }

  function volverACorreo() {
    setPaso("correo");
    setCodigo("");
    setStatus("idle");
    setErrorMsg("");
    setSegundosRestantes(0);
  }

  // PASO 2: ingresar código
  if (paso === "codigo") {
    return (
      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={volverACorreo}
          className="flex items-center gap-1 text-body-sm text-text-secondary"
        >
          <ArrowLeft className="h-4 w-4" style={{ color: "var(--icons-secondary)" }} />
          Cambiar correo
        </button>

        <div className="flex flex-col gap-1">
          <h2 className="text-heading-xl">Revisa tu correo</h2>
          <p className="text-body-sm text-text-secondary">
            Enviamos un código de 6 dígitos a{" "}
            <span className="text-foreground">{email}</span>.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label-md-caps text-text-secondary">
            CÓDIGO
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={codigo}
            onChange={(e) =>
              setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            onKeyDown={(e) => e.key === "Enter" && verificarCodigo()}
            placeholder="______"
            maxLength={6}
            className="rounded-lg border border-input bg-surface-card px-4 py-3 text-center text-display-lg-code outline-none focus:border-accent-default"
          />
        </div>

        {status === "error" && (
          <p className="text-label-md text-feedback-danger">{errorMsg}</p>
        )}

        <button
          onClick={verificarCodigo}
          disabled={status === "verifying" || codigo.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
          style={{
            backgroundColor: "var(--accent-default)",
            color: "var(--text-on-accent)",
            opacity: status === "verifying" || codigo.length !== 6 ? 0.4 : 1,
          }}
        >
          <LogIn className="h-[18px] w-[18px]" />
          {status === "verifying" ? "Verificando..." : "Entrar"}
        </button>

        <button
          onClick={enviarCodigo}
          disabled={segundosRestantes > 0 || status === "sending"}
          className="text-center text-action-button"
          style={{
            color: segundosRestantes > 0 ? "var(--text-secondary)" : "var(--accent-default)",
          }}
        >
          {segundosRestantes > 0
            ? `Reenviar código en ${formatoTiempo(segundosRestantes)}`
            : status === "sending"
            ? "Enviando..."
            : "Reenviar código"}
        </button>
      </div>
    );
  }

  // PASO 1: ingresar correo
  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-label-md-caps text-text-secondary">
          CORREO
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarCodigo()}
          placeholder="tucorreo@email.com"
          className="rounded-lg border border-input bg-surface-card px-4 py-3 text-body-sm outline-none focus:border-accent-default"
        />
      </div>

      {status === "error" && (
        <p className="text-label-md text-feedback-danger">{errorMsg}</p>
      )}

      <button
        onClick={enviarCodigo}
        disabled={status === "sending"}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
        style={{
          backgroundColor: "var(--accent-default)",
          color: "var(--text-on-accent)",
          opacity: status === "sending" ? 0.4 : 1,
        }}
      >
        <LogIn className="h-[18px] w-[18px]" />
        {status === "sending" ? "Enviando..." : "Enviar código"}
      </button>

      <p className="text-center text-label-md text-text-secondary leading-relaxed">
        Acceso solo para miembros invitados.
        <br />
        Si tu correo está autorizado, recibirás un código.
      </p>
    </div>
  );
}