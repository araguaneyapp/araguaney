// Correo de bienvenida, disparado por un trigger en auth.users (ver
// sql/notificar-bienvenida.sql) apenas alguien pide su primer código de
// acceso — llega casi junto con el código de login (send-email), antes de
// que la cuenta esté verificada.
//
// Deploy: supabase functions deploy notify-bienvenida --no-verify-jwt
// Secretos (ya deberían existir de send-email/notify-solicitud-grupo):
//   RESEND_API_KEY

const REMITENTE = Deno.env.get("EMAIL_REMITENTE") ?? "onboarding@resend.dev";
const URL_APP = Deno.env.get("APP_URL") ?? "https://araguaney-quiniela.vercel.app";

type Payload = { email: string; nombre: string };

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
        <p style="margin:24px 0 0;color:#8A8A8A;font-size:12px;">Araguaney Quiniela · Derechos Reservados · 2026</p>
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

function plantillaBienvenida(nombre: string) {
  return envoltorio(
    `¡Bienvenido, ${nombre}!`,
    parrafo(
      "Ya tienes cuenta en Araguaney Quiniela. Entra con tu correo y el código que te acabamos de enviar."
    ) +
      parrafo(
        "Una vez adentro, elige un torneo y crea o únete a un grupo con tus amigos para empezar a predecir."
      ) +
      boton("Entrar a Araguaney", `${URL_APP}/login`)
  );
}

Deno.serve(async (req) => {
  const { email, nombre } = (await req.json()) as Payload;
  const apiKey = Deno.env.get("RESEND_API_KEY")!;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REMITENTE,
      to: email,
      subject: "¡Bienvenido a Araguaney Quiniela!",
      html: plantillaBienvenida(nombre),
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error("Resend falló:", resp.status, detalle);
    return Response.json({ error: detalle }, { status: 500 });
  }

  return Response.json({});
});
