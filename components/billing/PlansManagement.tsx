"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Crown, Infinity, PartyPopper, Rocket, XCircle } from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";

type PlanEntitlement = "free" | "pro" | "business";

type StripeStatusResponse = {
  error?: string;
  plan: PlanEntitlement;
  subscriptionStatus: string | null;
  isTrialing: boolean;
  currentPeriodEnd: string | null;
};

/** Evita bump duplicado em dev (Strict Mode) ou re-renders rápidos ao voltar do Stripe. */
let lastBumpAfterStripeMs = 0;

function initialPaymentProviderFromEnv(): "stripe" | "abacatepay" {
  const v = process.env.NEXT_PUBLIC_APP_PAYMENT_PROVIDER?.trim().toLowerCase();
  return v === "abacatepay" ? "abacatepay" : "stripe";
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error((data as any)?.error ?? "Falha na requisição.");
  }
  return data;
}

export function PlansManagement() {
  const { user } = useAuthStore();
  const bumpAccessCheck = useAccessStore((s) => s.bumpAccessCheck);
  const accessChecked = useAccessStore((s) => s.checked);
  const accessPaid = useAccessStore((s) => s.hasPaidPlan);
  const accessDaysRemaining = useAccessStore((s) => s.daysRemaining);
  const accessTrialEndsAt = useAccessStore((s) => s.trialEndsAt);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "abacatepay">(
    initialPaymentProviderFromEnv,
  );
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

      let provider: "stripe" | "abacatepay" = "stripe";
      try {
        const pr = await fetch("/api/app/payment-provider", { cache: "no-store" });
        const pj = (await pr.json()) as { provider?: string };
        if (pj.provider === "abacatepay") provider = "abacatepay";
      } catch {
        /* mantém stripe */
      }
      setPaymentProvider(provider);

      const statusUrl =
        provider === "abacatepay" ? "/api/abacatepay/status" : "/api/stripe/status";
      try {
        const data = await postJson<StripeStatusResponse>(statusUrl, {
          email: user.email,
        });
        setStatus(data);
      } catch {
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

  /** Mantém o aviso visível depois de remover ?success=1 / ?canceled=1 da URL (evita F5 preso na query). */
  const [stickySuccessBanner, setStickySuccessBanner] = useState(false);
  const [stickyCanceledBanner, setStickyCanceledBanner] = useState(false);
  const qpSuccess = searchParams.get("success") === "1";
  const qpCanceled = searchParams.get("canceled") === "1";
  const checkoutSuccess = qpSuccess || stickySuccessBanner;
  const checkoutCanceled = qpCanceled || stickyCanceledBanner;

  useEffect(() => {
    if (!qpSuccess && !qpCanceled) {
      return;
    }

    if (qpSuccess) {
      setStickySuccessBanner(true);
      const now = Date.now();
      if (now - lastBumpAfterStripeMs > 800) {
        lastBumpAfterStripeMs = now;
        bumpAccessCheck();
      }
    }
    if (qpCanceled) {
      setStickyCanceledBanner(true);
    }

    // Remove a query na barra de endereço logo — assim F5 não re-dispara o fluxo nem “prende” na URL.
    router.replace("/pricing", { scroll: false });
  }, [qpSuccess, qpCanceled, bumpAccessCheck, router]);

  const clearCheckoutQuery = useCallback(() => {
    setStickySuccessBanner(false);
    setStickyCanceledBanner(false);
    router.replace("/pricing", { scroll: false });
  }, [router]);

  const trialEnd = useMemo(() => {
    if (!status?.currentPeriodEnd) return null;
    if (!status.isTrialing) return null;
    try {
      return new Date(status.currentPeriodEnd).toLocaleDateString("pt-BR");
    } catch {
      return null;
    }
  }, [status]);

  const handleCheckout = useCallback(
    async (nextPlan: "pro" | "lifetime") => {
      if (!user) {
        router.push("/login");
        return;
      }

      setError(null);
      setLoadingAction(true);
      try {
        const checkoutPath =
          paymentProvider === "abacatepay"
            ? "/api/abacatepay/billing"
            : "/api/stripe/checkout";
        const data = await postJson<{ url?: string; error?: string }>(checkoutPath, {
          plan: nextPlan,
          email: user.email,
        });
        if (!data.url)
          throw new Error(data.error ?? "URL do checkout não encontrada.");
        window.location.href = data.url;
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Erro ao iniciar checkout.";
        setError(msg);
      } finally {
        setLoadingAction(false);
      }
    },
    [router, user, paymentProvider],
  );

  async function handlePortal() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (paymentProvider !== "stripe") return;

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

  const paidActive =
    accessChecked && accessPaid && plan !== "free";

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {checkoutSuccess ? (
        <div
          className={`flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-start sm:justify-between ${
            paidActive
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-cyan-500/40 bg-cyan-500/10"
          }`}
          role="status"
        >
          <div className="flex gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                paidActive ? "bg-emerald-500/20" : "bg-cyan-500/20"
              }`}
            >
              <PartyPopper
                className={`h-5 w-5 ${paidActive ? "text-emerald-300" : "text-cyan-300"}`}
              />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-50">
                {paidActive
                  ? "Pagamento confirmado — plano ativo"
                  : "Pagamento recebido"}
              </p>
              <p className="text-xs leading-relaxed text-slate-300">
                {paidActive ? (
                  <>
                    Sua assinatura já está liberada no app. Você pode voltar ao{" "}
                    <Link
                      href="/dashboard"
                      className="font-medium text-cyan-400 underline decoration-cyan-500/50 underline-offset-2 hover:text-cyan-300"
                    >
                      painel
                    </Link>{" "}
                    ou continuar por aqui.
                  </>
                ) : (
                  <>
                    Obrigado! Estamos confirmando seu pagamento
                    {paymentProvider === "abacatepay"
                      ? " na AbacatePay"
                      : " no Stripe"}{" "}
                    — o bloco &quot;Painel de Assinatura&quot; deve atualizar em alguns
                    segundos. Se continuar como Free,{" "}
                    <strong className="text-slate-200">atualize a página (F5)</strong>.
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearCheckoutQuery}
            className="shrink-0 self-start rounded-lg border border-slate-600/80 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Fechar aviso
          </button>
        </div>
      ) : null}

      {checkoutCanceled ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <XCircle className="h-5 w-5 text-amber-300" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-50">Checkout encerrado</p>
              <p className="text-xs leading-relaxed text-slate-300">
                O pagamento não foi concluído. Nada foi cobrado — você pode assinar de novo
                quando quiser.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearCheckoutQuery}
            className="shrink-0 self-start rounded-lg border border-slate-600/80 bg-slate-900/60 px-3 py-1.5 text-[11px] font-medium text-slate-300 transition hover:bg-slate-800"
          >
            Fechar aviso
          </button>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
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
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Acesso básico.</p>
                  {accessChecked &&
                  !accessPaid &&
                  accessDaysRemaining != null &&
                  accessDaysRemaining > 0 &&
                  accessTrialEndsAt ? (
                    <p className="text-xs text-cyan-400">
                      Teste grátis (sem cartão):{" "}
                      <strong>{accessDaysRemaining}</strong> dia(s) restante(s).
                      Encerra em{" "}
                      {new Date(accessTrialEndsAt).toLocaleDateString("pt-BR")}
                      .
                    </p>
                  ) : null}
                </div>
              ) : isOnTrial ? (
                <p className="text-xs text-slate-400">
                  Status: Período de teste (trial). {trialEnd ? `Termina em ${trialEnd}.` : ""}
                </p>
              ) : (
                <p className="text-xs text-slate-400">
                  Status: Plano pago ativo
                  {paymentProvider === "abacatepay"
                    ? " (AbacatePay)."
                    : " (Stripe)."}
                </p>
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
            {plan !== "free" && paymentProvider === "stripe" ? (
              <button
                type="button"
                disabled={loadingAction}
                onClick={() => void handlePortal()}
                className="rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Abrir Painel de Assinatura
              </button>
            ) : null}
            {plan !== "free" && paymentProvider === "abacatepay" ? (
              <p className="text-xs text-slate-500">
                Gestão de cobrança na AbacatePay é pelo painel do gateway; aqui só
                exibimos o plano detectado após pagamento.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Plano Pro mensal
          </p>
          <p className="mt-2 text-sm font-medium text-slate-100">
            Ideal para começar. Todas as funções do app com cobrança mensal por R$ 29,90.
          </p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <ul className="space-y-2 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Acesso completo ao app</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Pagamento mensal (cartão)</span>
              </li>
            </ul>
          </div>
          <button
            type="button"
            disabled={loadingAction || (plan === "pro" && !isOnTrial)}
            onClick={() => void handleCheckout("pro")}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {plan === "pro" && !isOnTrial
              ? "Você já está no Pro"
              : paymentProvider === "abacatepay"
                ? "Pagar Pro (PIX ou cartão — AbacatePay)"
                : "Assinar Pro (Stripe)"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-200">
                <span className="text-cyan-200">Economize com o Plano Anual</span>
              </p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-50">
                R$ 199,90/ano
              </h3>
              <p className="text-sm text-slate-400">equivalente a R$ 16,66/mês no plano anual.</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/30 p-3">
            <p className="text-xs font-semibold text-slate-200">Por que é melhor?</p>
            <ul className="mt-2 space-y-2 text-xs text-slate-200">
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Mensal: R$ 29,90/mês</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-400" />
                <span>Anual: R$ 199,90/ano com economia de 44% em relação ao mensal</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            disabled={loadingAction || (plan === "business" && !isOnTrial)}
            onClick={() => void handleCheckout("lifetime")}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan hover:from-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {plan === "business" && !isOnTrial
              ? "Você já está no Business"
              : paymentProvider === "abacatepay"
                ? "Pagar Plano Anual (PIX ou cartão — AbacatePay)"
                : "Assinar Plano Anual (Business — Stripe)"}
          </button>
        </div>
      </div>
    </section>
    </div>
  );
}
