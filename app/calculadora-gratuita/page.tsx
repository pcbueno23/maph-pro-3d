"use client";

import Link from "next/link";
import { usePublicCalculator } from "@/hooks/usePublicCalculator";
import { PublicInputPanel } from "@/components/calculator/PublicInputPanel";
import { ResultsPanel } from "@/components/calculator/ResultsPanel";

export default function CalculadoraGratuitaPage() {
  const { form, results, isDirty } = usePublicCalculator();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar pública */}
      <header className="border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-cyan-400">Maph Pro 3D</span>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300">
              Grátis
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-slate-300 transition hover:text-slate-100"
            >
              Entrar
            </Link>
            <Link
              href="/login?tab=signup"
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Criar conta grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8">
        {/* Título + CTA compacto lado a lado */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">
              Calculadora de Markup para Impressão 3D
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Custo real, preço sugerido e lucro por venda — Shopee, Mercado Livre e venda direta.
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 p-4 md:max-w-xs">
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">Versão completa</p>
            <p className="mt-1 text-sm font-medium text-slate-100">
              Salve produtos, cadastre impressoras e filamentos, gere orçamentos e muito mais.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/login?tab=signup"
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Criar conta grátis
              </Link>
              <Link
                href="/pricing"
                className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Ver planos
              </Link>
            </div>
          </div>
        </div>

        {/* Calculadora */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <PublicInputPanel form={form} />
          <ResultsPanel results={results} isDirty={isDirty} />
        </div>

        {/* Rodapé mínimo */}
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-slate-500">
          <Link href="/termos" className="transition hover:text-slate-300">Termos de uso</Link>
          <Link href="/privacidade" className="transition hover:text-slate-300">Privacidade</Link>
          <Link href="/pricing" className="transition hover:text-slate-300">Planos</Link>
        </div>
      </main>
    </div>
  );
}
