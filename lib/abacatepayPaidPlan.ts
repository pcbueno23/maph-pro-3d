import { listBillings, type AbacatePayBillingListItem } from "@/lib/abacatepay";
import type { PaidPlanEntitlement, PaidPlanResult } from "@/lib/stripePaidPlan";

function normEmail(e: string): string {
  return e.trim().toLowerCase();
}

/**
 * Cobrança pertence ao usuário logado se metadata.app_user_email bater
 * (gravado ao criar checkout) ou se o cliente AbacatePay tiver o mesmo e-mail.
 */
function billingMatchesEmail(b: AbacatePayBillingListItem, email: string): boolean {
  const want = normEmail(email);
  const meta = b.metadata;
  if (meta && typeof meta.app_user_email === "string" && normEmail(meta.app_user_email) === want) {
    return true;
  }
  const c = b.customer;
  if (!c) return false;
  const m = c.metadata;
  if (m?.email && normEmail(m.email) === want) return true;
  if (c.email && normEmail(c.email) === want) return true;
  return false;
}

function parseProductIdList(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function planFromProducts(
  b: AbacatePayBillingListItem,
  proIds: Set<string>,
  bizIds: Set<string>,
): PaidPlanEntitlement {
  const products = b.products ?? [];
  for (const p of products) {
    const ext = String(p.externalId ?? "");
    if (ext.startsWith("precifica3d-pro")) return "pro";
    if (ext.startsWith("precifica3d-business") || ext.startsWith("precifica3d-lifetime")) return "business";
    const pid = String(p.id ?? "");
    if (proIds.has(pid)) return "pro";
    if (bizIds.has(pid)) return "business";
  }
  return "free";
}

/**
 * Espelha a ideia do Stripe: há assinatura/compra paga válida para este e-mail?
 * AbacatePay não tem trial de gateway como o Stripe; trial do app continua em /api/account/access.
 *
 * Requer cobrança com status PAID e identificação do usuário (metadata ou cliente).
 * Chave API: BILLING:READ para listar.
 */
export async function getAbacatePayPaidEntitlement(
  apiToken: string,
  email: string,
): Promise<PaidPlanResult> {
  const empty: PaidPlanResult = {
    paid: false,
    plan: "free",
    subscriptionStatus: null,
    isTrialing: false,
    currentPeriodEnd: null,
  };

  if (!email?.trim()) return empty;

  const proIds = parseProductIdList(
    process.env.ABACATEPAY_ACCESS_PRO_PRODUCT_IDS ?? process.env.ABACATEPAY_STORE_PRODUCT_ID_PRO,
  );
  const bizIds = parseProductIdList(
    process.env.ABACATEPAY_ACCESS_BUSINESS_PRODUCT_IDS ??
      process.env.ABACATEPAY_STORE_PRODUCT_ID_LIFETIME,
  );

  let list: AbacatePayBillingListItem[];
  try {
    list = await listBillings(apiToken);
  } catch {
    return empty;
  }

  const paid = list.filter((b) => {
    const st = String(b.status ?? "").toUpperCase();
    return st === "PAID" && billingMatchesEmail(b, email);
  });

  const scored = paid
    .map((b) => {
      const plan = planFromProducts(b, proIds, bizIds);
      const t = b.updatedAt ?? b.createdAt ?? "";
      return { b, plan, t };
    })
    .filter((x) => x.plan !== "free");

  if (scored.length === 0) return empty;

  scored.sort((a, b) => (a.t > b.t ? -1 : a.t < b.t ? 1 : 0));
  const best = scored[0];

  const periodEnd =
    best.b.nextBilling ??
    best.b.updatedAt ??
    best.b.createdAt ??
    null;

  return {
    paid: true,
    plan: best.plan,
    subscriptionStatus: "PAID",
    isTrialing: false,
    currentPeriodEnd: periodEnd,
  };
}

/**
 * Só retorna true se `APP_PAYMENT_PROVIDER=abacatepay` (trim, case-insensitive).
 * Qualquer outro valor, vazio ou ausente → **Stripe** como provedor do paywall e do painel Planos.
 */
export function isAbacatePayPaymentProvider(): boolean {
  const v = process.env.APP_PAYMENT_PROVIDER?.trim().toLowerCase();
  return v === "abacatepay";
}
