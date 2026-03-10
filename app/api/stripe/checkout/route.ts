import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const priceProMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
const priceLifetime = process.env.STRIPE_PRICE_LIFETIME;

if (!stripeSecretKey) {
  // eslint-disable-next-line no-console
  console.warn("STRIPE_SECRET_KEY não configurada.");
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2024-09-30.acacia" })
  : null;

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe não configurado." },
      { status: 500 },
    );
  }

  try {
    const { plan, email } = (await req.json()) as {
      plan: "pro" | "lifetime";
      email?: string | null;
    };

    if (!email) {
      return NextResponse.json(
        { error: "E-mail obrigatório para criar o checkout." },
        { status: 400 },
      );
    }

    let priceId: string | undefined;
    let mode: Stripe.Checkout.SessionCreateParams.Mode = "subscription";

    if (plan === "pro") {
      priceId = priceProMonthly;
      mode = "subscription";
    } else if (plan === "lifetime") {
      priceId = priceLifetime;
      mode = "payment";
    }

    if (!priceId) {
      return NextResponse.json(
        { error: "Preço Stripe não configurado para este plano." },
        { status: 400 },
      );
    }

    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/pricing?success=1`,
      cancel_url: `${origin}/pricing?canceled=1`,
      metadata: {
        app: "precifica3d",
        plan,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Erro ao criar sessão de checkout:", error);
    return NextResponse.json(
      { error: "Erro ao criar sessão de checkout." },
      { status: 500 },
    );
  }
}

