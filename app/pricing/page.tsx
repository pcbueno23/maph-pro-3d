import { Suspense } from "react";
import { PlansManagement } from "@/components/billing/PlansManagement";
import { isAbacatePayPaymentProvider } from "@/lib/abacatepayPaidPlan";

/** Lê `APP_PAYMENT_PROVIDER` em cada request (Vercel / produção), não só no build. */
export const dynamic = "force-dynamic";

export default function PricingPage() {
  const defaultPaymentProvider = isAbacatePayPaymentProvider()
    ? "abacatepay"
    : "stripe";

  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-slate-400">Carregando planos…</p>
      }
    >
      <PlansManagement defaultPaymentProvider={defaultPaymentProvider} />
    </Suspense>
  );
}

