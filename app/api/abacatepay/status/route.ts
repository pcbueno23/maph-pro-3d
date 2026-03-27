import { NextRequest, NextResponse } from "next/server";
import { getAbacatePayPaidEntitlement } from "@/lib/abacatepayPaidPlan";
import { requireUserSession } from "@/lib/adminApiAuth";

const token = process.env.ABACATEPAY_TOKEN?.trim();

type PlanEntitlement = "free" | "pro" | "business";

/**
 * Mesmo contrato de POST /api/stripe/status — para o painel Planos em modo AbacatePay.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  if (!token) {
    return NextResponse.json(
      { error: "AbacatePay não configurado (ABACATEPAY_TOKEN)." },
      { status: 500 },
    );
  }

  try {
    const { email } = (await req.json()) as { email?: string | null };
    if (!email) {
      return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });
    }
    if (email.trim().toLowerCase() !== auth.user.email!.toLowerCase()) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    // Fast-path: webhook já confirmou pagamento via user_metadata
    if (auth.user.user_metadata?.abacatepay_paid_at) {
      const meta = auth.user.user_metadata;
      let periodEnd: string | null = meta.abacatepay_period_end ?? null;
      // Fallback para contas sem period_end (corrigidas manualmente): +30d pro / +365d business
      if (!periodEnd && meta.abacatepay_paid_at) {
        const plan: PlanEntitlement = meta.abacatepay_plan ?? "pro";
        const base = new Date(meta.abacatepay_paid_at);
        base.setDate(base.getDate() + (plan === "business" ? 365 : 30));
        periodEnd = base.toISOString();
      }
      return NextResponse.json({
        plan: (meta.abacatepay_plan ?? "pro") as PlanEntitlement,
        subscriptionStatus: "PAID",
        isTrialing: false,
        currentPeriodEnd: periodEnd,
      });
    }

    const ent = await getAbacatePayPaidEntitlement(token, email);

    if (!ent.paid) {
      return NextResponse.json({
        plan: "free" as PlanEntitlement,
        subscriptionStatus: null,
        isTrialing: false,
        currentPeriodEnd: null,
      });
    }

    return NextResponse.json({
      plan: ent.plan as PlanEntitlement,
      subscriptionStatus: ent.subscriptionStatus,
      isTrialing: ent.isTrialing,
      currentPeriodEnd: ent.currentPeriodEnd,
    });
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.error("Falha ao buscar status AbacatePay:", err);
    const msg = err instanceof Error ? err.message : "Falha ao buscar status.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
