"use client";

import { Suspense } from "react";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { MercadoLivreIntegration } from "@/components/settings/MercadoLivreIntegration";
import { ShopeeIntegration } from "@/components/settings/ShopeeIntegration";

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Configurações
      </h1>
      <Suspense fallback={null}>
        <MercadoLivreIntegration />
        <ShopeeIntegration />
      </Suspense>
      <SettingsForm />
    </div>
  );
}

