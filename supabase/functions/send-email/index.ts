// Auth Hook "Send Email": Supabase llama acá en vez de mandar el correo él
// mismo. Se usa porque el SMTP custom (Resend) fallaba en seco sin
// diagnóstico posible; esto llama a la API de Resend directo, que sí
// funciona (probado con curl).
//
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Secretos necesarios (supabase secrets set ...):
//   RESEND_API_KEY        - el mismo api key de Resend
//   SEND_EMAIL_HOOK_SECRET - el que da Supabase al activar el hook (empieza
//                            con "v1,whsec_...")
//
// Después de deployar: Authentication > Hooks > "Send Email hook" > apuntar
// a la URL de esta función y pegar el secret que Supabase genera ahí (debe
// ser EXACTAMENTE el mismo que el secreto de arriba).
//
// La firma del webhook (Standard Webhooks: headers webhook-id/
// webhook-timestamp/webhook-signature) se verifica a mano con
// crypto.subtle en vez de la librería standardwebhooks, que había fallado
// antes con "Base64Coder: incorrect characters for decoding" sin poder
// diagnosticar más. Sin esto, --no-verify-jwt deja la función abierta a
// que cualquiera que descubra la URL mande correos arbitrarios vía Resend.

type EmailData = {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
};

type HookPayload = {
  user: {
    email: string;
    identities?: { email?: string; identity_data?: { email?: string } }[];
  };
  email_data: EmailData;
};

const REMITENTE = Deno.env.get("EMAIL_REMITENTE") ?? "onboarding@resend.dev";
const URL_APP = Deno.env.get("APP_URL") ?? "https://araguaney-quiniela.vercel.app";
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

/** Comparación en tiempo constante: evita filtrar la firma correcta por timing. */
function comparacionConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Verifica la firma Standard Webhooks que manda Supabase Auth. El secreto
 * viene como "v1,whsec_XXXX"; la parte que importa para el HMAC es lo que
 * sigue a "whsec_", en base64. El header trae una o más firmas separadas
 * por espacio (rotación de secreto), cada una con su propio prefijo "v1,".
 * Timestamps de más de 5 minutos se rechazan para evitar replay.
 */
async function firmaValida(payload: string, headers: Headers): Promise<boolean> {
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const firmasHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !firmasHeader || !HOOK_SECRET) return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Math.floor(Date.now() / 1000) - ts) > 300) {
    return false;
  }

  const secretoB64 = HOOK_SECRET.replace(/^v1,/, "").replace(/^whsec_/, "");
  const secretoBytes = Uint8Array.from(atob(secretoB64), (c) => c.charCodeAt(0));

  const clave = await crypto.subtle.importKey(
    "raw",
    secretoBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firmaBytes = await crypto.subtle.sign(
    "HMAC",
    clave,
    new TextEncoder().encode(`${id}.${timestamp}.${payload}`)
  );
  const firmaEsperada = btoa(String.fromCharCode(...new Uint8Array(firmaBytes)));

  return firmasHeader
    .split(" ")
    .map((f) => f.replace(/^v1,/, ""))
    .some((f) => comparacionConstante(f, firmaEsperada));
}

Deno.serve(async (req) => {
  const payload = await req.text();

  if (!(await firmaValida(payload, req.headers))) {
    console.error("Firma de webhook inválida o ausente");
    return Response.json({ error: { message: "Firma inválida" } }, { status: 401 });
  }

  let datos: HookPayload;
  try {
    datos = JSON.parse(payload) as HookPayload;
  } catch (e) {
    console.error("Payload inválido:", e instanceof Error ? e.message : e);
    return Response.json({ error: { message: "Payload inválido" } }, { status: 400 });
  }

  const { user, email_data: emailData } = datos;

  /*
   * `user.email` viene vacío para una cuenta anonimizada (se le borra el
   * email en auth.users a propósito): el correo real de todos modos sigue
   * en la identidad, que es de donde Auth realmente saca a quién mandarle
   * este código.
   */
  const destinatario =
    user.email ||
    user.identities?.[0]?.email ||
    user.identities?.[0]?.identity_data?.email;

  if (!destinatario) {
    console.error("Sin correo destinatario en el payload");
    return Response.json({ error: { message: "Sin correo destinatario" } }, { status: 400 });
  }

  /*
   * Todo lo que usa esta app es OTP de 6 dígitos (login-form.tsx pide el
   * código, nunca hace clic en un link). `token` es ese código; el resto de
   * los tipos (recovery, invite, etc.) no aplican hoy pero se dejan con el
   * mismo template por si algún día se usan.
   */
  const asunto = "Tu código de acceso a Araguaney";
  const html = `
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
            <h1 style="margin:0 0 16px;color:#F5F5F5;font-size:22px;font-weight:700;">Tu código de acceso</h1>
            <p style="margin:0 0 28px;color:#B5B5B5;font-size:15px;line-height:1.6;">Ingresa este código en la app para entrar a Araguaney Quiniela. Es de un solo uso y caduca en 15 minutos.</p>
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="border-radius:10px;background-color:#161616;border:1px solid #2A2A2A;padding:20px 36px;">
                  <span style="display:inline-block;color:#F5C518;font-size:38px;font-weight:700;letter-spacing:10px;font-family:'Courier New',Courier,monospace;">${emailData.token}</span>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;color:#8A8A8A;font-size:13px;line-height:1.6;">Vuelve a la pantalla donde pediste el código y escríbelo para acceder.</p>
            <p style="margin:16px 0 0;color:#8A8A8A;font-size:13px;line-height:1.6;">Si no solicitaste este correo, puedes ignorarlo.</p>
          </td>
        </tr>
      </table>
      <p style="margin:24px 0 0;color:#8A8A8A;font-size:12px;">Araguaney Quiniela · Derechos Reservados · 2026</p>
    </td>
  </tr>
</table>`;

  const resp = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: REMITENTE,
      to: destinatario,
      subject: asunto,
      html,
    }),
  });

  if (!resp.ok) {
    const detalle = await resp.text();
    console.error("Resend falló:", resp.status, detalle);
    return Response.json(
      { error: { message: `Resend falló: ${detalle}` } },
      { status: 500 }
    );
  }

  console.log("Enviado a", destinatario);
  return Response.json({});
});
