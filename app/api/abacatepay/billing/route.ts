import { NextRequest, NextResponse } from "next/server";
import { createBilling } from "@/lib/abacatepay";

const token = process.env.ABACATEPAY_TOKEN;

const PLAN_PRODUCTS: Record<
  string,
  { name: string; description: string; priceCents: number }
> = {
  pro: {
    name: "Precifica3D Pro",
    description: "Assinatura mensal – produtos ilimitados, sync nuvem, taxas 2026.",
    priceCents: 900, // R$ 9,00
  },
  lifetime: {
    name: "Precifica3D Lifetime",
    description: "Acesso vitalício – todas as features, pagamento único.",
    priceCents: 9900, // R$ 99,00
  },
};

export async function POST(req: NextRequest) {
  if (!token) {
    return NextResponse.json(
      { error: "AbacatePay não configurado (ABACATEPAY_TOKEN)." },
      { status: 500 }
    );
  }

  try {
    const body = (await req.json()) as {
      plan: "pro" | "lifetime";
      email?: string | null;
      name?: string | null;
    };

    const { plan, email } = body;
    if (!plan || (plan !== "pro" && plan !== "lifetime")) {
      return NextResponse.json(
        { error: "Plano inválido. Use 'pro' ou 'lifetime'." },
        { status: 400 }
      );
    }

    const product = PLAN_PRODUCTS[plan];
    if (!product) {
      return NextResponse.json(
        { error: "Plano não encontrado." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") ?? "";

    const billing = await createBilling(token, {
      frequency: "ONE_TIME",
      methods: ["PIX", "CARD"],
      products: [
        {
          externalId: `precifica3d-${plan}-${Date.now()}`,
          name: product.name,
          description: product.description,
          quantity: 1,
          price: product.priceCents,
        },
      ],
      returnUrl: `${origin}/pricing?canceled=1`,
      completionUrl: `${origin}/pricing?success=1`,
      ...(email && body.name
        ? {
            customer: {
              name: body.name,
              cellphone: "(00) 00000-0000",
              email,
              taxId: "000.000.000-00",
            },
          }
        : {}),
    });

    return NextResponse.json({ url: billing.url, id: billing.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("AbacatePay billing error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Erro ao criar cobrança AbacatePay.",
      },
      { status: 500 }
    );
  }
}
