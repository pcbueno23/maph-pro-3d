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
        {/* Título */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100 md:text-3xl">
            Calculadora de Markup para Impressão 3D
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Calcule o custo real, preço sugerido e lucro por venda para Shopee, Mercado Livre e venda direta — sem precisar criar conta.
          </p>
        </div>

        {/* Calculadora */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <PublicInputPanel form={form} />
          <ResultsPanel results={results} isDirty={isDirty} />
        </div>

        {/* CTA — recursos exclusivos */}
        <div className="mt-10 rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5 p-6 md:p-8">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Versão completa
              </p>
              <h2 className="mt-2 text-xl font-bold text-slate-100 md:text-2xl">
                Leve seu negócio de impressão 3D a outro nível
              </h2>
              <p className="mt-3 text-sm text-slate-400">
                Crie sua conta gratuitamente e desbloqueie tudo que você precisa para precificar, gerir e escalar suas vendas.
              </p>

              <ul className="mt-4 space-y-2">
                {[
                  "Salve e organize todos os seus produtos com preços",
                  "Cadastre impressoras e filamentos com seus custos reais",
                  "Histórico completo de simulações e decisões de preço",
                  "Análise de margem de contribuição por canal",
                  "Orçamentos e ordens de produção integrados",
                  "Alertas de insumos em estoque baixo",
                  "Relatórios de vendas e performance por marketplace",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="mt-0.5 shrink-0 text-emerald-400">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/login?tab=signup"
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:from-cyan-400 hover:to-emerald-400"
                >
                  Criar conta grátis — 7 dias sem cartão
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-slate-700 bg-slate-800/60 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  Ver planos
                </Link>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="space-y-3">
                {[
                  { label: "Produtos cadastrados", value: "ilimitado", color: "cyan" },
                  { label: "Presets de impressora", value: "seus equipamentos reais", color: "emerald" },
                  { label: "Insumos cadastrados", value: "com custo atualizado", color: "purple" },
                  { label: "Orçamentos e ordens", value: "controle de produção", color: "amber" },
                ].map((feat) => (
                  <div
                    key={feat.label}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
                  >
                    <span className="text-sm text-slate-300">{feat.label}</span>
                    <span className={`text-xs font-semibold text-${feat.color}-400`}>
                      {feat.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
