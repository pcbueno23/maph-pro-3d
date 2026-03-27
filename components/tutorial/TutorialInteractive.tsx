"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Dices,
  ExternalLink,
  RotateCcw,
  Sparkles,
} from "lucide-react";

type Phase = {
  id: string;
  tag: string;
  emoji: string;
  title: string;
  hook: string;
  accent: string;
  ringClass: string;
  tasks: { id: string; text: string }[];
  shortcuts: { href: string; label: string }[];
  randomTips: string[];
};

const PHASES: Phase[] = [
  {
    id: "base",
    tag: "Começo forte",
    emoji: "🧰",
    title: "Arruma o terreno antes de precificar",
    hook:
      "Sem drama: se você cadastra impressora, insumo e uns padrões em Configurações, a calculadora para de chutar número e começa a falar a língua do seu negócio.",
    accent: "from-cyan-500/25 via-slate-900/40 to-emerald-500/20",
    ringClass: "neon-ring-cyan",
    tasks: [
      { id: "t1", text: "Dar uma passada em Configurações (margem, frete, taxas — aquelas coisas chatas mas necessárias)" },
      { id: "t2", text: "Registrar suas impressoras em Impressoras (sim, todas que você usa de verdade)" },
      { id: "t3", text: "Cadastrar filamentos/resinas em Insumos com preço real — futuro você agradece" },
    ],
    shortcuts: [
      { href: "/settings", label: "Configurações" },
      { href: "/impressoras", label: "Impressoras" },
      { href: "/insumos", label: "Insumos" },
    ],
    randomTips: [
      "Dica: começa com 1 impressora e 3 insumos. Depois você vai refinando — não precisa virar planilha no dia 1.",
      "Se a margem padrão estiver errada, tudo que vier depois vira 'quase certo'. Ajusta com calma.",
      "Custo de energia elétrica esquecido é prejuízo silencioso. Vale cadastrar hora-máquina logo de cara.",
    ],
  },
  {
    id: "calc",
    tag: "Modo calculadora",
    emoji: "🧮",
    title: "Brinca na calculadora até o preço fazer sentido",
    hook:
      "Aqui você testa canal, peso, tempo, Shopee, ML, cartão… Enquanto isso o app mostra margem de verdade, não fantasia.",
    accent: "from-violet-500/20 via-slate-900/40 to-fuchsia-500/15",
    ringClass: "neon-ring-purple",
    tasks: [
      { id: "t1", text: "Simular uma peça com peso e tempo honestos (sem arredondar pra baixo, hein)" },
      { id: "t2", text: "Olhar lucro líquido e margem — se doer um pouco, provavelmente tá certo" },
      { id: "t3", text: "Se rolar, salvar o produto quando o número estiver redondo" },
    ],
    shortcuts: [
      { href: "/calculator", label: "Calculadora de markup" },
      { href: "/margem-certa", label: "Margem certa" },
      { href: "/products", label: "Produtos" },
    ],
    randomTips: [
      "Canal importa: ML e Shopee não são 'só mais uma taxinha' — deixa o app mostrar o choque com carinho.",
      "Ajustes avançados existem por um motivo. Usa sem medo quando a conta não bater com a realidade.",
      "Compara dois canais lado a lado antes de decidir onde vender. A diferença às vezes passa de 15%.",
    ],
  },
  {
    id: "fabrica",
    tag: "Da tela pra bancada",
    emoji: "🏭",
    title: "Transforma ideia em ordem na prática",
    hook:
      "Produto bonito na ficha é ótimo. Agora coloca isso na fila: ordem com prazo, impressora certa e status que você consegue explicar pro cliente.",
    accent: "from-amber-500/15 via-slate-900/40 to-orange-500/15",
    ringClass: "neon-ring-amber",
    tasks: [
      { id: "t1", text: "Conferir se o produto tem ficha decente (foto ajuda muito)" },
      { id: "t2", text: "Criar uma ordem de produção com quantidade e prazo realista" },
      { id: "t3", text: "Dar play no fluxo: pendente → em produção → concluído (com orgulho)" },
    ],
    shortcuts: [
      { href: "/products", label: "Produtos" },
      { href: "/ordens", label: "Ordens" },
      { href: "/inventory", label: "Peças produzidas" },
    ],
    randomTips: [
      "Ordem atrasada acontece. O app ajuda a enxergar antes virar mensagem nervosa no WhatsApp.",
      "Peças produzidas são seu histórico de vitórias — útil pra prazo e pra cobrança.",
      "Foto no produto parece bobagem até o cliente pedir confirmação visual. Vale o segundo que leva.",
    ],
  },
  {
    id: "estoque",
    tag: "Grana & estoque",
    emoji: "📦",
    title: "Fecha o ciclo: vendas, alertas, estoque vivo",
    hook:
      "Precificou, produziu… agora entra o mundo real: venda, baixa de insumo, alerta de bagunça. É aqui que o caos vira controle.",
    accent: "from-rose-500/15 via-slate-900/40 to-cyan-500/15",
    ringClass: "neon-ring-cyan",
    tasks: [
      { id: "t1", text: "Registrar entradas/saídas de insumo quando comprar ou gastar de verdade" },
      { id: "t2", text: "Lançar vendas nos canais que você usa (sem julgamento se for só Shopee)" },
      { id: "t3", text: "Dar uma olhada em Alertas antes de tomar decisão emocional às 2h da manhã" },
    ],
    shortcuts: [
      { href: "/sales", label: "Vendas" },
      { href: "/alertas", label: "Alertas" },
      { href: "/insumos", label: "Insumos" },
    ],
    randomTips: [
      "Estoque errado = custo errado = preço errado. O loop se fecha aqui.",
      "Alertas não são pra te stressar — é lembrete com pitaco técnico.",
      "Registrar venda logo depois de fechar evita aquela confusão de 'quanto eu vendi essa semana?'.",
    ],
  },
  {
    id: "visao",
    tag: "Chefão final",
    emoji: "🚀",
    title: "Dashboard e relatórios: o 'tá tudo sob controle?'",
    hook:
      "Quando a rotina aperta, você não quer planilha. Quer um lugar que diga se a semana foi verde, amarela ou modo sobrevivência.",
    accent: "from-emerald-500/25 via-slate-900/40 to-cyan-500/20",
    ringClass: "neon-ring-emerald",
    tasks: [
      { id: "t1", text: "Passar o olho no Dashboard (KPI, não horóscopo)" },
      { id: "t2", text: "Abrir Relatórios quando precisar mostrar número pra alguém — ou pra você mesmo" },
      { id: "t3", text: "Se for o caso, ajustar Assinaturas / Conta sem medo de clicar" },
    ],
    shortcuts: [
      { href: "/", label: "Dashboard" },
      { href: "/reports", label: "Relatórios" },
      { href: "/pricing", label: "Assinaturas" },
    ],
    randomTips: [
      "Relatório bom é o que você olha de novo na semana seguinte. Se não olhar, era só enfeite.",
      "Se o dashboard tá verde e você tá cansado, talvez você precise subir preço — piada… ou não.",
      "Ticket médio baixo com volume alto costuma disfaçar margem ruim. Relatório revela isso rápido.",
    ],
  },
];

const STORAGE_PREFIX = "maph-tutorial-check:";

function loadChecks(phaseId: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + phaseId);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function saveChecks(phaseId: string, next: Record<string, boolean>) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + phaseId, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function TutorialInteractive() {
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [allChecks, setAllChecks] = useState<Record<string, Record<string, boolean>>>({});
  const [tipIndex, setTipIndex] = useState(0);
  const [pulse, setPulse] = useState(0);

  const phase = PHASES[step];
  const isLast = step === PHASES.length - 1;

  // Load all phases on mount for global progress
  useEffect(() => {
    const all: Record<string, Record<string, boolean>> = {};
    PHASES.forEach((p) => {
      all[p.id] = loadChecks(p.id);
    });
    setAllChecks(all);
  }, []);

  useEffect(() => {
    const phaseChecks = loadChecks(phase.id);
    setChecks(phaseChecks);
    setTipIndex(0);
    setPulse((p) => p + 1);
  }, [phase.id]);

  // Sync current phase checks into allChecks
  useEffect(() => {
    setAllChecks((prev) => ({ ...prev, [phase.id]: checks }));
  }, [checks, phase.id]);

  const toggle = useCallback(
    (taskId: string) => {
      setChecks((prev) => {
        const next = { ...prev, [taskId]: !prev[taskId] };
        saveChecks(phase.id, next);
        return next;
      });
    },
    [phase.id],
  );

  const completedCount = useMemo(() => {
    return phase.tasks.filter((t) => checks[t.id]).length;
  }, [phase.tasks, checks]);

  const isPhaseComplete = useCallback(
    (phaseId: string) => {
      const ph = PHASES.find((p) => p.id === phaseId);
      if (!ph) return false;
      const c = allChecks[phaseId] ?? {};
      return ph.tasks.every((t) => c[t.id]);
    },
    [allChecks],
  );

  const completedPhases = useMemo(
    () => PHASES.filter((p) => isPhaseComplete(p.id)).length,
    [isPhaseComplete],
  );

  const shuffleTip = useCallback(() => {
    const tips = phase.randomTips;
    setTipIndex((i) => (i + 1) % tips.length);
  }, [phase.randomTips]);

  const resetAll = useCallback(() => {
    PHASES.forEach((p) => {
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + p.id);
      } catch {
        /* ignore */
      }
    });
    setChecks({});
    setAllChecks({});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" && step < PHASES.length - 1) {
        setStep((s) => s + 1);
      }
      if (e.key === "ArrowLeft" && step > 0) {
        setStep((s) => s - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const progressPercent = (completedPhases / PHASES.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 p-5 md:p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-4">
          {/* Title row */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Trilha MAPH — modo descomplicado
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-50 md:text-3xl">
                Tutorial que não parece manual de impressora
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
                Avança em blocos curtos, marca o que já fez (fica salvo no navegador) e pula direto pras
                telas do app.{" "}
                <span className="text-slate-500">← → no teclado também funcionam.</span>
              </p>
            </div>

            {/* Reset button — always visible */}
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-[11px] font-semibold text-slate-500 transition hover:border-slate-500 hover:text-slate-300"
            >
              <RotateCcw className="h-3 w-3" />
              Zerar progresso
            </button>
          </div>

          {/* Global progress bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-medium text-slate-500">
                {completedPhases === PHASES.length
                  ? "Trilha completa 🎉"
                  : `${completedPhases} de ${PHASES.length} fases concluídas`}
              </p>
              <p className="text-[11px] text-slate-600">{Math.round(progressPercent)}%</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Phase nav tabs */}
          <div className="flex flex-wrap gap-2">
            {PHASES.map((p, i) => {
              const done = isPhaseComplete(p.id);
              const active = i === step;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setStep(i)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 shadow-neon-cyan"
                      : done
                        ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:border-emerald-500/60"
                        : "border border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                  }`}
                >
                  {done && !active ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span className="opacity-60">{i + 1}.</span>
                  )}
                  {p.tag}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Phase card */}
      <div
        key={pulse}
        className="tutorial-animate rounded-2xl border border-slate-800 bg-slate-950/50 p-1 shadow-[0_0_0_1px_rgba(34,211,238,0.06)]"
      >
        <div
          className={`rounded-xl bg-gradient-to-br p-5 md:p-7 ${phase.accent} border border-slate-800/60`}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
            <div
              className={`flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950/60 text-5xl ${phase.ringClass}`}
            >
              {phase.emoji}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                Fase {step + 1} · {phase.tag}
              </p>
              <h2 className="text-xl font-bold text-slate-50 md:text-2xl">{phase.title}</h2>
              <p className="text-sm leading-relaxed text-slate-300">{phase.hook}</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {phase.shortcuts.map((s) => (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-600/80 bg-slate-950/50 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:border-cyan-500/50 hover:bg-slate-900/80"
                  >
                    {s.label}
                    <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-800/80 pt-6 md:grid-cols-2">
            {/* Checklist */}
            <div>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Checklist (marca quando fizer)
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                    completedCount === phase.tasks.length
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-900/80 text-slate-500"
                  }`}
                >
                  {completedCount}/{phase.tasks.length}
                </span>
              </div>
              <ul className="space-y-2">
                {phase.tasks.map((task) => {
                  const done = Boolean(checks[task.id]);
                  return (
                    <li key={task.id}>
                      <button
                        type="button"
                        onClick={() => toggle(task.id)}
                        className={`flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left text-sm transition ${
                          done
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                            : "border-slate-700/80 bg-slate-950/40 text-slate-200 hover:border-slate-600"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-xs ${
                            done
                              ? "border-emerald-400 bg-emerald-500/30 text-emerald-100"
                              : "border-slate-600 bg-slate-900 text-slate-500"
                          }`}
                        >
                          {done ? <Check className="h-3.5 w-3.5" /> : null}
                        </span>
                        <span>{task.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Random tip */}
            <div className="flex flex-col justify-between rounded-xl border border-dashed border-slate-700/90 bg-slate-950/40 p-4">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Pitaco aleatório
                  </p>
                  <button
                    type="button"
                    onClick={shuffleTip}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200"
                  >
                    <Dices className="h-3 w-3" />
                    Outra
                  </button>
                </div>
                <p className="text-sm leading-relaxed text-slate-300">{phase.randomTips[tipIndex]}</p>
              </div>
              <p className="mt-4 text-[11px] text-slate-500">
                Cada fase guarda seu checklist separadinho neste aparelho.
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-5">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>

            {!isLast ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(PHASES.length - 1, s + 1))}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Próxima fase
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Ir pro Dashboard
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <p className="text-center text-[11px] text-slate-600">
        Feito pra quem vende peça impressa e não quer soar como robô corporativo.
      </p>
    </div>
  );
}
