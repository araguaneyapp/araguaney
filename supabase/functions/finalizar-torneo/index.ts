// Edge Function: dispara el correo de resultados finales, un Top 10 por
// grupo, cuando el SuperAdmin decide "Finalizar torneo" desde
// /admin/resultados. No es automático (a diferencia de bienvenida/
// recordatorio) — el cierre de un torneo es una decisión, no algo que
// deba pasar solo porque se cumplió un timer.
//
// Deploy: supabase functions deploy finalizar-torneo --no-verify-jwt
// Secretos (ya deberían existir de las otras funciones):
//   RESEND_API_KEY
// SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY ya los provee Supabase en runtime.

import { createClient } from "jsr:@supabase/supabase-js@2";

const REMITENTE = Deno.env.get("EMAIL_REMITENTE") ?? "onboarding@resend.dev";
const URL_APP = Deno.env.get("APP_URL") ?? "https://araguaney-quiniela.vercel.app";

type FilaRanking = {
  usuario_id: string;
  nombre: string;
  puntos_total: number;
  posicion: number | null;
};

const COLOR_POSICION: Record<number, string> = {
  1: "#F5C518",
  2: "#C0C0C0",
  3: "#CD7F32",
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

function parrafo(texto: string) {
  return `<p style="margin:0 0 16px;color:#B5B5B5;font-size:15px;line-height:1.6;">${texto}</p>`;
}

function filaRanking(fila: FilaRanking, esDestinatario: boolean) {
  const color = fila.posicion ? COLOR_POSICION[fila.posicion] : null;
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #2A2A2A;color:${color ?? "#B5B5B5"};font-size:15px;font-weight:${color ? "700" : "400"};width:32px;">
        ${fila.posicion ?? "-"}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #2A2A2A;color:${esDestinatario ? "#F5F5F5" : "#B5B5B5"};font-size:15px;font-weight:${esDestinatario ? "700" : "400"};">
        ${fila.nombre}${esDestinatario ? " (tú)" : ""}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #2A2A2A;color:#F5F5F5;font-size:15px;font-weight:700;text-align:right;">
        ${fila.puntos_total} pts
      </td>
    </tr>`;
}

function plantillaResultadoFinal(
  nombreDestinatario: string,
  nombreGrupo: string,
  top10: FilaRanking[],
  usuarioId: string
) {
  const esCampeon = top10[0]?.usuario_id === usuarioId;
  const titulo = esCampeon
    ? `¡Felicitaciones, ${nombreDestinatario}!`
    : "El torneo llegó a su fin";
  const intro = esCampeon
    ? `Eres el campeón de <strong style="color:#F5F5F5;">${nombreGrupo}</strong>. Estos son los resultados finales:`
    : `Estos son los resultados finales de <strong style="color:#F5F5F5;">${nombreGrupo}</strong>:`;

  const filas = top10.map((f) => filaRanking(f, f.usuario_id === usuarioId)).join("");

  return envoltorio(
    titulo,
    parrafo(intro) +
      `<table width="100%" cellpadding="0" cellspacing="0">${filas}</table>` +
      `<p style="margin:20px 0 0;color:#8A8A8A;font-size:13px;line-height:1.6;">Gracias por jugar. Nos vemos en el próximo torneo.</p>`
  );
}

Deno.serve(async (req) => {
  const { tournament_id } = (await req.json()) as { tournament_id: number };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const apiKey = Deno.env.get("RESEND_API_KEY")!;

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: final, error: errorFinal } = await supabase
    .from("matches")
    .select("status")
    .eq("tournament_id", tournament_id)
    .eq("fase", "final")
    .maybeSingle();

  if (errorFinal) {
    return Response.json({ error: errorFinal.message }, { status: 500 });
  }
  if (!final || !["finished", "published"].includes(final.status)) {
    return Response.json(
      { error: "La final de este torneo todavía no tiene resultado cargado." },
      { status: 400 }
    );
  }

  const { data: grupos, error: errorGrupos } = await supabase
    .from("groups")
    .select("id, nombre")
    .eq("tournament_id", tournament_id);

  if (errorGrupos) {
    return Response.json({ error: errorGrupos.message }, { status: 500 });
  }

  const { data: yaEnviados } = await supabase
    .from("email_final_torneo_enviado")
    .select("group_id");
  const enviados = new Set((yaEnviados ?? []).map((e) => e.group_id));

  let gruposProcesados = 0;
  let correosEnviados = 0;

  for (const grupo of grupos ?? []) {
    if (enviados.has(grupo.id)) continue;

    const { data: top10 } = await supabase
      .from("ranking")
      .select("usuario_id, nombre, puntos_total, posicion")
      .eq("group_id", grupo.id)
      .order("posicion", { ascending: true })
      .limit(10);

    if (!top10 || top10.length === 0) continue;

    const { data: miembros } = await supabase
      .from("group_members")
      .select("usuario_id")
      .eq("group_id", grupo.id);

    for (const miembro of miembros ?? []) {
      const { data: userData } = await supabase.auth.admin.getUserById(miembro.usuario_id);
      const email = userData?.user?.email;
      if (!email) continue;

      const propio = top10.find((t) => t.usuario_id === miembro.usuario_id);
      const nombreDestinatario = propio?.nombre ?? "jugador";
      const esCampeon = top10[0]?.usuario_id === miembro.usuario_id;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: REMITENTE,
          to: email,
          subject: esCampeon
            ? `¡Felicitaciones! Eres el campeón de ${grupo.nombre}`
            : `Resultados finales de ${grupo.nombre}`,
          html: plantillaResultadoFinal(
            nombreDestinatario,
            grupo.nombre,
            top10 as FilaRanking[],
            miembro.usuario_id
          ),
        }),
      });

      if (resp.ok) correosEnviados++;
    }

    await supabase.from("email_final_torneo_enviado").insert({ group_id: grupo.id });
    gruposProcesados++;
  }

  return Response.json({ ok: true, gruposProcesados, correosEnviados });
});
