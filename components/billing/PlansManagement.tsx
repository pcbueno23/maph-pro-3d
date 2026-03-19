"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Crown, Infinity, Rocket } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

type PlanEntitlement = "free" | "pro" | "business";

type StripeStatusResponse = {
  error?: string;
  plan: PlanEntitlement;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  currentPeriodEnd: string | null;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error((data as any)?.error ?? "Falha na requisição.");
  }
  return data;
}

export function PlansManagement() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StripeStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);

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

      try {
        const data = await postJson<StripeStatusResponse>("/api/stripe/status", {
          email: user.email,
        });
        setStatus(data);
      } catch {
        // Se a consulta de status falhar (ex.: Stripe ainda não configurado),
        // não exibimos erro no painel; assumimos fallback em Free.
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

  const isOnTrial = Boolean(status?.isTrialing);
  const plan = status?.plan ?? "free";


  const trialEnd = useMemo(() => {
    if (!status?.currentPeriodEnd) return null;
    if (!status.isTrialing) return null;
    try {
      return new Date(status.currentPeriodEnd).toLocaleDateString("pt-BR");
    } catch {
      return null;
    }
  }, [status]);

  async function handleCheckout(nextPlan: "pro" | "lifetime") {
    if (!user) {
      router.push("/login");
      return;
    }

    setError(null);
    setLoadingAction(true);
    try {
      const data = await postJson<{ url?: string; error?: string }>(
        "/api/stripe/checkout",
        { plan: nextPlan, email: user.email },
      );
      if (!data.url) throw new Error(data.error ?? "URL do checkout não encontrada.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Erro ao iniciar checkout.");
    } finally {
      setLoadingAction(false);
    }
  }

  async function handlePortal() {
    if (!user) {
      router.push("/login");
      return;
    }

    setError(null);
    setLoadingAction(true);
    try {
      const data = await postJson<{ url?: string; error?: string }>(
        "/api/stripe/portal",
        { email: user.email },
      );
      if (!data.url) throw new Error(data.error ?? "URL do portal não encontrada.");
      window.location.href = data.url;
    } catch (e: any) {
      setError(e?.message ?? "Erro ao abrir portal de assinatura.");
    } finally {
      setLoadingAction(false);
    }
  }

  const proIcon = <Crown className="h-4 w-4 text-cyan-300" />;
  const businessIcon = <Rocket className="h-4 w-4 text-emerald-300" />;
  const freeIcon = <Infinity className="h-4 w-4 text-slate-300" />;

  if (loading) {
    return <p className="text-sm text-slate-400">Carregando planos...</p>;
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5 shadow-[0_0_0_1px_rgba(6,182,212,0.10)]">
        <div className="mb-4 space-y-1">
          <h2 className="text-xl font-semibold text-slate-50">Painel de Assinatura</h2>
          <p className="text-sm text-slate-400">
            Tudo o que você precisa para manter o acesso em dia.
          </p>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950/40">
              {plan === "pro" ? proIcon : plan === "business" ? businessIcon : freeIcon}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-50">
                Plano {plan === "pro" ? "Pro" : plan === "business" ? "Business" : "Free"}
              </p>
              {plan === "free" ? (
                <p className="text-xs text-slate-400">Acesso básico.</p>
              ) : isOnTrial ? (
                <p className="text-xs text-slate-400">
                  Status: Período de teste (trial). {trialEnd ? `Termina em ${trialEnd}.` : ""}
                </p>
              ) : (
                <p className="text-xs text-slate-400">Status: Assinatura ativa.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-xs font-semibold text-slate-200">Funções no plano (ON)</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Calculadora de precificação 3D</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Regras de tarifas Shopee e Mercado Livre</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Produtos e gestão de peças produzidas</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Estoque / Insumos e histórico</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Ordens, Vendas e Relatórios</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <p className="text-xs font-semibold text-slate-200">Diferença Pro vs Business</p>
            <p className="mt-2 text-xs text-slate-300">
              Pro e Business têm as mesmas funções. A diferença é só o preço: Business é mais barato e é cobrado no plano anual.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {plan !== "free" ? (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => void handlePortal()}
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Abrir Painel de Assinatura
              </button>
            ) : null}
          </div>

          {plan === "free" || isOnTrial ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => void handleCheckout("pro")}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Assinar Pro
              </button>
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => void handleCheckout("lifetime")}
                className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Assinar Business anual
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
                <span className="text-cyan-200">Economize com o Plano Anual</span>
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-50">
                R$ 19,90/mês
              </h3>
              <p className="text-sm text-slate-400">cobrando anual em 12x de R$ 19,90.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs font-semibold text-slate-200">Por que é melhor?</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Mais baixo que o Pro mensal (R$ 24,99/mês)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Após 7 dias de trial, você assina Pro ou Business</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={loadingAction}
            onClick={() => void handleCheckout("lifetime")}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan hover:from-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Assinar Plano Anual (Business)
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <p className="text-xs font-semibold text-slate-200">O que fica ON</p>
          <p className="mt-2 text-xs text-slate-300">
            Tudo do Pro/Business para gestão de operação, custos e vendas.
          </p>
        </div>
      </div>
    </section>
  );
}

