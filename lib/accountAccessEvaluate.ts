import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAppTrialDays, parseTrialEndsAt } from "@/lib/appTrial";
import {
  getAbacatePayPaidEntitlement,
  isAbacatePayPaymentProvider,
} from "@/lib/abacatepayPaidPlan";
import { getStripePaidEntitlement } from "@/lib/stripePaidPlan";

export type AccountAccessResponse = {
  allowed: boolean;
  reason: "subscriber" | "app_trial" | "trial_expired" | "paywall_disabled";
  trialEndsAt: string;
  accountCreatedAt: string;
  hasPaidPlan: boolean;
  daysRemaining: number;
};

export async function evaluateAccountAccessFromJwt(
  jwt: string,
): Promise<
  | { ok: true; userId: string; body: AccountAccessResponse }
  | { ok: false; status: number; error: string }
> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return {
      ok: false,
      status: 500,
      error: "Supabase não configurado no servidor.",
    };
  }

  const supabase = createClient(url, anon);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(jwt);

  if (authErr || !user) {
    return { ok: false, status: 401, error: "Sessão inválida." };
  }

  const trialDays = getAppTrialDays();
  const metaEnd = parseTrialEndsAt(user.user_metadata?.trial_ends_at);
  const createdMs = new Date(user.created_at).getTime();
  const defaultEndMs = createdMs + trialDays * 86_400_000;
  const trialEndMs = metaEnd ? metaEnd.getTime() : defaultEndMs;
  const trialEndsIso = new Date(trialEndMs).toISOString();

  let hasPaidPlan = false;
  const abacateToken = process.env.ABACATEPAY_TOKEN?.trim();

  if (isAbacatePayPaymentProvider() && user.email && abacateToken) {
    if (user.user_metadata?.abacatepay_paid_at) {
      hasPaidPlan = true;
    } else {
      try {
        const ent = await getAbacatePayPaidEntitlement(abacateToken, user.email);
        hasPaidPlan = ent.paid;
      } catch {
        /* mantém trial por data */
      }
    }
  } else {
    const stripeSecret = process.env.STRIPE_SECRET_KEY?.trim();
    const pricePro = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
    const priceBiz = process.env.STRIPE_PRICE_LIFETIME?.trim();

    if (user.email && stripeSecret && pricePro && priceBiz) {
      try {
        const stripe = new Stripe(stripeSecret);
        const ent = await getStripePaidEntitlement(
          stripe,
          user.email,
          pricePro,
          priceBiz,
        );
        hasPaidPlan = ent.paid;
      } catch {
        /* mantém trial */
      }
    }
  }

  const now = Date.now();
  const inAppTrial = now <= trialEndMs;
  const allowed = hasPaidPlan || inAppTrial;

  const daysRemaining = inAppTrial
    ? Math.max(0, Math.ceil((trialEndMs - now) / 86_400_000))
    : 0;

  const body: AccountAccessResponse = {
    allowed,
    reason: allowed
      ? hasPaidPlan
        ? "subscriber"
        : "app_trial"
      : "trial_expired",
    trialEndsAt: trialEndsIso,
    accountCreatedAt: user.created_at,
    hasPaidPlan,
    daysRemaining,
  };

  return { ok: true, userId: user.id, body };
}
