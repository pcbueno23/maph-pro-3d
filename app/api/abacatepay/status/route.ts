import { NextRequest, NextResponse } from "next/server";
import { getAbacatePayPaidEntitlement } from "@/lib/abacatepayPaidPlan";

const token = process.env.ABACATEPAY_TOKEN?.trim();

type PlanEntitlement = "free" | "pro" | "business";

/**
 * Mesmo contrato de POST /api/stripe/status — para o painel Planos em modo AbacatePay.
 */
export async function POST(req: NextRequest) {
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
