import { NextResponse } from "next/server";
import { isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";

/**
 * Qual provedor o painel Planos deve usar (sem precisar de NEXT_PUBLIC_*).
 * Cliente chama no mount; valor vem de APP_PAYMENT_PROVIDER no servidor.
 */
export async function GET() {
  return NextResponse.json({
    provider: isAbacatePayPaymentProvider() ? "abacatepay" : "stripe",
  });
}
