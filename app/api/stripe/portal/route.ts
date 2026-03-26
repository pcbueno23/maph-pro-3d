import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveStripeAppOrigin } from "@/lib/stripeAppOrigin";
import { requireUserSession } from "@/lib/adminApiAuth";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  // eslint-disable-next-line no-console
  console.warn("STRIPE_SECRET_KEY não configurada.");
}

// Usa a versão padrão da API Stripe configurada na conta,
// evitando travar o build quando a SDK atualiza a lista de apiVersion.
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

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
    if (email.trim().toLowerCase() !== auth.user.email!.toLowerCase()) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
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
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Erro ao criar sessão de portal:", error);
    const msg =
      error instanceof Stripe.errors.StripeError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Erro ao abrir portal do cliente.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

