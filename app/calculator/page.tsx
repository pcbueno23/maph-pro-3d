"use client";

import { InputPanel } from "@/components/calculator/InputPanel";
import { ResultsPanel } from "@/components/calculator/ResultsPanel";
import { useCalculator } from "@/hooks/useCalculator";
import { useCalculatorStore } from "@/store/calculatorStore";

export default function CalculatorPage() {
  const { form, results, isDirty } = useCalculator();
  const requestSave = useCalculatorStore((s) => s.requestSave);

  return (
    <div className="space-y-4">
      <div className="flex justify-end md:hidden">
        <button
          type="button"
          onClick={() => requestSave()}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Salvar e nova simulação
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <InputPanel form={form} />
        <ResultsPanel results={results} isDirty={isDirty} />
      </div>
    </div>
  );
}

