"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { X, CheckCircle2, Circle } from "lucide-react";
import { useOnboarding, ONBOARDING_STEPS } from "@/hooks/useOnboarding";

/** Mapeia href de rota para o id do step — marca automaticamente ao navegar. */
const ROUTE_TO_STEP: Record<string, string> = {
  "/impressoras": "impressora",
  "/insumos": "insumo",
  "/precificacao-marketplaces": "calculo",
  "/calculator": "calculo",
  "/margem-certa": "calculo",
};

export function OnboardingChecklist() {
  const pathname = usePathname();
  const { steps, completed, markStep, dismiss, visible } = useOnboarding();

  // Auto-marca o step quando o usuário visita a rota correspondente
  useEffect(() => {
    const stepId = ROUTE_TO_STEP[pathname ?? ""];
    if (stepId && !completed[stepId]) {
      markStep(stepId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!visible) return null;

  const doneCount = ONBOARDING_STEPS.filter((s) => completed[s.id]).length;
  const total = ONBOARDING_STEPS.length;

  return (
    <div className="fixed bottom-20 right-4 z-50 w-72 rounded-2xl border border-slate-700 bg-slate-900 shadow-[0_8px_32px_rgba(0,0,0,0.5)] md:bottom-6">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-800 px-4 py-3">
        <div>
          <p className="text-xs font-semibold text-slate-50">
            Primeiros passos
          </p>
          <p className="text-[11px] text-slate-400">
            {doneCount}/{total} concluídos
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fechar checklist"
          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden bg-slate-800">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="space-y-px p-2">
        {steps.map((step) => {
          const done = !!completed[step.id];
          return (
            <li key={step.id}>
              <Link
                href={step.href as Parameters<typeof Link>[0]["href"]}
                className={`flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                  done
                    ? "opacity-50"
                    : "hover:bg-slate-800/70"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
                )}
                <div>
                  <p className={`text-xs font-medium ${done ? "text-slate-500 line-through" : "text-slate-100"}`}>
                    {step.label}
                  </p>
                  {!done && (
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {step.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
