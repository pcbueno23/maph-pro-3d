import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/adminApiAuth";
import { isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const checks: Record<
    string,
    { ok: boolean; detail?: string }
  > = {};

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && anon) {
    try {
      const supabase = createClient(url, anon);
      const { error } = await supabase.from("app_marketing").select("id").limit(1);
      checks.supabase = { ok: !error, detail: error?.message };
    } catch (e) {
      checks.supabase = {
        ok: false,
        detail: e instanceof Error ? e.message : "erro",
      };
    }
  } else {
    checks.supabase = { ok: false, detail: "URL ou anon key ausentes" };
  }

  if (isAbacatePayPaymentProvider()) {
    const token = process.env.ABACATEPAY_TOKEN?.trim();
    if (!token) {
      checks.abacatepay = { ok: false, detail: "ABACATEPAY_TOKEN ausente" };
    } else {
      checks.abacatepay = {
        ok: true,
        detail: "Token definido (teste de API não executado).",
      };
    }
  } else {
    const sk = process.env.STRIPE_SECRET_KEY?.trim();
    const pro = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
    const biz = process.env.STRIPE_PRICE_LIFETIME?.trim();
    if (!sk || !pro || !biz) {
      checks.stripe = {
        ok: false,
        detail: "STRIPE_SECRET_KEY ou preços ausentes",
      };
    } else {
      try {
        const stripe = new Stripe(sk);
        await stripe.prices.retrieve(pro);
        checks.stripe = { ok: true, detail: "Preço Pro acessível" };
      } catch (e) {
        checks.stripe = {
          ok: false,
          detail: e instanceof Error ? e.message : "erro Stripe",
        };
      }
    }
  }

  return NextResponse.json({ checks: checks as typeof checks });
}
