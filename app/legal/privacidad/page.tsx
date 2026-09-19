import Link from "next/link";
import { LegalVolver } from "@/components/legal-volver";

export default function PrivacidadPage() {
  return (
    <main className="min-h-screen px-5 pb-10 pt-8">
      <LegalVolver />

      <h1 className="mb-1 text-heading-xl">Política de Privacidad</h1>
      <p className="mb-6 text-label-sm text-text-secondary">
        Última actualización: septiembre de 2026
      </p>

      <div className="flex flex-col text-body-sm text-text-secondary">
        <p className="pb-5">
          Cumpliendo con la legislación chilena vigente sobre Protección
          de la Vida Privada (Ley N° 19.628 y sus actualizaciones),
          detallamos el manejo de tu información. Ver también nuestros{" "}
          <Link href="/legal/terminos" className="underline" style={{ color: "var(--accent-default)" }}>
            Términos y Condiciones
          </Link>
          .
        </p>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            ¿Qué datos guardamos?
          </h2>
          <p>
            Únicamente tu correo electrónico, el nombre o usuario que
            elijas al crear tu cuenta y tu fecha de nacimiento. No
            pedimos fotos: la inicial de tu nombre se usa para generar tu
            avatar automáticamente.
          </p>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            ¿Para qué los usamos?
          </h2>
          <p className="mb-2">
            Con un fin estrictamente operativo de autenticación y
            comunicación de la app:
          </p>
          <ul className="ml-4 list-disc">
            <li>Identificarte dentro de tus grupos y en los rankings de las jornadas.</li>
            <li>Permitir tu ingreso mediante el código de acceso de un solo uso.</li>
            <li>
              Enviarte correos esenciales: bienvenida, avisos de solicitudes
              de grupo y recordatorios de jornadas por predecir.
            </li>
          </ul>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            ¿Con quién los compartimos?
          </h2>
          <p>
            Con nadie. No vendemos, arrendamos ni cedemos tu información
            a terceros con fines comerciales, de marketing o
            publicitarios.
          </p>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            Tus derechos y eliminación de cuenta
          </h2>
          <p>
            En cualquier momento puedes solicitar la eliminación
            permanente de tu información desde Perfil → Eliminar cuenta.
            Al confirmar, tu nombre, correo y fecha de nacimiento se
            borran de forma irreversible e inmediata, y no vas a poder
            volver a ingresar con esa cuenta.
          </p>
        </section>

        <section className="py-5 pb-0" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">Contacto</h2>
          <p>
            Para cualquier consulta sobre el tratamiento de tus datos
            personales, escríbenos a{" "}
            <span className="text-text-primary">soporte@araguaney.cl</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
