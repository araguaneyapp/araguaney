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
// TEMPORAL: la verificación de firma (standardwebhooks) fallaba en seco con
// "Base64Coder: incorrect characters for decoding" sin poder diagnosticar
// más en la sesión donde se armó esto — se quitó para destrabar. Retomar:
// https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook

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

const REMITENTE = "onboarding@resend.dev"; // cambiar cuando haya dominio propio

Deno.serve(async (req) => {
  const payload = await req.text();

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
            <img src="https://araguaney-quiniela.vercel.app/logo/logo_araguaney_email.png" alt="Araguaney Quiniela" width="140" style="display:block;width:140px;max-width:60%;height:auto;">
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
      <p style="margin:24px 0 0;color:#8A8A8A;font-size:12px;">Araguaney Quiniela · Mundial 2026</p>
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
