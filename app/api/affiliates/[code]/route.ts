import { NextRequest, NextResponse } from "next/server";
import {
  getAffiliateByCode,
  getAffiliateConversions,
  getAffiliatePayouts,
  getAffiliateStats,
  createPayout,
} from "@/lib/affiliates";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

// GET /api/affiliates/[code] — dados do portal do afiliado (sem auth, só pelo código)
export async function GET(_req: NextRequest, { params }: Params) {
  const { code } = await params;
  if (!code?.trim()) return NextResponse.json({ error: "Código inválido." }, { status: 400 });

  try {
    const affiliate = await getAffiliateByCode(code);
    if (!affiliate || affiliate.status === "suspended")
      return NextResponse.json({ error: "Afiliado não encontrado ou suspenso." }, { status: 404 });

    const [conversions, payouts, stats] = await Promise.all([
      getAffiliateConversions(affiliate.id),
      getAffiliatePayouts(affiliate.id),
      getAffiliateStats(affiliate.id),
    ]);

    // Remove e-mails completos para privacidade (mostra só domínio)
    const safeConversions = conversions.map((c) => ({
      ...c,
      referred_user_email: maskEmail(c.referred_user_email),
    }));

    return NextResponse.json({
      affiliate: {
        id: affiliate.id,
        name: affiliate.name,
        code: affiliate.code,
        commission_rate: affiliate.commission_rate,
        pix_key: affiliate.pix_key,
        created_at: affiliate.created_at,
      },
      conversions: safeConversions,
      payouts,
      stats,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao carregar dados.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST /api/affiliates/[code] — solicitar saque
export async function POST(req: NextRequest, { params }: Params) {
  const { code } = await params;
  if (!code?.trim()) return NextResponse.json({ error: "Código inválido." }, { status: 400 });

  let body: { amount_cents?: number };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const amount = body.amount_cents;
  if (!amount || amount < 5000)
    return NextResponse.json({ error: "Valor mínimo para saque: R$ 50,00." }, { status: 400 });

  try {
    const affiliate = await getAffiliateByCode(code);
    if (!affiliate || affiliate.status === "suspended")
      return NextResponse.json({ error: "Afiliado não encontrado ou suspenso." }, { status: 404 });

    const stats = await getAffiliateStats(affiliate.id);
    if (amount > stats.approvedCommissionCents)
      return NextResponse.json(
        { error: "Valor solicitado maior que o saldo aprovado disponível." },
        { status: 400 },
      );

    const payout = await createPayout(affiliate.id, amount);
    return NextResponse.json({ payout }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao solicitar saque.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}***@${domain}`;
}
