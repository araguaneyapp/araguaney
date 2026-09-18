// Correo de recordatorio, disparado por pg_cron cada hora (ver
// sql/recordatorios-jornada.sql) 24h antes del primer partido de una
// jornada, a quien le falte predecir al menos un partido de ella.
//
// Deploy: supabase functions deploy notify-recordatorio --no-verify-jwt
// Secretos (ya deberían existir de las otras funciones):
//   RESEND_API_KEY

const REMITENTE = Deno.env.get("EMAIL_REMITENTE") ?? "onboarding@resend.dev";
const URL_APP = Deno.env.get("APP_URL") ?? "https://araguaney-quiniela.vercel.app";

type Payload = {
  email: string;
  nombre: string;
  nombre_jornada: string;
  torneo_slug: string;
};

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

function plantillaRecordatorio(nombre: string, nombreJornada: string, torneoSlug: string) {
  return envoltorio(
    "¡Faltan partidos por predecir!",
    parrafo(`Hola ${nombre}, la <strong style="color:#F5F5F5;">${nombreJornada}</strong> arranca en menos de 24 horas y todavía te falta completar tu pronóstico.`) +
      boton("Predecir ahora", `${URL_APP}/${torneoSlug}/quiniela`)
  );
}

Deno.serve(async (req) => {
  const { email, nombre, nombre_jornada, torneo_slug } = (await req.json()) as Payload;
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
      subject: `No olvides predecir la ${nombre_jornada}`,
      html: plantillaRecordatorio(nombre, nombre_jornada, torneo_slug),
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error("Resend falló:", resp.status, detalle);
    return Response.json({ error: detalle }, { status: 500 });
  }

  return Response.json({});
});
