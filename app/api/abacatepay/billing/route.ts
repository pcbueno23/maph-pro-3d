import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/adminApiAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  createBilling,
  createCheckoutV2,
  createCustomer,
  type AbacatePayCreateBillingParams,
} from "@/lib/abacatepay";
import { getPlanPricingFromConfig } from "@/lib/planPricing";
import { parseSiteConfigData } from "@/lib/siteConfig";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";

const token = process.env.ABACATEPAY_TOKEN?.trim();

/** URLs absolutas (formato uri) — a API exige URI completa, não só path.
 *  SEGURANÇA: nunca usa o header `origin` do cliente como fonte confiável —
 *  um atacante autenticado poderia enviar Origin: https://site-malicioso.com
 *  e fazer o AbacatePay redirecionar o usuário para lá após o pagamento.
 *  Fonte de verdade: NEXT_PUBLIC_APP_URL (env server-side) ou x-forwarded-host. */
function publicOrigin(req: NextRequest): string {
  // 1. Fonte mais confiável: variável de ambiente definida no servidor/Vercel
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (appUrl && /^https:\/\//i.test(appUrl)) return appUrl;

  // 2. Fallback para desenvolvimento local via headers de proxy (não vem do cliente diretamente)
  const host =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host")?.trim();
  const proto =
    (req.headers.get("x-forwarded-proto") ?? "http").split(",")[0]?.trim() ??
    "http";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");

  return "http://localhost:3000";
}

function isValidCPF(digits: string): boolean {
  if (/^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(digits[10]);
}

function isValidCNPJ(digits: string): boolean {
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const calc = (d: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(d[i]) * weights[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  return (
    calc(digits, w1) === parseInt(digits[12]) &&
    calc(digits, w2) === parseInt(digits[13])
  );
}

function isValidTaxId(taxId: string): boolean {
  const digits = taxId.replace(/\D/g, "");
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
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
  const taxId = body.taxId ?? "";
  if (!email || !name || !cellphone) return false;
  if (!isValidTaxId(taxId)) return false;
  return true;
}

/** Chave criada só para API v1 — checkout v2 / produto da loja exige chave v2 + CHECKOUT:CREATE. */
function isAbacatePayV2KeyRejected(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /API key version mismatch|version mismatch|checkout.*v2|v2.*not.*allowed/i.test(
    msg,
  );
}

/** Resposta típica da API quando `customerId` / cust_ não existe nessa conta ou não combina com o token. */
function isAbacatePayCustomerNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /customer not found|cliente não encontrado|customer_id.*not found/i.test(
    msg,
  );
}

function customerNotFoundUserMessage(): string {
  return (
    "AbacatePay não encontrou esse cliente (cust_…). O ABACATEPAY_DEFAULT_CUSTOMER_ID precisa existir na mesma conta da sua chave API: abra o painel AbacatePay → Clientes e copie o ID, ou use GET /v1/customer/list com o mesmo Bearer. " +
    "Chave de teste (abc_dev_…) e chave live têm cadastros diferentes. Se você usa produtos prod_… no checkout v2, o cust_ também tem que ser válido nessa conta."
  );
}

const PLAN_NAMES: Record<string, { name: string; description: string }> = {
  pro: {
    name: "MAPH PRO 3D — Plano Pro (mensal)",
    description:
      "Assinatura mensal com acesso completo ao MAPH PRO 3D: calculadora de precificação 3D, taxas Shopee e Mercado Livre, produtos e peças, estoque e insumos, ordens, vendas e relatórios. Cobrança via PIX ou cartão.",
  },
  business: {
    name: "MAPH PRO 3D — Plano Business Anual",
    description:
      "Plano anual com as mesmas funções do Pro: precificação completa, gestão de produção, estoque, vendas e relatórios. Valor anual com desconto em relação ao mensal. Pagamento via PIX ou cartão.",
  },
};

/** Busca preços efetivos do banco (admin pode sobrescrever via painel). */
async function fetchEffectivePlanPrices() {
  try {
    const sb = getSupabaseServiceRole();
    if (!sb) return getPlanPricingFromConfig();
    const { data } = await sb
      .from("app_site_config")
      .select("data")
      .eq("id", "default")
      .single();
    const cfg = parseSiteConfigData(data?.data);
    return getPlanPricingFromConfig(cfg);
  } catch {
    return getPlanPricingFromConfig();
  }
}

/**
 * URL https pública da imagem do item no checkout (billing v1).
 * Padrão: `{origem}/logo.png` (use `public/logo.png` no Next).
 * Origem: request (https) ou `NEXT_PUBLIC_APP_URL` quando for https (útil se a API da AbacatePay buscar a imagem).
 */
function checkoutProductImageUrl(
  plan: "pro" | "business",
  requestOrigin: string,
): string | undefined {
  const specific =
    plan === "pro"
      ? process.env.ABACATEPAY_CHECKOUT_PRODUCT_IMAGE_URL_PRO?.trim()
      : process.env.ABACATEPAY_CHECKOUT_PRODUCT_IMAGE_URL_BUSINESS?.trim();
  const fallbackEnv = process.env.ABACATEPAY_CHECKOUT_PRODUCT_IMAGE_URL?.trim();
  const publicApp = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";

  let raw = specific || fallbackEnv;
  if (!raw) {
    const ro = requestOrigin.replace(/\/$/, "");
    if (/^https:\/\//i.test(ro)) raw = `${ro}/logo.png`;
    else if (publicApp && /^https:\/\//i.test(publicApp)) {
      raw = `${publicApp}/logo.png`;
    }
  }
  if (!raw) return undefined;
  if (!/^https:\/\//i.test(raw)) return undefined;
  return raw;
}

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = checkRateLimit(`abacatepay-billing:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde um momento e tente novamente." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
    );
  }

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
      plan: "pro" | "business";
      email?: string | null;
      name?: string | null;
      /** CPF ou CNPJ válido (a AbacatePay valida; não use fictício). */
      taxId?: string | null;
      cellphone?: string | null;
      ref_code?: string | null;
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
    if (email && email.trim().toLowerCase() !== auth.user.email!.toLowerCase()) {
      return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
    }
    if (!plan || (plan !== "pro" && plan !== "business")) {
      return NextResponse.json(
        { error: "Plano inválido. Use 'pro' ou 'business'." },
        { status: 400 }
      );
    }

    const planNames = PLAN_NAMES[plan];
    if (!planNames) {
      return NextResponse.json(
        { error: "Plano não encontrado." },
        { status: 400 }
      );
    }

    const effectivePricing = await fetchEffectivePlanPrices();
    const product = {
      ...planNames,
      priceCents: effectivePricing[plan].priceCents,
    };

    const base = publicOrigin(req);

    const defaultCustomerId =
      process.env.ABACATEPAY_DEFAULT_CUSTOMER_ID?.trim() ?? "";

    /** Chave só v1: use true para não chamar checkout v2 (ignora prod_ da loja). */
    const useV1BillingOnly =
      process.env.ABACATEPAY_USE_V1_BILLING_ONLY === "true" ||
      process.env.ABACATEPAY_USE_V1_BILLING_ONLY === "1";

    /** Sem espaços em torno do `=` no .env (ex.: KEY=value), senão a variável não carrega. */
    const storeProductIdRaw =
      plan === "pro"
        ? process.env.ABACATEPAY_STORE_PRODUCT_ID_PRO?.replace(/\s/g, "") ?? ""
        : process.env.ABACATEPAY_STORE_PRODUCT_ID_BUSINESS?.replace(/\s/g, "") ??
          "";

    const storeProductId = useV1BillingOnly ? "" : storeProductIdRaw;

    // Prioridade: ref_code do body (enviado pelo frontend via cookie JS) > cookie httpOnly
    const refCode = (body.ref_code?.trim().toUpperCase() || req.cookies.get("ref_code")?.value?.trim().toUpperCase()) ?? "";

    const appUserEmailMeta =
      email?.trim() != null && email.trim() !== ""
        ? {
            metadata: {
              app_user_email: email.trim().toLowerCase(),
              ...(refCode ? { ref_code: refCode, plan } : {}),
            },
          }
        : (refCode ? { metadata: { ref_code: refCode, plan } } : {});

    const skipCheckoutProductImage =
      process.env.ABACATEPAY_CHECKOUT_SKIP_PRODUCT_IMAGE === "true" ||
      process.env.ABACATEPAY_CHECKOUT_SKIP_PRODUCT_IMAGE === "1";

    const v1BillingParams = (): AbacatePayCreateBillingParams => {
      const img = skipCheckoutProductImage
        ? undefined
        : checkoutProductImageUrl(plan, base);
      return {
      frequency: "ONE_TIME",
      // Tupla readonly não é atribuível a ("PIX" | "CARD")[] — array mutável explícito.
      methods: ["PIX", "CARD"] as ("PIX" | "CARD")[],
      products: [
        {
          externalId: `precifica3d-${plan}-${Date.now()}`,
          name: product.name,
          description: product.description,
          quantity: 1,
          price: product.priceCents,
          ...(img ? { imageUrl: img, image_url: img } : {}),
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
      };
    };

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
          ...(email?.trim() || refCode
            ? {
                metadata: {
                  ...(email?.trim() ? { app_user_email: email.trim().toLowerCase() } : {}),
                  ...(refCode ? { ref_code: refCode, plan } : {}),
                },
              }
            : {}),
        });
        return NextResponse.json({ url: billing.url, id: billing.id });
      } catch (v2Err) {
        if (isAbacatePayCustomerNotFoundError(v2Err)) {
          return NextResponse.json(
            { error: customerNotFoundUserMessage() },
            { status: 400 },
          );
        }
        if (!isAbacatePayV2KeyRejected(v2Err)) throw v2Err;
        /** Com `prod_...` configurado, não cair silencioso no v1 (outro preço/nome) — exige corrigir chave ou env. */
        return NextResponse.json(
          {
            error:
              "Checkout v2 da loja falhou: a chave API precisa ser v2 com permissão CHECKOUT:CREATE (ou a AbacatePay recusou o checkout). Opções: (1) Crie/edite a chave no painel AbacatePay com v2 + CHECKOUT:CREATE; (2) Confirme ABACATEPAY_STORE_PRODUCT_ID_PRO / _LIFETIME (prod_ da mesma conta); (3) Se quiser só API v1, remova os prod_ do .env e use ABACATEPAY_USE_V1_BILLING_ONLY=true (preço vem do código, não da loja).",
          },
          { status: 400 },
        );
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
    if (isAbacatePayCustomerNotFoundError(err)) {
      return NextResponse.json(
        { error: customerNotFoundUserMessage() },
        { status: 400 },
      );
    }
    const raw = err instanceof Error ? err.message : "Erro ao criar cobrança AbacatePay.";
    const hint = isAbacatePayV2KeyRejected(err)
      ? " Crie uma chave API v2 com CHECKOUT:CREATE ou use só billing v1 (sem ABACATEPAY_STORE_PRODUCT_ID_* + cust_ no .env)."
      : "";
    return NextResponse.json({ error: raw + hint }, { status: 500 });
  }
}
