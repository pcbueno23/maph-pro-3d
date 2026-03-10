"use client";

import { useState } from "react";
import { Check, Crown, Infinity, Rocket } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type PlanId = "free" | "pro" | "lifetime";

interface Plan {
  id: PlanId;
  name: string;
  priceLabel: string;
  highlight?: boolean;
  description: string;
  features: string[];
  badge?: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceLabel: "R$ 0",
    description: "Ideal para começar a precificar impressões sem fricção.",
    features: [
      "7 dias para testar",
      "Calculadora básica de custos",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceLabel: "R$ 19,90 / mês",
    highlight: true,
    badge: "Para quem precisa precificar",
    description:
      "Para makers que querem organizar e profissionalizar apenas a precificação dos produtos (sem CRM completo).",
    features: [
      "Acesso à calculadora de precificação 3D",
      "Analisador STL/3MF para estimar peso e tempo automaticamente",
      "Suporte às regras de tarifas Shopee e Mercado Livre",
    ],
  },
  {
    id: "lifetime",
    name: "Business",
    priceLabel: "R$ 39,90 / mês",
    badge: "Acesso completo",
    description:
      "Para quem quer profissionalizar todo o negócio 3D: precificação, estoque, insumos, vendas e relatórios.",
    features: [
      "Tudo do Pro (calculadora + analisador STL/3MF)",
      "Módulo de estoque e insumos",
      "Registro de vendas e dashboard financeiro",
      "Relatórios de capital empregado e valor em estoque",
    ],
  },
];

export function PricingTable() {
  const { user } = useAuthStore();
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [loadingAbacatePayPlan, setLoadingAbacatePayPlan] = useState<PlanId | null>(null);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAbacatePayCheckout(plan: PlanId) {
    if (!user) {
      setError("Faça login para assinar um plano.");
      return;
    }
    if (plan === "free") return;
    setError(null);
    setLoadingAbacatePayPlan(plan);
    try {
      const res = await fetch("/api/abacatepay/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          email: user.email,
          name: user.user_metadata?.name ?? user.email?.split("@")[0],
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Não foi possível iniciar o checkout AbacatePay.");
      }
      window.location.href = data.url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar checkout AbacatePay.");
    } finally {
      setLoadingAbacatePayPlan(null);
    }
  }

  async function handleCheckout(plan: PlanId) {
    if (!user) {
      setError("Faça login para assinar um plano.");
      return;
    }

    if (plan === "free") {
      setError("Você já tem acesso ao plano Free. Explore os planos pagos.");
      return;
    }

    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, email: user.email }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Não foi possível iniciar o checkout.");
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Erro ao iniciar checkout.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function handlePortal() {
    if (!user) {
      setError("Faça login para acessar o portal de cobrança.");
      return;
    }

    setError(null);
    setLoadingPortal(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ??
            "Não foi possível abrir o portal. Verifique se há uma assinatura ativa.",
        );
      }
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message ?? "Erro ao abrir portal do cliente.");
    } finally {
      setLoadingPortal(false);
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-slate-900/60 px-3 py-1 text-[11px] font-medium text-cyan-300 shadow-neon-cyan">
          <Rocket className="h-3 w-3" />
          <span>Escolha o plano ideal para o seu laboratório 3D</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-50 md:text-3xl">
          Comece Free. Cresça no ritmo das suas vendas.
        </h1>
        <p className="text-sm text-slate-400 md:text-base">
          Planos pensados para quem está começando e para quem já roda a
          impressora praticamente todo dia.
        </p>
      </header>

      {error && (
        <p className="text-center text-xs text-rose-400">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const Icon =
            plan.id === "free" ? Infinity : plan.id === "pro" ? Crown : Rocket;
          const isLoading = loadingPlan === plan.id;

          return (
            <article
              key={plan.id}
              className={`relative flex h-full flex-col rounded-2xl border bg-slate-950/70 p-4 transition hover:-translate-y-1 hover:border-cyan-500/40 hover:shadow-neon-cyan ${
                plan.highlight
                  ? "border-cyan-500/60 shadow-neon-cyan"
                  : "border-slate-800"
              }`}
            >
              {plan.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-cyan-500/10 px-2 py-1 text-[10px] font-medium text-cyan-300">
                  {plan.badge}
                </span>
              )}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/80">
                  <Icon className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-50">
                    {plan.name}
                  </h2>
                  <p className="text-xs text-slate-400">{plan.priceLabel}</p>
                </div>
              </div>

              <p className="mb-3 text-xs text-slate-400">
                {plan.description}
              </p>

              <ul className="mb-4 space-y-1.5 text-xs text-slate-200">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3 w-3 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleCheckout(plan.id)}
                  className={`flex w-full items-center justify-center rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    plan.id === "free"
                      ? "border border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-900"
                      : "bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  {plan.id === "free"
                    ? "Começar grátis"
                    : isLoading
                      ? "Redirecionando..."
                      : "Assinar com Stripe"}
                </button>
                {plan.id !== "free" && (
                  <>
                    <button
                      type="button"
                      disabled={loadingAbacatePayPlan === plan.id}
                      onClick={() => handleAbacatePayCheckout(plan.id)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {loadingAbacatePayPlan === plan.id
                        ? "Abrindo AbacatePay..."
                        : "Pagar com PIX ou Cartão (AbacatePay)"}
                    </button>
                    <p className="text-[10px] text-slate-500">
                      Stripe ou AbacatePay (PIX/Cartão). Pagamento seguro.
                    </p>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-xs text-slate-400 md:flex-row md:justify-between">
        <p>
          Todos os planos podem ser gerenciados a qualquer momento diretamente
          pelo portal do Stripe.
        </p>
        <button
          type="button"
          onClick={handlePortal}
          disabled={loadingPortal}
          className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-[11px] text-slate-100 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingPortal
            ? "Abrindo portal..."
            : "Abrir portal do cliente (Stripe)"}
        </button>
      </div>
    </section>
  );
}

