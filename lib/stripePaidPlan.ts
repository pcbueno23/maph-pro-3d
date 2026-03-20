import Stripe from "stripe";

export type PaidPlanEntitlement = "free" | "pro" | "business";

export type PaidPlanResult = {
  paid: boolean;
  plan: PaidPlanEntitlement;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  currentPeriodEnd: string | null;
};

/**
 * Verifica se o e-mail tem assinatura Stripe ativa ou em trial (pago).
 */
export async function getStripePaidEntitlement(
  stripe: Stripe,
  email: string,
  priceProMonthly: string,
  priceBusinessAnnual: string,
): Promise<PaidPlanResult> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    return {
      paid: false,
      plan: "free",
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
    };
  }

  const subs = await stripe.subscriptions.list({
    customer: customer.id,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  const relevant = subs.data
    .map((s) => {
      const subAny = s as {
        current_period_end?: number;
        trial_end?: number;
      };
      const item = s.items.data[0];
      const priceId =
        typeof item?.price === "string" ? item.price : item?.price?.id;
      const plan: PaidPlanEntitlement =
        priceId === priceProMonthly
          ? "pro"
          : priceId === priceBusinessAnnual
            ? "business"
            : "free";
      return {
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

  const trialing = relevant.find((r) => r.status === "trialing");
  if (trialing) {
    return {
      paid: true,
      plan: trialing.plan,
      subscriptionStatus: trialing.status,
      isTrialing: true,
      currentPeriodEnd: trialing.trialEnd ?? trialing.currentPeriodEnd,
    };
  }

  const active = relevant.find((r) => r.status === "active");
  if (active) {
    return {
      paid: true,
      plan: active.plan,
      subscriptionStatus: active.status,
      isTrialing: false,
      currentPeriodEnd: active.currentPeriodEnd,
    };
  }

  return {
    paid: false,
    plan: "free",
    subscriptionStatus: null,
    isTrialing: false,
    currentPeriodEnd: null,
  };
}
