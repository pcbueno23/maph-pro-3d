import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveStripeAppOrigin } from "@/lib/stripeAppOrigin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim();
const priceProMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
const priceLifetime = process.env.STRIPE_PRICE_LIFETIME?.trim();

if (!stripeSecretKey) {
  // eslint-disable-next-line no-console
  console.warn("STRIPE_SECRET_KEY não configurada.");
}

// Em produção, usamos a versão padrão da API Stripe disponível na conta.
// Remover apiVersion evita erros de type em builds quando a SDK atualiza a lista de versões.
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

function validatePriceId(id: string, envName: string): string | null {
  if (!id) return `Configure ${envName} no servidor (Vercel / .env).`;
  if (id.startsWith("prod_")) {
    return `Em ${envName} use o ID do preço (price_...), não o do produto (prod_...). Veja o preço dentro do produto no Stripe.`;
  }
  if (!id.startsWith("price_")) {
    return `${envName} deve ser um Price ID válido (começa com price_). Valor atual: "${id.slice(0, 12)}..."`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe não configurado (falta STRIPE_SECRET_KEY no servidor)." },
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
      // Business anual (plano anual cobrado em assinatura).
      mode = "subscription";
    }

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            plan === "pro"
              ? "Preço Pro não configurado: defina STRIPE_PRICE_PRO_MONTHLY (price_...) nas variáveis de ambiente."
              : "Preço Business não configurado: defina STRIPE_PRICE_LIFETIME (price_...) nas variáveis de ambiente.",
        },
        { status: 400 },
      );
    }

    const envKey = plan === "pro" ? "STRIPE_PRICE_PRO_MONTHLY" : "STRIPE_PRICE_LIFETIME";
    const priceErr = validatePriceId(priceId, envKey);
    if (priceErr) {
      return NextResponse.json({ error: priceErr }, { status: 400 });
    }

    const origin = resolveStripeAppOrigin(req);
    if (!origin) {
      return NextResponse.json(
        {
          error:
            "Não foi possível montar a URL do site para o retorno do Stripe. Defina NEXT_PUBLIC_APP_URL (ex.: https://seu-app.vercel.app) nas variáveis de ambiente.",
        },
        { status: 500 },
      );
    }

    // Trial sem cartão é controlado pelo app (`/api/account/access`). Aqui a cobrança
    // segue a configuração do preço no Stripe (sem segundo trial no Pro).
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
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Erro ao criar sessão de checkout:", error);
    const stripeMsg =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : error instanceof Error
          ? error.message
          : null;
    const hint =
      stripeMsg?.includes("No such price") || stripeMsg?.toLowerCase().includes("resource_missing")
        ? " Confira se o price_... é do mesmo modo (teste/live) da STRIPE_SECRET_KEY e se está copiado certo."
        : "";
    return NextResponse.json(
      {
        error: stripeMsg
          ? `Stripe: ${stripeMsg}.${hint}`
          : "Erro ao criar sessão de checkout.",
      },
      { status: 500 },
    );
  }
}

