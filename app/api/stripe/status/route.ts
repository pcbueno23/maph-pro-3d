import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { requireUserSession } from "@/lib/adminApiAuth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceProMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
const priceBusinessAnnual = process.env.STRIPE_PRICE_LIFETIME;

if (!stripeSecretKey) {
  // eslint-disable-next-line no-console
  console.warn("STRIPE_SECRET_KEY não configurada.");
}

const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

type PlanEntitlement = "free" | "pro" | "business";

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  if (!stripe) {
    return NextResponse.json({ error: "Stripe não configurado." }, { status: 500 });
  }

  try {
    const { email } = (await req.json()) as { email?: string | null };
    if (!email) {
      return NextResponse.json({ error: "E-mail obrigatório." }, { status: 400 });
    }
    if (email.trim().toLowerCase() !== auth.user.email!.toLowerCase()) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }

    if (!priceProMonthly || !priceBusinessAnnual) {
      return NextResponse.json(
        { error: "IDs de preços do Stripe não configurados (env)." },
        { status: 500 },
      );
    }

    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      return NextResponse.json({
        plan: "free" as PlanEntitlement,
        subscriptionStatus: null,
        isTrialing: false,
        currentPeriodEnd: null,
      });
    }

    // Pegamos todas as subs pra decidir qual plano está efetivamente valendo.
    const subs = await stripe.subscriptions.list({
      customer: customer.id,
      status: "all",
      limit: 10,
      expand: ["data.items.data.price"],
    });

    const relevant = subs.data
      .map((s) => {
        // Alguns campos de tempo não estão tipados na versão do SDK que você usa.
        // Por isso usamos cast para `any` apenas aqui no endpoint de status.
        const subAny = s as any;
        const item = s.items.data[0];
        const priceId = typeof item?.price === "string" ? item.price : item?.price?.id;
        const plan: PlanEntitlement =
          priceId === priceProMonthly ? "pro" : priceId === priceBusinessAnnual ? "business" : "free";
        return {
          subscriptionId: s.id,
          plan,
          status: s.status,
          currentPeriodEnd: subAny.current_period_end
            ? new Date(subAny.current_period_end * 1000).toISOString()
            : null,
          trialEnd:
            subAny.trial_end && s.status === "trialing"
              ? new Date(subAny.trial_end * 1000).toISOString()
              : null,
        };
      })
      .filter((r) => r.plan !== "free");

    // Prioridade:
    // 1) trialing
    // 2) active
    // 3) qualquer outra (ex: past_due/canceled)
    const trialing = relevant.find((r) => r.status === "trialing");
    if (trialing) {
      return NextResponse.json({
        plan: trialing.plan,
        subscriptionStatus: trialing.status,
        isTrialing: true,
        currentPeriodEnd: trialing.trialEnd ?? trialing.currentPeriodEnd,
      });
    }

    const active = relevant.find((r) => r.status === "active");
    if (active) {
      return NextResponse.json({
        plan: active.plan,
        subscriptionStatus: active.status,
        isTrialing: false,
        currentPeriodEnd: active.currentPeriodEnd,
      });
    }

    // Se tiver alguma relevância mas não estiver ativa/trial, considera free.
    return NextResponse.json({
      plan: "free" as PlanEntitlement,
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("Falha ao buscar status do Stripe:", err);
    return NextResponse.json({ error: err?.message ?? "Falha ao buscar status." }, { status: 500 });
  }
}

