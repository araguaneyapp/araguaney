import Link from "next/link";
import { LegalVolver } from "@/components/legal-volver";

export default function TerminosPage() {
  return (
    <main className="min-h-screen px-5 pb-10 pt-8">
      <LegalVolver />

      <h1 className="mb-1 text-heading-xl">Términos y Condiciones</h1>
      <p className="mb-6 text-label-sm text-text-secondary">
        Última actualización: septiembre de 2026
      </p>

      <div className="flex flex-col text-body-sm text-text-secondary">
        <p className="pb-5">
          Bienvenido a Araguaney Quiniela (&quot;la Plataforma&quot;). Al
          crear una cuenta y acceder a nuestros servicios, aceptas estos
          Términos y Condiciones, así como nuestra{" "}
          <Link href="/legal/privacidad" className="underline" style={{ color: "var(--accent-default)" }}>
            Política de Privacidad
          </Link>
          . Si no estás de acuerdo, te invitamos a no utilizar la app.
        </p>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            1. Naturaleza del servicio (juego recreativo)
          </h2>
          <p className="mb-2">
            La Plataforma es una herramienta de entretenimiento 100%
            gratuita, diseñada exclusivamente con fines recreativos y
            sociales para predecir resultados deportivos entre amigos.
          </p>
          <p className="mb-2">
            <strong className="text-text-primary">Ausencia de apuestas:</strong>{" "}
            la Plataforma no es una casa de apuestas, no recauda dinero
            para participar, no gestiona fondos de usuarios y no entrega
            premios físicos ni monetarios de ningún tipo.
          </p>
          <p>
            <strong className="text-text-primary">Acuerdos externos:</strong>{" "}
            cualquier apuesta o premio que los usuarios decidan gestionar
            de forma privada entre los miembros de un grupo es de su
            exclusiva responsabilidad. El creador y administrador de la
            Plataforma queda eximido de cualquier disputa o conflicto
            legal que surja de esas interacciones externas.
          </p>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            2. Registro, acceso y seguridad de la cuenta
          </h2>
          <p className="mb-2">
            <strong className="text-text-primary">Edad mínima:</strong> para
            usar la Plataforma debes ser mayor de 18 años. Al registrarte
            y proporcionar tu fecha de nacimiento, confirmas bajo
            declaración jurada que cumples con este requisito.
          </p>
          <p className="mb-2">
            <strong className="text-text-primary">
              Acceso sin contraseña:
            </strong>{" "}
            no almacenamos contraseñas. El ingreso se hace con un código
            único de 6 dígitos enviado a tu correo cada vez que lo
            solicitas.
          </p>
          <p>
            <strong className="text-text-primary">
              Responsabilidad de la cuenta:
            </strong>{" "}
            es tu responsabilidad exclusiva mantener el control de tu
            bandeja de correo. Cualquier acción realizada en la Plataforma
            tras validar el código será imputable al titular de esa
            dirección.
          </p>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            3. Disponibilidad y exactitud de los resultados
          </h2>
          <p className="mb-2">
            La Plataforma se actualiza de forma automatizada a través de
            un servicio de terceros (API deportiva) para reflejar
            resultados y calcular los rankings de los grupos.
          </p>
          <p className="mb-2">
            <strong className="text-text-primary">
              Fallas del sistema y moderación manual:
            </strong>{" "}
            si el proveedor externo presenta fallas o discrepancias,
            nuestro equipo puede corregir y actualizar los datos
            manualmente, basándose en los resultados oficiales de los
            eventos ya finalizados.
          </p>
          <p>
            <strong className="text-text-primary">
              Limitación de responsabilidad:
            </strong>{" "}
            haremos nuestro mejor esfuerzo para mantener las tablas al
            día, pero no garantizamos inmediatez absoluta ante caídas de
            la API ni nos hacemos responsables por disputas en los
            rankings que esos retrasos temporales puedan generar.
          </p>
        </section>

        <section className="py-5" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            4. Modificaciones y nuevas funcionalidades
          </h2>
          <p>
            Nos reservamos el derecho de modificar estos términos en el
            futuro, ya sea por nuevas exigencias legales o por eventuales
            funcionalidades &quot;Premium&quot; (manteniendo siempre la
            naturaleza recreativa de la app). Todo cambio sustancial se
            notificará al correo registrado en tu cuenta.
          </p>
        </section>

        <section className="py-5 pb-0" style={{ borderTop: "1px solid var(--border)" }}>
          <h2 className="mb-1 text-heading-md text-text-primary">
            5. Jurisdicción y contacto
          </h2>
          <p className="mb-2">
            Estos términos se rigen por las leyes de la República de
            Chile y están sujetos a la jurisdicción de sus tribunales
            competentes.
          </p>
          <p>
            Si tienes consultas, quieres reportar un error en los
            resultados o dudas sobre tus datos, escríbenos a{" "}
            <span className="text-text-primary">soporte@araguaney.cl</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
