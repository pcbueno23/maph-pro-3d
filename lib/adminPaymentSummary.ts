import Stripe from "stripe";
import {
  getAbacatePayPaidEntitlement,
  isAbacatePayPaymentProvider,
} from "@/lib/abacatepayPaidPlan";
import { getStripePaidEntitlement } from "@/lib/stripePaidPlan";

export type AdminPaymentSummary = {
  provider: "stripe" | "abacatepay" | "none";
  paid: boolean;
  plan: string;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  currentPeriodEnd: string | null;
  error?: string;
};

export async function getAdminPaymentSummary(
  email: string | null | undefined,
): Promise<AdminPaymentSummary> {
  if (!email?.trim()) {
    return {
      provider: "none",
      paid: false,
      plan: "free",
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
    };
  }

  const abacateToken = process.env.ABACATEPAY_TOKEN?.trim();

  if (isAbacatePayPaymentProvider() && abacateToken) {
    try {
      const ent = await getAbacatePayPaidEntitlement(abacateToken, email);
      return {
        provider: "abacatepay",
        paid: ent.paid,
        plan: ent.plan,
        subscriptionStatus: ent.subscriptionStatus ?? null,
        isTrialing: ent.isTrialing,
        currentPeriodEnd: ent.currentPeriodEnd ?? null,
      };
    } catch (e) {
      return {
        provider: "abacatepay",
        paid: false,
        plan: "free",
        subscriptionStatus: null,
        isTrialing: false,
        currentPeriodEnd: null,
        error: e instanceof Error ? e.message : "Erro AbacatePay",
      };
    }
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
  const pricePro = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const priceBiz = process.env.STRIPE_PRICE_LIFETIME?.trim();

  if (!stripeSecret || !pricePro || !priceBiz) {
    return {
      provider: "none",
      paid: false,
      plan: "free",
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
      error: "Stripe não configurado (env).",
    };
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const ent = await getStripePaidEntitlement(
      stripe,
      email,
      pricePro,
      priceBiz,
    );
    return {
      provider: "stripe",
      paid: ent.paid,
      plan: ent.plan,
      subscriptionStatus: ent.subscriptionStatus ?? null,
      isTrialing: ent.isTrialing,
      currentPeriodEnd: ent.currentPeriodEnd ?? null,
    };
  } catch (e) {
    return {
      provider: "stripe",
      paid: false,
      plan: "free",
      subscriptionStatus: null,
      isTrialing: false,
      currentPeriodEnd: null,
      error: e instanceof Error ? e.message : "Erro Stripe",
    };
  }
}
