"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, CreditCard, LifeBuoy, ShieldCheck, Zap } from "lucide-react";
import { useAccessStore } from "@/store/accessStore";
import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/store/authStore";
import { clearUserData } from "@/lib/clearUserData";

export default function TrialExpiredPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const trialEndsAt = useAccessStore((s) => s.trialEndsAt);
  const accessError = useAccessStore((s) => s.error);

  const endLabel =
    trialEndsAt != null
      ? (() => {
          try {
            return new Date(trialEndsAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            });
          } catch {
            return null;
          }
        })()
      : null;

  async function handleLogout() {
    clearUserData();
    if (supabase) await supabase.auth.signOut();
    clearAuth();
    router.replace("/login");
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/60 p-6 backdrop-blur-md sm:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, rgba(34,211,238,.35), transparent 45%), radial-gradient(circle at 70% 20%, rgba(16,185,129,.25), transparent 40%), radial-gradient(circle at 50% 70%, rgba(59,130,246,.18), transparent 45%)",
          }}
        />

        <header className="relative z-10 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70">
              <Image
                src="/logo-maph-pro-3d.png"
                alt="MAPH PRO 3D"
                width={44}
                height={44}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-50">MAPH PRO 3D</p>
              <p className="text-xs text-slate-400">Precificação e gestão para impressão 3D</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/suporte"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
            >
              <LifeBuoy className="h-4 w-4" />
              Falar com suporte
            </Link>
            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="relative z-10 mt-10 grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="text-center lg:text-left">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 lg:mx-0">
              <Clock className="h-4 w-4" />
              Acesso temporariamente pausado
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
              Seu período de teste encerrou{endLabel ? ` (até ${endLabel})` : ""}.
            </h1>
            <p className="mt-3 text-base text-slate-300">
              Para continuar usando calculadora, produtos, estoque e relatórios, escolha um plano.
              Em poucos cliques você volta a precificar com margem e previsibilidade.
            </p>

            {accessError ? (
              <div className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-left text-xs text-rose-100">
                {accessError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
              >
                <CreditCard className="h-4 w-4" />
                Ver planos e reativar
              </Link>
              <Link
                href="/suporte"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-6 py-3 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
              >
                <ShieldCheck className="h-4 w-4" />
                Tirar dúvidas antes de assinar
              </Link>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              O trial é calculado pela data de criação da conta (sem cartão). Assinando pelo Stripe,
              o acesso é mantido conforme o plano.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "24/7", value: "Acesso total", icon: Zap },
              { label: "100%", value: "Online (PWA)", icon: CheckCircle2 },
              { label: "4+", value: "Áreas do app", icon: ShieldCheck },
              { label: "Em minutos", value: "Preço com margem", icon: Clock },
            ].map((s) => (
              <div
                key={s.label + s.value}
                className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-2xl font-extrabold tracking-tight text-slate-50">
                    {s.label}
                  </p>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60">
                    <s.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-400">{s.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            title: "Precificação",
            desc: "Custo real, taxas por canal e margem líquida antes de anunciar.",
          },
          {
            title: "Produção e estoque",
            desc: "Produtos, insumos, impressoras e ordens conectados ao custo.",
          },
          {
            title: "Vendas e PDFs",
            desc: "Orçamentos com sua marca e registro de vendas por canal.",
          },
          {
            title: "Relatórios",
            desc: "Indicadores para decidir preço, volume e mix com clareza.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
          >
            <p className="text-sm font-semibold text-slate-50">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.desc}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/10 to-slate-950/60 p-6 text-center sm:p-10">
        <h2 className="text-2xl font-bold text-slate-50 sm:text-3xl">
          Pronto para voltar a precificar com método?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-300">
          Reative o acesso e continue de onde parou — sem perder suas configurações e produtos salvos.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-7 py-3.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
          >
            <CreditCard className="h-4 w-4" />
            Ver planos
          </Link>
          <Link
            href="/suporte"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/60 px-7 py-3.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-900"
          >
            <LifeBuoy className="h-4 w-4" />
            Preciso de ajuda
          </Link>
        </div>
      </section>
    </div>
  );
}
