import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

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
    const { email } = (await req.json()) as { email?: string | null };

    if (!email) {
      return NextResponse.json(
        { error: "E-mail obrigatório para abrir o portal." },
        { status: 400 },
      );
    }

    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      return NextResponse.json(
        {
          error:
            "Nenhum cliente Stripe encontrado para este e-mail. Finalize um checkout primeiro.",
        },
        { status: 400 },
      );
    }

    const origin = req.headers.get("origin") ?? "";

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/pricing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Erro ao criar sessão de portal:", error);
    return NextResponse.json(
      { error: "Erro ao abrir portal do cliente." },
      { status: 500 },
    );
  }
}

