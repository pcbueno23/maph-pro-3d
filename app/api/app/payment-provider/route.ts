import { NextResponse } from "next/server";
import { isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";

/** Evita cache estático/CDN: o valor depende de `APP_PAYMENT_PROVIDER` em runtime. */
export const dynamic = "force-dynamic";

/**
 * Qual provedor o painel Planos deve usar (sem precisar de NEXT_PUBLIC_*).
 * Padrão: **stripe** — só retorna `abacatepay` se APP_PAYMENT_PROVIDER=abacatepay (ver .env.example).
 */
export async function GET() {
  const provider = isAbacatePayPaymentProvider() ? "abacatepay" : "stripe";
  return NextResponse.json(
    { provider },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
