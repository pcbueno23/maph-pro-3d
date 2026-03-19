"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { STLAnalyzer } from "./STLAnalyzer";

type PlanEntitlement = "free" | "pro" | "business";

type StripeStatusResponse = {
  error?: string;
  plan: PlanEntitlement;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  currentPeriodEnd: string | null;
};

export function AnalyzerEntitlementGate() {
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<StripeStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!user?.email) {
        setStatus({
          plan: "free",
          subscriptionStatus: null,
          isTrialing: false,
          currentPeriodEnd: null,
        });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stripe/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });
        const data = (await res.json()) as StripeStatusResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "Falha ao buscar status do plano.");
        }
        setStatus(data);
      } catch (e: any) {
        setError(e?.message ?? "Falha ao buscar status do plano.");
        setStatus({
          plan: "free",
          subscriptionStatus: null,
          isTrialing: false,
          currentPeriodEnd: null,
        });
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [user?.email]);

  const canUseAnalyzer = useMemo(() => {
    if (!status) return false;
    return status.plan !== "free" && status.isTrialing === false;
  }, [status]);

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando acesso do Analisador STL...</p>;
  }

  if (!canUseAnalyzer) {
    const when = status?.currentPeriodEnd
      ? new Date(status.currentPeriodEnd).toLocaleDateString("pt-BR")
      : null;

    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <h2 className="text-lg font-semibold text-slate-50">Analisador STL está OFF</h2>
        <p className="mt-2 text-sm text-slate-400">
          {status?.plan === "pro" && status?.isTrialing
            ? `Seu trial do Pro termina em ${when ?? "breve"}. Depois, assine Pro ou Business para liberar o Analisador STL.`
            : "Para liberar o Analisador STL, assine Pro ou Business."}
        </p>
        {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/pricing"
            className="inline-flex rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400"
          >
            Ver planos
          </a>
          <a
            href="/calculator"
            className="inline-flex rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900"
          >
            Usar calculadora
          </a>
        </div>
      </div>
    );
  }

  return <STLAnalyzer />;
}

