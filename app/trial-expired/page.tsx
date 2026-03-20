"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, CreditCard } from "lucide-react";
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
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/10">
        <Clock className="h-7 w-7 text-amber-300" />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-50">
          Período de teste encerrado
        </h1>
        <p className="text-sm text-slate-400">
          Seu período de acesso gratuito ao MAPH PRO 3D{" "}
          {endLabel ? `(até ${endLabel}) ` : ""}
          terminou. Para continuar usando calculadora, produtos, estoque e
          demais funções, assine um plano.
        </p>
        {accessError ? (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
            {accessError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400"
        >
          <CreditCard className="h-4 w-4" />
          Ver planos e assinar
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="rounded-xl border border-slate-700 bg-slate-900/60 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-900"
        >
          Sair da conta
        </button>
      </div>

      <p className="text-[11px] text-slate-500">
        O trial é calculado pela data de criação da conta (sem cartão). Quem
        assina pelo Stripe mantém acesso conforme o plano.
      </p>
    </div>
  );
}
