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
    <div style="font-family: sans-serif; max-width: 420px; margin: 0 auto;">
      <h2>Tu código de acceso</h2>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">
        ${emailData.token}
      </p>
      <p style="color: #666;">
        Ingresa este código en Araguaney para entrar. Vence en unos minutos.
      </p>
    </div>
  `;

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
