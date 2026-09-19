"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/**
 * Ruta pública (whitelisteada en el middleware): se llega tanto desde el
 * registro (sin sesión) como desde Perfil (con sesión), así que el botón
 * de volver usa el historial del navegador en vez de un href fijo.
 */
export default function LegalPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen px-5 pb-10 pt-8">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1 text-body-sm text-text-secondary"
      >
        <ChevronLeft className="h-5 w-5" style={{ color: "var(--icons-secondary)" }} />
        Volver
      </button>

      <h1 className="mb-6 text-heading-xl">Aviso legal</h1>

      <div className="flex flex-col gap-5 text-body-sm text-text-secondary">
        <section>
          <h2 className="mb-1 text-heading-md text-text-primary">Qué datos guardamos</h2>
          <p>
            Solo tu correo electrónico y el nombre que elijas al crear tu
            cuenta. No pedimos contraseña: el ingreso es siempre con un
            código de un solo uso enviado a tu correo.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-heading-md text-text-primary">Para qué los usamos</h2>
          <p>
            Para identificarte dentro de tus grupos y en los rankings, y
            para enviarte correos relacionados con tu cuenta: el código de
            acceso, la bienvenida, avisos de solicitudes de grupo y
            recordatorios de jornadas por predecir.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-heading-md text-text-primary">Con quién los compartimos</h2>
          <p>
            Con nadie. No vendemos ni cedemos tus datos a terceros con
            fines comerciales.
          </p>
        </section>

        <section>
          <h2 className="mb-1 text-heading-md text-text-primary">Cómo eliminar tu cuenta</h2>
          <p>
            Cuando quieras, desde Perfil → Eliminar cuenta. Tu nombre y tu
            correo se borran de inmediato; no vas a poder volver a entrar
            con esa cuenta.
          </p>
        </section>
      </div>
    </main>
  );
}
