import { NextResponse } from "next/server";
import { isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";

/**
 * Qual provedor o painel Planos deve usar (sem precisar de NEXT_PUBLIC_*).
 * Padrão: **stripe** — só retorna `abacatepay` se APP_PAYMENT_PROVIDER=abacatepay (ver .env.example).
 */
export async function GET() {
  return NextResponse.json({
    provider: isAbacatePayPaymentProvider() ? "abacatepay" : "stripe",
  });
}
