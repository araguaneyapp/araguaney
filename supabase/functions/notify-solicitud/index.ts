// Correos propios de la app (no son de Supabase Auth): aviso al admin de
// una solicitud nueva, y aviso al usuario cuando se aprueba/rechaza la suya.
// La disparan triggers de Postgres vía pg_net (ver sql/notificar-solicitudes.sql),
// no el cliente — así queda igual sin importar desde dónde se resuelva.
//
// Deploy: supabase functions deploy notify-solicitud --no-verify-jwt
// Secretos (ya debería existir RESEND_API_KEY de send-email):
//   RESEND_API_KEY
//   ADMIN_NOTIFY_EMAIL - a quién avisarle las solicitudes nuevas

const REMITENTE = Deno.env.get("EMAIL_REMITENTE") ?? "onboarding@resend.dev";
const URL_APP = Deno.env.get("APP_URL") ?? "https://araguaney-quiniela.vercel.app";

type Payload =
  | { tipo: "nueva"; email_solicitante: string; nota: string | null }
  | { tipo: "aprobada" | "rechazada"; email_solicitante: string };

function envoltorio(tituloInterno: string, cuerpo: string) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#161616;padding:40px 0;font-family:Arial,Helvetica,sans-serif;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background-color:#1F1F1F;border:1px solid #2A2A2A;border-radius:16px;overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#161616;padding:32px 0;">
              <img src="${URL_APP}/logo/logo_araguaney_email.png" alt="Araguaney Quiniela" width="140" style="display:block;width:140px;max-width:60%;height:auto;">
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              <h1 style="margin:0 0 16px;color:#F5F5F5;font-size:22px;font-weight:700;">${tituloInterno}</h1>
              ${cuerpo}
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0;color:#8A8A8A;font-size:12px;">Araguaney Quiniela · Mundial 2026</p>
      </td>
    </tr>
  </table>`;
}

function boton(texto: string, href: string) {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:28px auto 0;">
      <tr>
        <td align="center" style="border-radius:10px;background-color:#F5C518;">
          <a href="${href}" style="display:inline-block;padding:14px 28px;color:#161616;font-size:15px;font-weight:700;text-decoration:none;">${texto}</a>
        </td>
      </tr>
    </table>`;
}

function parrafo(texto: string) {
  return `<p style="margin:0 0 16px;color:#B5B5B5;font-size:15px;line-height:1.6;">${texto}</p>`;
}

function plantillaAprobada() {
  return envoltorio(
    "¡Ya tienes acceso!",
    parrafo("Tu solicitud para entrar a Araguaney Quiniela fue aprobada.") +
      parrafo("Entra con tu correo y te mandamos un código para acceder.") +
      boton("Entrar a Araguaney", `${URL_APP}/login`)
  );
}

function plantillaRechazada() {
  return envoltorio(
    "Sobre tu solicitud",
    parrafo("Por ahora no pudimos darte acceso a Araguaney Quiniela.") +
      parrafo("Si crees que fue un error, contacta a quien te invitó.")
  );
}

function plantillaNueva(email: string, nota: string | null) {
  return envoltorio(
    "Nueva solicitud de acceso",
    parrafo(`<strong style="color:#F5F5F5;">${email}</strong> pidió acceso a Araguaney Quiniela.`) +
      (nota ? parrafo(`Nota: ${nota}`) : "") +
      boton("Revisar solicitudes", `${URL_APP}/perfil/admin/solicitudes`)
  );
}

Deno.serve(async (req) => {
  const payload = (await req.json()) as Payload;
  const apiKey = Deno.env.get("RESEND_API_KEY")!;

  let to: string;
  let subject: string;
  let html: string;

  if (payload.tipo === "nueva") {
    to = Deno.env.get("ADMIN_NOTIFY_EMAIL")!;
    subject = "Nueva solicitud de acceso — Araguaney";
    html = plantillaNueva(payload.email_solicitante, payload.nota);
  } else if (payload.tipo === "aprobada") {
    to = payload.email_solicitante;
    subject = "Tu acceso a Araguaney fue aprobado";
    html = plantillaAprobada();
  } else {
    to = payload.email_solicitante;
    subject = "Sobre tu solicitud de acceso a Araguaney";
    html = plantillaRechazada();
  }

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: REMITENTE, to, subject, html }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error("Resend falló:", resp.status, detalle);
    return Response.json({ error: detalle }, { status: 500 });
  }

  return Response.json({});
});
