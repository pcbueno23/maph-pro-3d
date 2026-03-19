"use client";

import { InputPanel } from "@/components/calculator/InputPanel";
import { ResultsPanel } from "@/components/calculator/ResultsPanel";
import { useCalculator } from "@/hooks/useCalculator";
import { useCalculatorStore } from "@/store/calculatorStore";

export default function CalculatorPage() {
  const { form, results, isDirty } = useCalculator();
  const requestSave = useCalculatorStore((s) => s.requestSave);
  const requestNewSimulation = useCalculatorStore((s) => s.requestNewSimulation);

  return (
    <div className="space-y-4">
      <div className="flex justify-end md:hidden">
        <button
          type="button"
          onClick={() => requestNewSimulation()}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2.5 text-sm font-medium text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Nova simulação
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InputPanel form={form} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => requestSave()}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Salvar produto
            </button>
          </div>
        </div>
        <ResultsPanel results={results} isDirty={isDirty} />
      </div>
    </div>
  );
}

