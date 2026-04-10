import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/adminApiAuth";
import {
  getAffiliateByCode,
  getAffiliateConversions,
  getAffiliatePayouts,
  getAffiliateStats,
  createPayout,
} from "@/lib/affiliates";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

async function getAffiliateByEmail(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await sb
    .from("affiliates")
    .select("*")
    .eq("email", email.toLowerCase())
    .eq("status", "active")
    .maybeSingle();
  return data ?? null;
}

// GET /api/affiliates/me — dados do afiliado para o usuário logado
export async function GET(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  try {
    const affiliate = await getAffiliateByEmail(auth.user.email!);
    if (!affiliate) return NextResponse.json({ affiliate: null });

    const [conversions, payouts, stats] = await Promise.all([
      getAffiliateConversions(affiliate.id),
      getAffiliatePayouts(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);

    const safeConversions = conversions.map((c) => ({
      ...c,
      referred_user_email: maskEmail(c.referred_user_email),
    }));

    return NextResponse.json({ affiliate, conversions: safeConversions, payouts, stats });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
  }
}

// POST /api/affiliates/me — solicitar saque
export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await checkRateLimit(`affiliate-payout:${ip}`, 3);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento e tente novamente." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

  let body: { amount_cents?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const amount = body.amount_cents;
  if (!amount || amount < 5000)
    return NextResponse.json({ error: "Valor mínimo: R$ 50,00." }, { status: 400 });

  try {
    const affiliate = await getAffiliateByEmail(auth.user.email!);
    if (!affiliate) return NextResponse.json({ error: "Você não é um afiliado ativo." }, { status: 403 });

    const stats = await getAffiliateStats(affiliate.id);
    if (amount > stats.approvedCommissionCents)
      return NextResponse.json({ error: "Valor maior que o saldo aprovado disponível." }, { status: 400 });

    const payout = await createPayout(affiliate.id, amount);
    return NextResponse.json({ payout }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro." }, { status: 500 });
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  return `${user.slice(0, 2)}***@${domain}`;
}
