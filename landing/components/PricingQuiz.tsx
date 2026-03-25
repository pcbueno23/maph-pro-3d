"use client";

import { useMemo, useState } from "react";

type Answer = "sim" | "nao_sei" | "nunca_calculei" | null;

type Question = {
  id: string;
  text: string;
};

type Section = {
  title: string;
  questions: Question[];
};

const ANSWER_OPTIONS: Array<{ id: Exclude<Answer, null>; label: string }> = [
  { id: "sim", label: "Sim" },
  { id: "nao_sei", label: "Não sei" },
  { id: "nunca_calculei", label: "Nunca calculei" },
];

function urgencyLabel(n: number) {
  if (n === 0) return "Boa. Você parece ter controle — agora é hora de padronizar e ganhar velocidade.";
  if (n <= 2) return "Atenção: tem pontos cegos que podem estar comendo sua margem.";
  if (n <= 5) return "Alerta: você provavelmente está deixando dinheiro na mesa em várias vendas.";
  return "Crítico: cada venda pode estar te deixando mais pobre sem você perceber.";
}

export function PricingQuiz({
  sections,
  ctaHref,
}: {
  sections: Section[];
  ctaHref: string;
}) {
  const questionsFlat = useMemo(
    () => sections.flatMap((s) => s.questions),
    [sections],
  );

  const [answers, setAnswers] = useState<Record<string, Answer>>(() => {
    const init: Record<string, Answer> = {};
    for (const q of questionsFlat) init[q.id] = null;
    return init;
  });

  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a != null).length,
    [answers],
  );
  const total = questionsFlat.length || 1;
  const progress = Math.round((answeredCount / total) * 100);

  const unsureCount = useMemo(() => {
    return Object.values(answers).filter(
      (a) => a === "nao_sei" || a === "nunca_calculei",
    ).length;
  }, [answers]);

  const showResult = answeredCount === questionsFlat.length;

  function setAnswer(qid: string, a: Exclude<Answer, null>) {
    setAnswers((prev) => ({ ...prev, [qid]: a }));
  }

  function reset() {
    setAnswers(() => {
      const init: Record<string, Answer> = {};
      for (const q of questionsFlat) init[q.id] = null;
      return init;
    });
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6 backdrop-blur-md sm:p-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            Quiz rápido (2 minutos)
          </p>
          <h3 className="mt-2 text-2xl font-bold text-slate-50 sm:text-3xl">
            Você está precificando no achismo?
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
            Responda com sinceridade. Quanto mais “não sei”/“nunca calculei”, maior
            a chance de você estar vendendo com prejuízo sem perceber.
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              Progresso: <span className="text-slate-200">{progress}%</span>
            </span>
            <span>
              {answeredCount}/{questionsFlat.length}
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-900">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {sections.map((section) => (
          <div key={section.title} className="space-y-4">
            <p className="text-sm font-semibold text-slate-100">{section.title}</p>
            <div className="space-y-3">
              {section.questions.map((q) => {
                const a = answers[q.id] ?? null;
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <p className="text-sm leading-relaxed text-slate-200">
                      {q.text}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ANSWER_OPTIONS.map((opt) => {
                        const active = a === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setAnswer(q.id, opt.id)}
                            className={[
                              "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                              active
                                ? opt.id === "sim"
                                  ? "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/35"
                                  : "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/35"
                                : "border border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600 hover:bg-slate-900",
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-slate-950/30 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
              Resultado
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Respostas “não sei”/“nunca calculei”:{" "}
              <span className="font-semibold text-slate-50">{unsureCount}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              {showResult ? (
                <span className="font-medium text-slate-50">
                  {urgencyLabel(unsureCount)}
                </span>
              ) : (
                <span className="text-slate-400">
                  Responda todas as perguntas para ver a análise final.
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:items-end">
            <a
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Crie sua conta grátis → Calcule corretamente em 5 minutos
            </a>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Recomeçar quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

