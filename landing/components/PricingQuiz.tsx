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

  const [stepIdx, setStepIdx] = useState(0);
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

  const activeSection = sections[stepIdx] ?? sections[0];
  const activeQuestions = activeSection?.questions ?? [];
  const activeAnswered = useMemo(
    () => activeQuestions.filter((q) => answers[q.id] != null).length,
    [activeQuestions, answers],
  );
  const activeDone = activeQuestions.length > 0 && activeAnswered === activeQuestions.length;

  function setAnswer(qid: string, a: Exclude<Answer, null>) {
    setAnswers((prev) => ({ ...prev, [qid]: a }));
  }

  function reset() {
    setAnswers(() => {
      const init: Record<string, Answer> = {};
      for (const q of questionsFlat) init[q.id] = null;
      return init;
    });
    setStepIdx(0);
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-slate-950/60 p-6 backdrop-blur-md sm:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 15%, rgba(34,211,238,.45), transparent 45%), radial-gradient(circle at 85% 25%, rgba(16,185,129,.30), transparent 40%), radial-gradient(circle at 40% 85%, rgba(59,130,246,.22), transparent 45%)",
        }}
      />

      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="inline-flex items-center rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
            Quiz interativo (2 minutos)
          </p>
          <h3 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-50 sm:text-4xl">
            Você está precificando no achismo?
          </h3>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
            Marque <span className="font-semibold text-slate-50">Sim</span>,{" "}
            <span className="font-semibold text-amber-200">Não sei</span> ou{" "}
            <span className="font-semibold text-amber-200">Nunca calculei</span>.
            Quanto mais respostas incertas, maior o risco de prejuízo invisível.
          </p>
        </div>

        <div className="w-full max-w-md">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>
              Progresso geral: <span className="text-slate-50">{progress}%</span>
            </span>
            <span className="text-slate-400">
              {answeredCount}/{questionsFlat.length}
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-900/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-[width] duration-300"
              style={{ width: `${progress}%` }}
              aria-hidden
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Etapa: <span className="text-slate-200">{stepIdx + 1}</span>/{sections.length}
            </span>
            <span>
              Respondidas na etapa:{" "}
              <span className="text-slate-200">{activeAnswered}</span>/{activeQuestions.length}
            </span>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="relative z-10 mt-6 grid gap-2 sm:grid-cols-3">
        {sections.map((s, idx) => {
          const isActive = idx === stepIdx;
          const sectionAnswered = s.questions.filter((q) => answers[q.id] != null).length;
          const sectionDone = s.questions.length > 0 && sectionAnswered === s.questions.length;
          return (
            <button
              key={s.title}
              type="button"
              onClick={() => setStepIdx(idx)}
              className={[
                "rounded-2xl border px-4 py-3 text-left transition",
                isActive
                  ? "border-cyan-500/35 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-950/40 hover:bg-slate-950/60",
              ].join(" ")}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Etapa {idx + 1}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-100">
                {s.title.replace(/^Sessão:\s*/i, "")}
              </p>
              <p className="mt-2 text-[11px] text-slate-400">
                {sectionDone ? (
                  <span className="text-emerald-200">Concluída</span>
                ) : (
                  <>
                    {sectionAnswered}/{s.questions.length} respondidas
                  </>
                )}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active section */}
      <div className="relative z-10 mt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {activeSection?.title ?? "Sessão"}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              Dica: se marcar “Não sei” ou “Nunca calculei”, isso entra no seu nível de risco.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.max(0, i - 1))}
              disabled={stepIdx === 0}
              className="rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => setStepIdx((i) => Math.min(sections.length - 1, i + 1))}
              disabled={stepIdx >= sections.length - 1 || !activeDone}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
              title={
                !activeDone
                  ? "Responda todas as perguntas desta etapa para avançar"
                  : undefined
              }
            >
              Próxima etapa →
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {activeQuestions.map((q) => {
            const a = answers[q.id] ?? null;
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5"
              >
                <p className="text-base leading-relaxed text-slate-100">{q.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ANSWER_OPTIONS.map((opt) => {
                    const active = a === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAnswer(q.id, opt.id)}
                        className={[
                          "rounded-full px-4 py-2 text-xs font-semibold transition",
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

      <div className="relative z-10 mt-10 rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/10 to-slate-950/30 p-6 sm:p-8">
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

