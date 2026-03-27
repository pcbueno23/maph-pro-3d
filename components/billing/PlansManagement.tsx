"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  CreditCard,
  Crown,
  Infinity,
  PartyPopper,
  Rocket,
  Shield,
  Sparkles,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { useAccessStore } from "@/store/accessStore";
import { getPlanPricingFromConfig } from "@/lib/planPricing";

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

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Mesmas regras do backend (`canSendCustomer`): CPF 11 / CNPJ 14, celular com DDD. */
function isValidAbacatePayer(name: string, taxId: string, cellphone: string): boolean {
  const n = name.trim();
  const td = digitsOnly(taxId);
  const ph = digitsOnly(cellphone);
  if (n.length < 3) return false;
  if (td.length !== 11 && td.length !== 14) return false;
  if (ph.length < 10 || ph.length > 13) return false;
  return true;
}

async function postJson<T>(url: string, body: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as T;
  if (!res.ok) {
    throw new Error((data as any)?.error ?? "Falha na requisição.");
  }
  return data;
}

type PlansManagementProps = {
  /** Definido no servidor (`/pricing`) a partir de `APP_PAYMENT_PROVIDER` — necessário na Vercel sem `NEXT_PUBLIC_*`. */
  defaultPaymentProvider?: "stripe" | "abacatepay";
};

export function PlansManagement({
  defaultPaymentProvider,
}: PlansManagementProps = {}) {
  const { user, session } = useAuthStore();
  const bumpAccessCheck = useAccessStore((s) => s.bumpAccessCheck);
  const accessChecked = useAccessStore((s) => s.checked);
  const accessPaid = useAccessStore((s) => s.hasPaidPlan);
  const accessDaysRemaining = useAccessStore((s) => s.daysRemaining);
  const accessTrialEndsAt = useAccessStore((s) => s.trialEndsAt);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [pricing, setPricing] = useState(() => getPlanPricingFromConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/site-config", { cache: "no-store" });
        if (!res.ok) return;
        const j = (await res.json()) as { data?: Record<string, unknown> };
        if (j.data) setPricing(getPlanPricingFromConfig(j.data as Parameters<typeof getPlanPricingFromConfig>[0]));
      } catch {
        /* mantém defaults */
      }
    })();
  }, []);
  const [paymentProvider, setPaymentProvider] = useState<"stripe" | "abacatepay">(
    () =>
      defaultPaymentProvider === "abacatepay" ||
      defaultPaymentProvider === "stripe"
        ? defaultPaymentProvider
        : initialPaymentProviderFromEnv(),
  );
  const [status, setStatus] = useState<StripeStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  /** Dados do pagador — exigidos pela AbacatePay em produção (objeto `customer` na cobrança). */
  const [payerName, setPayerName] = useState("");
  const [payerTaxId, setPayerTaxId] = useState("");
  const [payerCellphone, setPayerCellphone] = useState("");

  const abacatePayerValid = useMemo(() => {
    if (paymentProvider !== "abacatepay") return true;
    return isValidAbacatePayer(payerName, payerTaxId, payerCellphone);
  }, [paymentProvider, payerName, payerTaxId, payerCellphone]);

  useEffect(() => {
    if (paymentProvider !== "abacatepay" || !user) return;
    setPayerName((prev) => {
      if (prev.trim()) return prev;
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const fn = meta?.full_name ?? meta?.name ?? meta?.display_name;
      if (typeof fn === "string" && fn.trim()) return fn.trim();
      return prev;
    });
  }, [paymentProvider, user]);

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

      let provider: "stripe" | "abacatepay" =
        defaultPaymentProvider === "abacatepay" ||
        defaultPaymentProvider === "stripe"
          ? defaultPaymentProvider
          : "stripe";

      if (
        defaultPaymentProvider !== "abacatepay" &&
        defaultPaymentProvider !== "stripe"
      ) {
        try {
          const pr = await fetch("/api/app/payment-provider", {
            cache: "no-store",
          });
          if (pr.ok) {
            const pj = (await pr.json()) as { provider?: string };
            if (pj.provider === "abacatepay") provider = "abacatepay";
            else provider = "stripe";
          }
        } catch {
          /* mantém stripe */
        }
      }
      setPaymentProvider(provider);

      const statusUrl =
        provider === "abacatepay" ? "/api/abacatepay/status" : "/api/stripe/status";
      try {
        const data = await postJson<StripeStatusResponse>(statusUrl, {
          email: user.email,
        }, session?.access_token);
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
  }, [user?.email, session?.access_token, defaultPaymentProvider]);

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
      // Verifica o billing pelo ID armazenado antes do redirect
      const pendingBillingId = localStorage.getItem("abacatepay_pending_billing_id");
      if (pendingBillingId && session?.access_token && paymentProvider === "abacatepay") {
        localStorage.removeItem("abacatepay_pending_billing_id");
        postJson("/api/abacatepay/verify-payment", { billingId: pendingBillingId }, session.access_token)
          .catch(() => null)
          .finally(() => {
            const now = Date.now();
            if (now - lastBumpAfterStripeMs > 800) {
              lastBumpAfterStripeMs = now;
              bumpAccessCheck();
            }
          });
      } else {
        const now = Date.now();
        if (now - lastBumpAfterStripeMs > 800) {
          lastBumpAfterStripeMs = now;
          bumpAccessCheck();
        }
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
    async (nextPlan: "pro" | "business") => {
      if (!user) {
        router.push("/login");
        return;
      }

      setError(null);
      if (paymentProvider === "abacatepay" && !isValidAbacatePayer(payerName, payerTaxId, payerCellphone)) {
        setError(
          "Preencha nome completo, CPF ou CNPJ válido e celular com DDD para pagar com AbacatePay.",
        );
        return;
      }
      setLoadingAction(true);
      try {
        const checkoutPath =
          paymentProvider === "abacatepay"
            ? "/api/abacatepay/billing"
            : "/api/stripe/checkout";
        const payload: Record<string, unknown> = {
          plan: nextPlan,
          email: user.email,
        };
        if (paymentProvider === "abacatepay") {
          payload.name = payerName.trim();
          payload.taxId = payerTaxId.trim();
          payload.cellphone = payerCellphone.trim();
        }
        const data = await postJson<{ url?: string; id?: string; error?: string }>(
          checkoutPath,
          payload,
          session?.access_token,
        );
        if (!data.url)
          throw new Error(data.error ?? "URL do checkout não encontrada.");
        if (data.id) localStorage.setItem("abacatepay_pending_billing_id", data.id);
        window.location.href = data.url;
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : "Erro ao iniciar checkout.";
        setError(msg);
      } finally {
        setLoadingAction(false);
      }
    },
    [router, user, paymentProvider, payerName, payerTaxId, payerCellphone],
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
        session?.access_token,
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
    return (
      <div className="flex min-h-[12rem] items-center justify-center">
        <p className="text-sm text-slate-400">Carregando planos…</p>
      </div>
    );
  }

  const paidActive =
    accessChecked && accessPaid && plan !== "free";

  const planCtaDisabledPro =
    loadingAction || (plan === "pro" && !isOnTrial) || (paymentProvider === "abacatepay" && !abacatePayerValid);
  const planCtaDisabledAnnual =
    loadingAction ||
    (plan === "business" && !isOnTrial) ||
    (paymentProvider === "abacatepay" && !abacatePayerValid);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Modal de boas-vindas pós-pagamento */}
      {checkoutSuccess && paidActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl border border-emerald-500/40 bg-slate-900 p-8 shadow-2xl text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
              <PartyPopper className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="mb-2 text-2xl font-bold text-slate-50">Bem-vindo ao Pro!</h2>
            <p className="mb-1 text-sm text-slate-300">
              Seu pagamento foi confirmado e o plano já está ativo.
            </p>
            <p className="mb-6 text-xs text-slate-400">
              Agora você tem acesso completo à precificação 3D, produção, estoque e relatórios.
            </p>
            <Link
              href="/dashboard"
              className="block w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400"
              onClick={clearCheckoutQuery}
            >
              Ir para o Dashboard
            </Link>
            <button
              type="button"
              onClick={clearCheckoutQuery}
              className="mt-3 text-xs text-slate-500 hover:text-slate-400"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {checkoutSuccess && !paidActive ? (
        <div
          className="flex flex-col gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20">
              <PartyPopper className="h-5 w-5 text-cyan-300" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-slate-50">Pagamento recebido</p>
              <p className="text-xs leading-relaxed text-slate-300">
                Obrigado! Confirmando seu pagamento — o plano deve ativar em instantes.
                Se continuar como Free, <strong className="text-slate-200">atualize a página (F5)</strong>.
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

      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-12 lg:items-start lg:gap-10">
        <div className="order-1 space-y-8 lg:order-2 lg:col-span-8">
          <header className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-400/90">
              {paymentProvider === "abacatepay"
                ? "Checkout seguro · AbacatePay"
                : "Assinatura · Stripe"}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-50 sm:text-3xl">
              Desbloqueie o app completo
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-slate-400">
              Pro e anual têm{" "}
              <span className="text-slate-300">as mesmas funções</span>. Quem usa o MAPH PRO 3D
              toda semana costuma preferir o anual: menos por mês e um único pagamento.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/90 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                <Shield className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                Pagamento criptografado
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/90 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                <CreditCard className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                PIX e cartão
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/90 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-300">
                <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-400/90" />
                Acesso imediato após confirmação
              </span>
            </div>
          </header>

          {error ? (
            <p
              className="rounded-2xl border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          {paymentProvider === "abacatepay" ? (
            <section
              aria-labelledby="payer-step-title"
              className="rounded-2xl border border-cyan-500/25 bg-gradient-to-b from-slate-900/90 via-slate-950/80 to-slate-950/90 p-5 shadow-[0_20px_50px_-24px_rgba(34,211,238,0.35)] sm:p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-sm font-bold text-cyan-200"
                    aria-hidden
                  >
                    1
                  </span>
                  <div>
                    <h2 id="payer-step-title" className="text-base font-semibold text-slate-50">
                      Titular do pagamento
                    </h2>
                    <p className="mt-1 max-w-lg text-xs leading-relaxed text-slate-400">
                      Leva menos de um minuto. O gateway exige{" "}
                      <strong className="font-medium text-slate-300">dados reais</strong> do PIX ou
                      cartão. Usamos o e-mail da sua conta; no modo AbacatePay nada vai para o Stripe.
                    </p>
                    {user?.email ? (
                      <p className="mt-2 text-[11px] text-slate-500">
                        E-mail na cobrança:{" "}
                        <span className="text-slate-400">{user.email}</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-xs font-medium text-slate-400">Nome completo</span>
                  <input
                    type="text"
                    autoComplete="name"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-600/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/55 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                    placeholder="Igual ao documento"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-400">CPF ou CNPJ</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={payerTaxId}
                    onChange={(e) => setPayerTaxId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-600/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/55 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                    placeholder="11 ou 14 dígitos"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-400">Celular com DDD</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={payerCellphone}
                    onChange={(e) => setPayerCellphone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-600/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/55 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                    placeholder="Ex. 11999998888"
                  />
                </label>
              </div>
              {!abacatePayerValid ? (
                <p className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/95">
                  <span className="font-medium">Próximo passo:</span> complete os três campos para
                  ativar os botões de pagamento abaixo.
                </p>
              ) : (
                <p className="mt-4 text-xs font-medium text-emerald-400/90">
                  Dados ok — escolha seu plano e continue.
                </p>
              )}
            </section>
          ) : null}

          <section aria-labelledby="plans-step-title" className="space-y-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-slate-200"
                aria-hidden
              >
                {paymentProvider === "abacatepay" ? "2" : "1"}
              </span>
              <div>
                <h2 id="plans-step-title" className="text-base font-semibold text-slate-100">
                  Escolha como pagar
                </h2>
                <p className="text-xs text-slate-500">
                  {paymentProvider === "abacatepay"
                    ? "Toque no plano desejado — você será redirecionado para finalizar na AbacatePay."
                    : "Assinatura recorrente processada pelo Stripe."}
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-emerald-500/45 bg-slate-950/50 p-5 shadow-[0_0_48px_-18px_rgba(52,211,153,0.45)] sm:p-6">
                <span className="absolute right-3 top-3 rounded-full bg-emerald-500/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-200">
                  Melhor custo / mês
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400/90">
                  Plano anual
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-50">
                  {pricing.business.label}
                  <span className="text-base font-semibold text-slate-500">{pricing.business.period}</span>
                </p>
                <p className="mt-1 text-sm text-emerald-400/90">
                  Equivale a{" "}
                  <strong className="font-semibold">
                    R$ {pricing.business.monthlyEquivalentBrl.toFixed(2).replace(".", ",")}/mês
                  </strong>{" "}
                  · economia de{" "}
                  <strong className="font-semibold">~{pricing.business.savingsVsMonthlyPct}%</strong> vs. mensal
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Todo o app: precificação, estoque, vendas e relatórios
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    Um pagamento por ano — menos burocracia
                  </li>
                </ul>
                <button
                  type="button"
                  disabled={planCtaDisabledAnnual}
                  title={
                    paymentProvider === "abacatepay" && !abacatePayerValid
                      ? "Preencha nome, CPF/CNPJ e celular acima"
                      : undefined
                  }
                  onClick={() => void handleCheckout("business")}
                  className="mt-auto w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {plan === "business" && !isOnTrial
                    ? "Plano anual ativo"
                    : paymentProvider === "abacatepay"
                      ? "Quero o plano anual"
                      : "Assinar plano anual (Stripe)"}
                </button>
              </div>

              <div className="flex flex-col rounded-2xl border border-slate-700/80 bg-slate-950/35 p-5 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Flexível
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/80">
                  Plano mensal
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-slate-50">
                  {pricing.pro.label}
                  <span className="text-base font-semibold text-slate-500">{pricing.pro.period}</span>
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Ideal para testar com compromisso curto.
                </p>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    Mesmas funções do plano anual
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    {paymentProvider === "abacatepay"
                      ? "PIX ou cartão, renovação mensal"
                      : "Cobrança mensal no cartão"}
                  </li>
                </ul>
                <button
                  type="button"
                  disabled={planCtaDisabledPro}
                  title={
                    paymentProvider === "abacatepay" && !abacatePayerValid
                      ? "Preencha nome, CPF/CNPJ e celular acima"
                      : undefined
                  }
                  onClick={() => void handleCheckout("pro")}
                  className="mt-auto w-full rounded-xl border-2 border-cyan-500/40 bg-cyan-500/10 py-3.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-400/60 hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {plan === "pro" && !isOnTrial
                    ? "Plano mensal ativo"
                    : paymentProvider === "abacatepay"
                      ? "Prefiro mensal"
                      : "Assinar mensal (Stripe)"}
                </button>
              </div>
            </div>
          </section>
        </div>

        <aside className="order-2 lg:order-1 lg:col-span-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[0_0_0_1px_rgba(6,182,212,0.08)] lg:sticky lg:top-24">
            <div className="mb-4 space-y-1">
              <h2 className="text-lg font-semibold text-slate-50">Sua assinatura</h2>
              <p className="text-xs text-slate-500">Resumo rápido do acesso.</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-800/90 bg-slate-900/35 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950/50">
                  {plan === "pro" ? proIcon : plan === "business" ? businessIcon : freeIcon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-50">
                    {plan === "pro" ? "Pro" : plan === "business" ? "Business / anual" : "Free"}
                  </p>
                  {plan === "free" ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Modo com trial do app.</p>
                      {accessChecked &&
                      !accessPaid &&
                      accessDaysRemaining != null &&
                      accessDaysRemaining > 0 &&
                      accessTrialEndsAt ? (
                        <p className="text-xs text-cyan-400">
                          Trial: <strong>{accessDaysRemaining}</strong> dia(s) · até{" "}
                          {new Date(accessTrialEndsAt).toLocaleDateString("pt-BR")}
                        </p>
                      ) : null}
                    </div>
                  ) : isOnTrial ? (
                    <p className="text-xs text-slate-500">
                      Trial gateway {trialEnd ? `até ${trialEnd}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Plano pago
                      {paymentProvider === "abacatepay" ? " · AbacatePay" : " · Stripe"}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/90 bg-slate-900/35 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Incluso no Pro / anual
                </p>
                <ul className="mt-2 space-y-1.5 text-[11px] leading-snug text-slate-300">
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Precificação 3D e marketplaces
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Produção, estoque e insumos
                  </li>
                  <li className="flex gap-2">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    Vendas e relatórios
                  </li>
                </ul>
              </div>

              <p className="text-[11px] leading-relaxed text-slate-500">
                Pro mensal e anual são o mesmo produto em termos de recurso; só muda a forma de
                cobrança.
              </p>

              <div className="flex flex-wrap gap-2">
                {plan !== "free" && paymentProvider === "stripe" ? (
                  <button
                    type="button"
                    disabled={loadingAction}
                    onClick={() => void handlePortal()}
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/60 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
                  >
                    Gerenciar no Stripe
                  </button>
                ) : null}
                {plan !== "free" && paymentProvider === "abacatepay" ? (
                  <p className="text-[11px] text-slate-600">
                    Cobranças e reembolsos: painel AbacatePay.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
