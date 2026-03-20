"use client";

import { Suspense } from "react";
import { PlansManagement } from "@/components/billing/PlansManagement";

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <p className="p-6 text-sm text-slate-400">Carregando planos…</p>
      }
    >
      <PlansManagement />
    </Suspense>
  );
}

