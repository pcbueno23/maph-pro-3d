import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAppTrialDays, parseTrialEndsAt } from "@/lib/appTrial";
import { getAbacatePayPaidEntitlement, isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";
import { getStripePaidEntitlement } from "@/lib/stripePaidPlan";

export type AccountAccessResponse = {
  allowed: boolean;
  reason: "subscriber" | "app_trial" | "trial_expired" | "paywall_disabled";
  trialEndsAt: string;
  accountCreatedAt: string;
  hasPaidPlan: boolean;
  daysRemaining: number;
};

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export async function GET(req: NextRequest) {
  if (process.env.APP_PAYWALL_DISABLED === "true") {
    return NextResponse.json({
      allowed: true,
      reason: "paywall_disabled",
      trialEndsAt: new Date().toISOString(),
      accountCreatedAt: new Date().toISOString(),
      hasPaidPlan: false,
      daysRemaining: 999,
    } satisfies AccountAccessResponse);
  }

  const token = getBearerToken(req);
  if (!token) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { error: "Supabase não configurado no servidor." },
      { status: 500 },
    );
  }

  const supabase = createClient(url, anon);
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
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
    try {
      const ent = await getAbacatePayPaidEntitlement(abacateToken, user.email);
      hasPaidPlan = ent.paid;
    } catch {
      // Falha na listagem: mantém trial por data
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
        // Se Stripe falhar, ainda permitimos quem está dentro do trial por data.
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

  return NextResponse.json(body);
}
