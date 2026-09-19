"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, ArrowLeft, Mail, User, ChevronDown } from "lucide-react";

const SEGUNDOS_REENVIO = 120;

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const ANIO_ACTUAL = new Date().getFullYear();
const DIAS = Array.from({ length: 31 }, (_, i) => i + 1);
// Se listan TODOS los años (incluidos los que darían menor de edad): la
// lista no filtra nada, la validación real pasa al enviar el formulario.
const ANIOS = Array.from({ length: 100 }, (_, i) => ANIO_ACTUAL - i);

/**
 * null si la combinación no es una fecha real (ej. 31 de febrero) — un
 * <select> no puede impedir eso solo con las opciones que ofrece.
 */
function comoFecha(dia: string, mes: string, anio: string): Date | null {
  if (!dia || !mes || !anio) return null;
  const d = Number(dia);
  const m = Number(mes);
  const y = Number(anio);
  const fecha = new Date(y, m - 1, d);
  const esReal = fecha.getFullYear() === y && fecha.getMonth() === m - 1 && fecha.getDate() === d;
  return esReal ? fecha : null;
}

function tieneAlMenos18(fecha: Date): boolean {
  const hoy = new Date();
  const hace18 = new Date(hoy.getFullYear() - 18, hoy.getMonth(), hoy.getDate());
  return fecha <= hace18;
}

function comoISO(fecha: Date): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Reemplaza al <select> nativo para la fecha de nacimiento: el navegador
 * dibuja su propia flecha (no se le puede dar margen) y su propio popup
 * (no se le puede acotar la altura) — acá se controla todo, incluido que
 * el panel de opciones nunca ocupe más de ~5 filas visibles a la vez.
 */
function Desplegable({
  valor,
  onCambio,
  opciones,
  placeholder,
  ancho = "flex-1",
}: {
  valor: string;
  onCambio: (v: string) => void;
  opciones: { valor: string; etiqueta: string }[];
  placeholder: string;
  ancho?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alClicarFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", alClicarFuera);
    return () => document.removeEventListener("mousedown", alClicarFuera);
  }, [abierto]);

  const seleccionado = opciones.find((o) => o.valor === valor);

  return (
    <div ref={ref} className={`relative min-w-0 ${ancho}`}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        className="flex w-full items-center justify-between gap-1 rounded-lg border bg-surface-card px-3 py-3 text-body-sm outline-none"
        style={{ borderColor: abierto ? "var(--accent-default)" : "var(--border)" }}
      >
        <span
          className="truncate"
          style={{ color: seleccionado ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {seleccionado?.etiqueta ?? placeholder}
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0" style={{ color: "var(--icons-secondary)" }} />
      </button>

      {abierto && (
        <div
          className="scroll-identidad absolute z-20 mt-1 max-h-[200px] w-full overflow-y-auto rounded-lg py-1"
          style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
        >
          {opciones.map((o) => (
            <button
              key={o.valor}
              type="button"
              onClick={() => {
                onCambio(o.valor);
                setAbierto(false);
              }}
              className="block w-full px-3 py-2 text-left text-body-sm"
              style={{
                backgroundColor: o.valor === valor ? "var(--accent-subtle)" : "transparent",
                color: "var(--text-primary)",
              }}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Público (va en el cliente a propósito): Cloudflare Turnstile, protege
// signInWithOtp de registros/envíos masivos automatizados. El secret
// correspondiente vive en Supabase (Authentication > Attack Protection).
const TURNSTILE_SITE_KEY = "0x4AAAAAAE5oy7fT04lTXmPp";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

export function LoginForm() {
  const router = useRouter();
  const [paso, setPaso] = useState<"correo" | "codigo">("correo");
  const [modo, setModo] = useState<"iniciar" | "crear">("iniciar");
  const [email, setEmail] = useState("");
  const [nombre, setNombre] = useState("");
  const [dia, setDia] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [aceptaLegal, setAceptaLegal] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [segundosRestantes, setSegundosRestantes] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [turnstileListo, setTurnstileListo] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  /*
   * El widget de Turnstile se monta de nuevo cada vez que cambia `paso`
   * (el contenedor con id="turnstile-container" vive en el JSX de cada
   * paso, no en un wrapper compartido) — así que hay que re-renderizarlo
   * en cada cambio, no solo una vez.
   */
  useEffect(() => {
    if (!turnstileListo) return;
    const contenedor = document.getElementById("turnstile-container");
    if (!contenedor || !window.turnstile) return;

    widgetIdRef.current = window.turnstile.render(contenedor, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: (token: string) => setCaptchaToken(token),
      "expired-callback": () => setCaptchaToken(null),
    });

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [turnstileListo, paso]);

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

    let fechaNacimiento: Date | null = null;

    if (modo === "crear") {
      if (!nombre.trim()) {
        setStatus("error");
        setErrorMsg("Ingresa tu nombre o usuario.");
        return;
      }

      fechaNacimiento = comoFecha(dia, mes, anio);
      if (!fechaNacimiento) {
        setStatus("error");
        setErrorMsg("Ingresa una fecha de nacimiento válida.");
        return;
      }
      if (!tieneAlMenos18(fechaNacimiento)) {
        setStatus("error");
        setErrorMsg("Debes ser mayor de 18 años para crear una cuenta.");
        return;
      }

      if (!aceptaLegal) {
        setStatus("error");
        setErrorMsg("Debes aceptar los Términos y la Política de Privacidad.");
        return;
      }
    }

    if (!captchaToken) {
      setStatus("error");
      setErrorMsg("Completa la verificación de seguridad antes de continuar.");
      return;
    }

    setStatus("sending");
    setErrorMsg("");

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithOtp({
      email: correo,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        captchaToken,
        // Solo importa la primera vez: handle_new_user la usa al crear el
        // profile. En un login normal (cuenta ya existe) no se manda nada.
        ...(modo === "crear" && nombre.trim() && fechaNacimiento
          ? { data: { nombre: nombre.trim(), fecha_nacimiento: comoISO(fechaNacimiento) } }
          : {}),
      },
    });

    // Token de un solo uso: hay que pedir uno nuevo para el próximo intento,
    // sea cual sea el resultado de este.
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
    }
    setCaptchaToken(null);

    if (error) {
      setStatus("error");
      setErrorMsg(
        error.status === 429
          ? "Demasiados intentos. Espera un momento antes de pedir otro código."
          : "No se pudo enviar el código. Intenta de nuevo."
      );
      return;
    }

    setPaso("codigo");
    setStatus("idle");
    setSegundosRestantes(SEGUNDOS_REENVIO);
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
      if (error.code === "otp_expired") {
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
          disabled={segundosRestantes > 0 || status === "sending" || !captchaToken}
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

        <div id="turnstile-container" className="flex justify-center" />

        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="afterInteractive"
          onLoad={() => setTurnstileListo(true)}
        />
      </div>
    );
  }

  // PASO 1: ingresar correo (modo "iniciar") o correo + nombre (modo "crear")
  const puedeEnviar =
    status !== "sending" && captchaToken && (modo === "iniciar" || aceptaLegal);

  return (
    <div className="flex w-full max-w-sm flex-col gap-4">
      <h2 className="flex items-center gap-2 text-heading-md text-text-primary">
        <Mail className="h-[18px] w-[18px]" style={{ color: "var(--icons-primary)" }} />
        {modo === "iniciar" ? "Ingresa tu Correo" : "Crea tu cuenta"}
      </h2>

      <div className="flex flex-col gap-2">
        <label className="text-label-md-caps text-text-secondary">CORREO</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviarCodigo()}
          placeholder="tucorreo@email.com"
          className="rounded-lg border border-input bg-surface-card px-4 py-3 text-body-sm outline-none focus:border-accent-default"
        />
      </div>

      {modo === "crear" && (
        <div className="flex flex-col gap-2">
          <label className="text-label-md-caps text-text-secondary">NOMBRE O USUARIO</label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarCodigo()}
            placeholder="Cómo te van a ver los demás"
            maxLength={30}
            className="rounded-lg border border-input bg-surface-card px-4 py-3 text-body-sm outline-none focus:border-accent-default"
          />
        </div>
      )}

      {modo === "crear" && (
        <div className="flex flex-col gap-2">
          <label className="text-label-md-caps text-text-secondary">FECHA DE NACIMIENTO</label>
          <div className="flex gap-2">
            <Desplegable
              valor={dia}
              onCambio={setDia}
              placeholder="Día"
              opciones={DIAS.map((d) => ({ valor: String(d), etiqueta: String(d) }))}
            />
            <Desplegable
              valor={mes}
              onCambio={setMes}
              placeholder="Mes"
              ancho="flex-[1.6]"
              opciones={MESES.map((m, i) => ({ valor: String(i + 1), etiqueta: m }))}
            />
            <Desplegable
              valor={anio}
              onCambio={setAnio}
              placeholder="Año"
              opciones={ANIOS.map((a) => ({ valor: String(a), etiqueta: String(a) }))}
            />
          </div>
        </div>
      )}

      {modo === "crear" && (
        <label className="flex items-start gap-2 text-label-md text-text-secondary">
          <input
            type="checkbox"
            checked={aceptaLegal}
            onChange={(e) => setAceptaLegal(e.target.checked)}
            className="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent-default"
          />
          <span>
            Acepto los{" "}
            <Link href="/legal/terminos" className="underline" style={{ color: "var(--accent-default)" }}>
              Términos y Condiciones
            </Link>{" "}
            y la{" "}
            <Link href="/legal/privacidad" className="underline" style={{ color: "var(--accent-default)" }}>
              Política de Privacidad
            </Link>
            , y declaro que mis datos, incluida mi fecha de nacimiento, son verídicos.
          </span>
        </label>
      )}

      {status === "error" && (
        <p className="text-label-md text-feedback-danger">{errorMsg}</p>
      )}

      <button
        onClick={enviarCodigo}
        disabled={!puedeEnviar}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-center text-action-button"
        style={{
          backgroundColor: "var(--accent-default)",
          color: "var(--text-on-accent)",
          opacity: puedeEnviar ? 1 : 0.4,
        }}
      >
        <LogIn className="h-[18px] w-[18px]" />
        {status === "sending"
          ? "Enviando..."
          : modo === "iniciar"
          ? "Enviar código"
          : "Crear cuenta"}
      </button>

      <button
        onClick={() => {
          setModo(modo === "iniciar" ? "crear" : "iniciar");
          setStatus("idle");
          setErrorMsg("");
        }}
        className="flex items-center justify-center gap-1 text-center text-action-button"
        style={{ color: "var(--accent-default)" }}
      >
        <User className="h-[16px] w-[16px]" />
        {modo === "iniciar" ? "Crear cuenta" : "Ya tengo cuenta"}
      </button>

      <div id="turnstile-container" className="flex justify-center" />

      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => setTurnstileListo(true)}
      />
    </div>
  );
}