import { NextRequest, NextResponse } from "next/server";
import {
  createBilling,
  createCheckoutV2,
  createCustomer,
} from "@/lib/abacatepay";

const token = process.env.ABACATEPAY_TOKEN?.trim();

/** URLs absolutas (formato uri) — a API exige URI completa, não só path. */
function publicOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin")?.trim();
  if (origin && /^https?:\/\//i.test(origin)) return origin.replace(/\/$/, "");

  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.trim();
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() ??
    "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  const fallback = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fallback && /^https?:\/\//i.test(fallback)) {
    return fallback.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

/** Só envia customer se tiver dados reais — a API rejeita CPF/CNPJ fictício (ex.: 000.000.000-00). */
function canSendCustomer(body: {
  email?: string | null;
  name?: string | null;
  taxId?: string | null;
  cellphone?: string | null;
}): body is typeof body & {
  email: string;
  name: string;
  taxId: string;
  cellphone: string;
} {
  const email = body.email?.trim();
  const name = body.name?.trim();
  const cellphone = body.cellphone?.trim();
  const digits = body.taxId?.replace(/\D/g, "") ?? "";
  if (!email || !name || !cellphone) return false;
  // CPF 11 ou CNPJ 14 dígitos
  if (digits.length !== 11 && digits.length !== 14) return false;
  return true;
}

/** Chave criada só para API v1 — checkout v2 / produto da loja exige chave v2 + CHECKOUT:CREATE. */
function isAbacatePayV2KeyRejected(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /API key version mismatch|version mismatch|checkout.*v2|v2.*not.*allowed/i.test(
    msg,
  );
}

const PLAN_PRODUCTS: Record<
  string,
  { name: string; description: string; priceCents: number }
> = {
  pro: {
    name: "Precifica3D Pro",
    description:
      "Assinatura mensal – produtos ilimitados, sync nuvem, taxas 2026 (trial 7 dias via Stripe).",
    priceCents: 2499, // R$ 24,99
  },
  lifetime: {
    name: "Precifica3D Business anual",
    description:
      "Plano anual (cobrança anual em 12x) – precificação completa, estoque, insumos, vendas e relatórios.",
    priceCents: 23880, // 12x de R$ 19,90 => R$ 238,80/ano
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
    const rawBody = await req.text();
    if (!rawBody?.trim()) {
      return NextResponse.json(
        {
          error:
            "Body vazio. Envie JSON, ex.: {\"plan\":\"pro\"} (opcional: email, name, taxId, cellphone).",
        },
        { status: 400 }
      );
    }
    let body: {
      plan: "pro" | "lifetime";
      email?: string | null;
      name?: string | null;
      /** CPF ou CNPJ válido (a AbacatePay valida; não use fictício). */
      taxId?: string | null;
      cellphone?: string | null;
    };
    try {
      body = JSON.parse(rawBody) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "JSON inválido no body da requisição." },
        { status: 400 }
      );
    }

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

    const base = publicOrigin(req);

    const defaultCustomerId =
      process.env.ABACATEPAY_DEFAULT_CUSTOMER_ID?.trim() ?? "";

    /** Chave só v1: use true para não chamar checkout v2 (ignora prod_ da loja). */
    const useV1BillingOnly =
      process.env.ABACATEPAY_USE_V1_BILLING_ONLY === "true" ||
      process.env.ABACATEPAY_USE_V1_BILLING_ONLY === "1";

    const storeProductIdRaw =
      plan === "pro"
        ? process.env.ABACATEPAY_STORE_PRODUCT_ID_PRO?.trim() ?? ""
        : process.env.ABACATEPAY_STORE_PRODUCT_ID_LIFETIME?.trim() ?? "";

    const storeProductId = useV1BillingOnly ? "" : storeProductIdRaw;

    const appUserEmailMeta =
      email?.trim() != null && email.trim() !== ""
        ? ({ metadata: { app_user_email: email.trim().toLowerCase() } } as const)
        : {};

    const v1BillingParams = () => ({
      frequency: "ONE_TIME" as const,
      methods: ["PIX", "CARD"] as const,
      products: [
        {
          externalId: `precifica3d-${plan}-${Date.now()}`,
          name: product.name,
          description: product.description,
          quantity: 1,
          price: product.priceCents,
        },
      ],
      returnUrl: `${base}/pricing?canceled=1`,
      completionUrl: `${base}/pricing?success=1`,
      ...appUserEmailMeta,
      ...(canSendCustomer(body)
        ? {
            customer: {
              name: body.name.trim(),
              cellphone: body.cellphone.trim(),
              email: body.email.trim(),
              taxId: body.taxId!.trim(),
            },
          }
        : { customerId: defaultCustomerId }),
    });

    if (storeProductId) {
      /** Checkout v2 só aceita customerId; sem cust_ criamos cliente via v1 antes. */
      let checkoutCustomerId: string | undefined;
      if (canSendCustomer(body)) {
        const { id } = await createCustomer(token, {
          name: body.name.trim(),
          cellphone: body.cellphone.trim(),
          email: body.email.trim(),
          taxId: body.taxId!.trim(),
        });
        checkoutCustomerId = id;
      } else if (defaultCustomerId) {
        checkoutCustomerId = defaultCustomerId;
      }

      try {
        const billing = await createCheckoutV2(token, {
          items: [{ id: storeProductId, quantity: 1 }],
          methods: ["PIX", "CARD"],
          returnUrl: `${base}/pricing?canceled=1`,
          completionUrl: `${base}/pricing?success=1`,
          ...(checkoutCustomerId ? { customerId: checkoutCustomerId } : {}),
          externalId: `precifica3d-${plan}-${Date.now()}`,
          ...(email?.trim()
            ? { metadata: { app_user_email: email.trim().toLowerCase() } }
            : {}),
        });
        return NextResponse.json({ url: billing.url, id: billing.id });
      } catch (v2Err) {
        if (!isAbacatePayV2KeyRejected(v2Err)) throw v2Err;
        // eslint-disable-next-line no-console
        console.warn(
          "AbacatePay: checkout v2 recusado pela chave (ex.: só API v1). Usando billing v1 como fallback.",
        );
        if (!canSendCustomer(body) && !defaultCustomerId) {
          return NextResponse.json(
            {
              error:
                "Sua chave não aceita checkout v2 (produto da loja). Opções: (1) Chave API v2 + CHECKOUT:CREATE no painel AbacatePay; (2) No .env: ABACATEPAY_DEFAULT_CUSTOMER_ID=cust_... (fallback v1 já tentará de novo); (3) Ou ABACATEPAY_USE_V1_BILLING_ONLY=true + cust_ — ignora prod_ sem apagar a linha (preço v1 do código, não o da loja).",
            },
            { status: 400 },
          );
        }
        const billing = await createBilling(token, v1BillingParams());
        return NextResponse.json({ url: billing.url, id: billing.id });
      }
    }

    if (!canSendCustomer(body) && !defaultCustomerId) {
      return NextResponse.json(
        {
          error:
            'AbacatePay: defina ABACATEPAY_DEFAULT_CUSTOMER_ID=cust_... no .env.local (cliente da sua loja), ou envie no JSON "email", "name", "cellphone" e "taxId". Opcional: ABACATEPAY_STORE_PRODUCT_ID_PRO=prod_... + chave API v2 (CHECKOUT:CREATE) para usar o preço do produto no painel. Com chave só v1: use ABACATEPAY_USE_V1_BILLING_ONLY=true e cust_.',
        },
        { status: 400 }
      );
    }

    const billing = await createBilling(token, v1BillingParams());

    return NextResponse.json({ url: billing.url, id: billing.id });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("AbacatePay billing error:", err);
    const raw = err instanceof Error ? err.message : "Erro ao criar cobrança AbacatePay.";
    const hint = isAbacatePayV2KeyRejected(err)
      ? " Crie uma chave API v2 com CHECKOUT:CREATE ou use só billing v1 (sem ABACATEPAY_STORE_PRODUCT_ID_* + cust_ no .env)."
      : "";
    return NextResponse.json({ error: raw + hint }, { status: 500 });
  }
}
