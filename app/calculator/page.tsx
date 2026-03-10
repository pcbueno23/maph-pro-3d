"use client";

import { InputPanel } from "@/components/calculator/InputPanel";
import { ResultsPanel } from "@/components/calculator/ResultsPanel";
import { useCalculator } from "@/hooks/useCalculator";

export default function CalculatorPage() {
  const { form, results, isDirty } = useCalculator();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <InputPanel form={form} />
      <ResultsPanel results={results} isDirty={isDirty} />
    </div>
  );
}

