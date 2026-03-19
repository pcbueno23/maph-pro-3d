"use client";

import { useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

type TutorialStep = {
  title: string;
  description: string;
  items: string[];
};

const STEPS: TutorialStep[] = [
  {
    title: "1) Configuração Inicial (base do cálculo)",
    description: "Prepare os padrões para precificar com consistência.",
    items: [
      "Vá em Configurações e ajuste embalagem, frete estimado, taxa cartão e margem desejada.",
      "Em Impressoras, cadastre potência, custo e vida útil.",
      "Em Insumos, cadastre filamentos e materiais com preço real.",
      "Resultado: a calculadora abre com valores mais próximos da sua operação.",
    ],
  },
  {
    title: "2) Precificação na Calculadora",
    description: "Calcule o preço certo com margem real.",
    items: [
      "Preencha peso, tempo de impressão, canal e custos da peça.",
      "Use Ajustes Avançados quando necessário (falha, mão de obra, desconto).",
      "Confira os blocos principais: preço por canal, lucro líquido real e margem.",
      "Salve o produto quando os números estiverem saudáveis.",
    ],
  },
  {
    title: "3) Transformar preço em operação",
    description: "Leve a precificação para o fluxo de produção.",
    items: [
      "Revise ficha técnica e imagem em Produtos.",
      "Crie Ordens de produção com quantidade, prazo e impressora.",
      "Acompanhe os status (novo, em produção, concluído).",
      "Use Peças produzidas para visualizar o que já foi finalizado.",
    ],
  },
  {
    title: "4) Controle de estoque e vendas",
    description: "Monitore o que entra, sai e quanto realmente sobra.",
    items: [
      "Em Insumos, registre entradas e saídas para acompanhar consumo real.",
      "Em Vendas, lance vendas por canal (Shopee, ML e Direto).",
      "Use Alertas para monitorar margem baixa e riscos de prejuízo.",
      "Mantenha o histórico atualizado para decisões melhores de compra e preço.",
    ],
  },
  {
    title: "5) Gestão e escala",
    description: "Use os dados para crescer com controle.",
    items: [
      "No Dashboard, acompanhe KPI de ordens, produção e vendas.",
      "Em Relatórios, veja desempenho financeiro e visão consolidada.",
      "Em Planos, gerencie sua assinatura quando necessário.",
      "Em Conta, mantenha dados pessoais, empresa e segurança atualizados.",
    ],
  },
];

export default function TutorialPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  const progressText = useMemo(
    () => `Passo ${stepIndex + 1} de ${STEPS.length}`,
    [stepIndex],
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Tutorial
      </h1>

      <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
            {progressText}
          </span>
          <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all"
              style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-50 md:text-xl">
          {currentStep.title}
        </h2>
        <p className="mt-1 text-sm text-slate-400">{currentStep.description}</p>

        <ul className="mt-4 space-y-2">
          {currentStep.items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-slate-200"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-2">
          {!isLast ? (
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1))}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Próximo
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex(0)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              Reiniciar tutorial
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

