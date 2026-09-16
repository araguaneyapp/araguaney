"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { ScreenHeader } from "@/components/screen-header";
import {
  LogOut,
  Check,
  UserRound,
  Mail,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Trash2,
  Inbox,
} from "lucide-react";

export function PerfilCliente({
  nombre,
  correo,
  usuarioId,
  posicion,
  puntos,
  esAdmin,
  torneoNombre,
  torneoSlug,
}: {
  nombre: string;
  correo: string;
  usuarioId: string;
  posicion: number | null;
  puntos: number;
  esAdmin: boolean;
  torneoNombre: string;
  torneoSlug: string;
}) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const [confirmandoBorrado, setConfirmandoBorrado] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState<string | null>(null);

  const [nombreActual, setNombreActual] = useState(nombre);
  const [editando, setEditando] = useState(false);
  const [borrador, setBorrador] = useState(nombre);
  const [guardando, setGuardando] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  /*
   * Cambio de email en dos pasos: se pide confirmación en el correo NUEVO
   * antes de aplicarlo. Sin esto, un typo deja a alguien sin forma de volver
   * a entrar, ya que el login es justamente por código a ese correo.
   */
  const [correoActual, setCorreoActual] = useState(correo);
  const [pasoEmail, setPasoEmail] = useState<"cerrado" | "correo" | "codigo">(
    "cerrado"
  );
  const [nuevoCorreo, setNuevoCorreo] = useState("");
  const [codigoEmail, setCodigoEmail] = useState("");
  const [procesandoEmail, setProcesandoEmail] = useState(false);
  const [errorEmail, setErrorEmail] = useState<string | null>(null);

  const inicial = nombreActual.trim().charAt(0).toUpperCase() || "?";

  const cerrarSesion = async () => {
    setSaliendo(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  /*
   * No es un DELETE de cliente: llama a una función SECURITY DEFINER que
   * anonimiza (nombre genérico, sin email) en vez de borrar filas. Eso deja
   * intactas las predicciones y el ranking, que son de todos, no solo de
   * quien se va.
   */
  const eliminarCuenta = async () => {
    setEliminando(true);
    setErrorBorrado(null);
    const supabase = createClient();
    const { error } = await supabase.rpc("eliminar_cuenta");

    if (error) {
      setEliminando(false);
      setErrorBorrado("No se pudo eliminar la cuenta. Intenta de nuevo.");
      return;
    }

    await supabase.auth.signOut();
    router.push("/login");
  };

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
      setBannerVisible(true);
      setTimeout(() => setBannerVisible(false), 3000);
    } else {
      alert("Hubo un error al guardar. Intenta de nuevo.");
    }
  };

  const abrirCambiarEmail = () => {
    setNuevoCorreo("");
    setCodigoEmail("");
    setErrorEmail(null);
    setPasoEmail("correo");
  };

  const cerrarCambiarEmail = () => {
    setPasoEmail("cerrado");
    setErrorEmail(null);
  };

  const enviarNuevoCorreo = async () => {
    const email = nuevoCorreo.trim().toLowerCase();
    if (!email || email === correoActual) return;
    setProcesandoEmail(true);
    setErrorEmail(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ email });
    setProcesandoEmail(false);

    if (error) {
      setErrorEmail("No se pudo enviar el código. Intenta de nuevo.");
      return;
    }

    setPasoEmail("codigo");
  };

  const confirmarNuevoCorreo = async () => {
    const token = codigoEmail.trim();
    if (token.length !== 6) {
      setErrorEmail("El código debe tener 6 dígitos.");
      return;
    }
    setProcesandoEmail(true);
    setErrorEmail(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: nuevoCorreo.trim().toLowerCase(),
      token,
      type: "email_change",
    });
    setProcesandoEmail(false);

    if (error) {
      setErrorEmail(
        error.code === "otp_expired"
          ? "El código expiró. Pide uno nuevo."
          : "Código incorrecto. Revísalo o pide uno nuevo."
      );
      return;
    }

    setCorreoActual(nuevoCorreo.trim().toLowerCase());
    setPasoEmail("cerrado");
    setBannerVisible(true);
    setTimeout(() => setBannerVisible(false), 3000);
  };

  return (
    <main className="min-h-screen px-5 pb-6">
      <ScreenHeader title="Perfil" />

      <div className="mb-6 flex items-center gap-3 pt-2">
        <div
          className="flex h-[64px] w-[64px] flex-shrink-0 items-center justify-center rounded-full text-display-lg"
          style={{ backgroundColor: "var(--accent-default)", color: "var(--text-on-accent)" }}
        >
          {inicial}
        </div>
        <div className="min-w-0">
          <div className="truncate text-display-sm">{nombreActual || "Sin nombre"}</div>
          <div className="mt-px truncate text-body-sm text-text-secondary">{correoActual}</div>
        </div>
      </div>

      <div className="mb-5 rounded-xl bg-surface-card p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span
            className="rounded-full px-3 py-1 text-label-sm"
            style={{
              backgroundColor: "var(--accent-subtle)",
              color: "var(--accent-default)",
            }}
          >
            {torneoNombre}
          </span>
          <Link
            href="/"
            className="flex flex-shrink-0 items-center gap-1 text-body-md"
            style={{ color: "var(--accent-default)" }}
          >
            Cambiar torneo
            <ChevronRight
              className="h-[18px] w-[18px]"
              style={{ color: "var(--icons-primary)" }}
            />
          </Link>
        </div>

        <div className="flex gap-2">
          <div
            className="flex flex-1 flex-col items-center rounded-xl px-5 py-3"
            style={{ backgroundColor: "var(--surface-background)" }}
          >
            <span className="text-heading-lg" style={{ color: "var(--accent-default)" }}>
              {posicion != null ? `${posicion}º` : "—"}
            </span>
            <span className="text-label-md text-text-secondary">Posición</span>
          </div>
          <div
            className="flex flex-1 flex-col items-center rounded-xl px-5 py-3"
            style={{ backgroundColor: "var(--surface-background)" }}
          >
            <span className="text-heading-lg">{puntos}</span>
            <span className="text-label-md text-text-secondary">Puntos</span>
          </div>
        </div>
      </div>

      <div className="mb-2 text-heading-md">
        Cuenta
      </div>
      <div className="mb-5 rounded-xl bg-surface-card">
        <button
          onClick={abrirEditar}
          className="flex w-full items-center justify-between px-4 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <UserRound className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
            <span className="text-body-md">Editar nombre</span>
          </div>
          <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
        </button>
        <button
          onClick={abrirCambiarEmail}
          className="flex w-full items-center justify-between px-4 py-4"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
            <span className="text-body-md">Cambiar email</span>
          </div>
          <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
        </button>
      </div>

      <div className="mb-2 text-heading-md">
        El juego
      </div>
      <div className="mb-5 rounded-xl bg-surface-card">
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
      </div>

      {esAdmin && (
        <>
          <div className="mb-2 text-heading-md">
            Administración
          </div>
          <div className="mb-5 rounded-xl bg-surface-card">
            <Link
              href={`/perfil/admin/resultados?desde=${torneoSlug}`}
              className="flex w-full items-center justify-between px-4 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
                <span className="text-body-md">Cargar resultados</span>
              </div>
              <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
            </Link>
            <Link
              href={`/perfil/admin/solicitudes?desde=${torneoSlug}`}
              className="flex w-full items-center justify-between px-4 py-4"
            >
              <div className="flex items-center gap-3">
                <Inbox className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
                <span className="text-body-md">Solicitudes de acceso</span>
              </div>
              <ChevronRight className="h-[18px] w-[18px]" style={{ color: "var(--icons-secondary)" }} />
            </Link>
          </div>
        </>
      )}

      <button
        onClick={() => setConfirmando(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-action-button"
        style={{
          border: "1px solid var(--accent-default)",
          color: "var(--accent-default)",
        }}
      >
        <LogOut className="h-[17px] w-[17px]" />
        Cerrar sesión
      </button>

      <button
        onClick={() => setConfirmandoBorrado(true)}
        className="mt-5 flex w-full items-center justify-center gap-1 text-action-button"
        style={{ color: "var(--feedback-danger)" }}
      >
        <Trash2 className="h-[17px] w-[17px]" style={{ color: "var(--icons-error)" }} />
        Eliminar cuenta
      </button>

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
            <h3 className="text-heading-md">Editar nombre</h3>
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

      {pasoEmail !== "cerrado" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !procesandoEmail && cerrarCambiarEmail()}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {pasoEmail === "correo" ? (
              <>
                <h3 className="text-heading-md">Cambiar email</h3>
                <p className="mt-1 text-body-sm text-text-secondary">
                  Te mandamos un código al correo nuevo para confirmarlo.
                </p>
                <input
                  type="email"
                  value={nuevoCorreo}
                  onChange={(e) => setNuevoCorreo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && enviarNuevoCorreo()}
                  placeholder="tunuevo@correo.com"
                  className="mt-3 w-full rounded-lg px-3 py-2 text-body-sm outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                {errorEmail && (
                  <p className="mt-2 text-label-md text-feedback-danger">{errorEmail}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={cerrarCambiarEmail}
                    disabled={procesandoEmail}
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
                    onClick={enviarNuevoCorreo}
                    disabled={procesandoEmail || nuevoCorreo.trim().length === 0}
                    className="flex-1 rounded-lg py-3 text-action-button"
                    style={{
                      backgroundColor: "var(--accent-default)",
                      color: "var(--text-on-accent)",
                      opacity:
                        procesandoEmail || nuevoCorreo.trim().length === 0 ? 0.5 : 1,
                    }}
                  >
                    {procesandoEmail ? "Enviando..." : "Enviar código"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-heading-md">Revisa tu correo nuevo</h3>
                <p className="mt-1 text-body-sm text-text-secondary">
                  Enviamos un código de 6 dígitos a{" "}
                  <span className="text-foreground">{nuevoCorreo}</span>.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={codigoEmail}
                  onChange={(e) =>
                    setCodigoEmail(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  onKeyDown={(e) => e.key === "Enter" && confirmarNuevoCorreo()}
                  placeholder="______"
                  maxLength={6}
                  className="mt-3 w-full rounded-lg px-3 py-3 text-center text-display-lg-code outline-none"
                  style={{
                    backgroundColor: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                  }}
                />
                {errorEmail && (
                  <p className="mt-2 text-label-md text-feedback-danger">{errorEmail}</p>
                )}
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={cerrarCambiarEmail}
                    disabled={procesandoEmail}
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
                    onClick={confirmarNuevoCorreo}
                    disabled={procesandoEmail || codigoEmail.length !== 6}
                    className="flex-1 rounded-lg py-3 text-action-button"
                    style={{
                      backgroundColor: "var(--accent-default)",
                      color: "var(--text-on-accent)",
                      opacity: procesandoEmail || codigoEmail.length !== 6 ? 0.5 : 1,
                    }}
                  >
                    {procesandoEmail ? "Confirmando..." : "Confirmar"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmando && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !saliendo && setConfirmando(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center text-heading-md">¿Quieres salir?</h3>
            <p className="mt-1 text-center text-body-sm text-text-secondary">
              Tendrás que volver a entrar con tu enlace mágico.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmando(false)}
                disabled={saliendo}
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
                onClick={cerrarSesion}
                disabled={saliendo}
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--feedback-danger)",
                  color: "var(--text-primary)",
                  opacity: saliendo ? 0.6 : 1,
                }}
              >
                {saliendo ? "Saliendo..." : "Salir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmandoBorrado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-8"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.7)" }}
          onClick={() => !eliminando && setConfirmandoBorrado(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-2xl p-5"
            style={{ backgroundColor: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-center text-heading-md">¿Seguro?</h3>
            <p className="mt-1 text-center text-body-sm text-text-secondary">
              Esto es irreversible. Tu nombre y correo se eliminan, y no vas a
              poder volver a entrar a tu cuenta.
            </p>
            {errorBorrado && (
              <p
                className="mt-2 text-center text-body-sm"
                style={{ color: "var(--feedback-danger)" }}
              >
                {errorBorrado}
              </p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setConfirmandoBorrado(false)}
                disabled={eliminando}
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
                onClick={eliminarCuenta}
                disabled={eliminando}
                className="flex-1 rounded-lg py-3 text-action-button"
                style={{
                  backgroundColor: "var(--feedback-danger)",
                  color: "var(--text-primary)",
                  opacity: eliminando ? 0.6 : 1,
                }}
              >
                {eliminando ? "Eliminando..." : "Eliminar cuenta"}
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
          Guardado
        </div>
      )}
    </main>
  );
}