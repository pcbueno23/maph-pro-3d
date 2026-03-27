import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { getAppTrialDays, parseTrialEndsAt } from "@/lib/appTrial";
import { sendTrialExpiringEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/**
 * Cron job diário — envia e-mail de aviso para usuários com trial encerrando amanhã.
 *
 * Chamado pelo Vercel Cron (vercel.json) todo dia às 9h (America/Sao_Paulo ≈ 12h UTC).
 * Proteção: valida Authorization: Bearer {CRON_SECRET}.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();

  // Rejeita se o secret não estiver configurado — nunca opera sem proteção.
  if (!cronSecret) {
    console.error("[cron/trial-expiry] CRON_SECRET não configurado. Configure a variável de ambiente.");
    return NextResponse.json({ error: "Servidor não configurado corretamente." }, { status: 500 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase service role não configurado." }, { status: 500 });
  }

  const trialDays = getAppTrialDays();
  const now = Date.now();

  // Janela: avisa usuários cujo trial encerra entre 20h e 32h a partir de agora
  // (garante que o aviso de "amanhã" seja enviado independente da hora exata do cron)
  const windowStart = now + 20 * 60 * 60 * 1000;
  const windowEnd = now + 32 * 60 * 60 * 1000;

  let notified = 0;
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) break;

    for (const user of data.users) {
      if (!user.email) continue;

      // Usuários já com plano pago não precisam do aviso
      const alreadyPaid = !!user.user_metadata?.abacatepay_paid_at;
      if (alreadyPaid) continue;

      // Calcular quando o trial do usuário encerra
      const metaEnd = parseTrialEndsAt(user.user_metadata?.trial_ends_at);
      const createdMs = new Date(user.created_at).getTime();
      const defaultEndMs = createdMs + trialDays * 86_400_000;
      const trialEndMs = metaEnd ? metaEnd.getTime() : defaultEndMs;

      // Trial já expirou — não enviar
      if (trialEndMs <= now) continue;

      // Está na janela de aviso?
      if (trialEndMs < windowStart || trialEndMs > windowEnd) continue;

      const daysRemaining = Math.ceil((trialEndMs - now) / 86_400_000);

      try {
        await sendTrialExpiringEmail(user.email, daysRemaining);
        notified++;
      } catch (err) {
        console.error(`[cron/trial-expiry] Erro ao enviar para ${user.email}:`, err);
      }
    }

    if (data.users.length < perPage) break;
    page++;
  }

  return NextResponse.json({ ok: true, notified });
}
