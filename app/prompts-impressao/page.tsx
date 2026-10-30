"use client";

import { useState } from "react";
import {
  Waves,
  Layers,
  Wind,
  Ruler,
  PenTool,
  Grid2x2,
  Mountain,
  Radio,
  Type,
  Trash2,
  RotateCw,
  Clock,
  Boxes,
  DollarSign,
  Palette,
  MoveHorizontal,
  Wrench,
  Camera,
  SlidersHorizontal,
  ArrowLeftRight,
  ClipboardCopy,
  Check,
  X,
  Puzzle,
  Download,
  Target,
  Cog,
  Flame,
  ShieldAlert,
  Gauge,
  Zap,
  Hexagon,
  CircleDashed,
  Eraser,
  Shuffle,
  Droplets,
  AlertTriangle,
  Shapes,
  Component,
  Scissors,
  Fingerprint,
  Settings2,
  ScanSearch,
  Factory,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { PRINT_PROMPTS, type PrintPromptCategory } from "@/lib/printPrompts";
import { AI_SKILLS, DEFAULTS, type AiSkill } from "@/lib/aiSkills";

const ICONS: Record<PrintPromptCategory["icon"], LucideIcon> = {
  Waves,
  Layers,
  Wind,
  Ruler,
  PenTool,
  Grid2x2,
  Mountain,
  Radio,
  Type,
  Trash2,
  RotateCw,
  Clock,
  Boxes,
  DollarSign,
  Palette,
  MoveHorizontal,
  Wrench,
  Camera,
  SlidersHorizontal,
  ArrowLeftRight,
  Target,
  Cog,
  Flame,
  ShieldAlert,
  Gauge,
  Zap,
  Hexagon,
  CircleDashed,
  Eraser,
  Shuffle,
  Droplets,
  AlertTriangle,
  Shapes,
  Component,
  Scissors,
  Fingerprint,
  Settings2,
  ScanSearch,
  Factory,
  Timer,
};

/** Paleta cíclica pra dar "arte" (cor + ícone) a cada card sem depender de ilustração customizada. */
const ACCENTS = [
  { ring: "border-cyan-500/30", bg: "bg-cyan-500/10", text: "text-cyan-300" },
  { ring: "border-emerald-500/30", bg: "bg-emerald-500/10", text: "text-emerald-300" },
  { ring: "border-violet-500/30", bg: "bg-violet-500/10", text: "text-violet-300" },
  { ring: "border-amber-500/30", bg: "bg-amber-500/10", text: "text-amber-300" },
  { ring: "border-rose-500/30", bg: "bg-rose-500/10", text: "text-rose-300" },
];

export default function PromptsImpressaoPage() {
  const [view, setView] = useState<"prompts" | "skills">("prompts");
  const [active, setActive] = useState<PrintPromptCategory | null>(null);
  const [activeSkill, setActiveSkill] = useState<AiSkill | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCopy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard indisponível — o usuário ainda consegue selecionar e copiar manualmente
    }
  }

  function openPrompt(p: PrintPromptCategory) {
    setCopied(false);
    setActive(p);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Prompts IA — Impressão 3D
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          20 prompts prontos pra resolver os problemas mais comuns de impressão FDM (fios, empenamento, suporte,
          tempo, custo, encaixe...). Clique num card, copie o prompt e cole no Claude Cowork — ele mesmo abre o
          fatiador, lê suas configurações atuais na tela e aplica a correção, sem você preencher nada na mão.
        </p>
      </div>

      <div className="flex overflow-hidden rounded-xl border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => setView("prompts")}
          className={`px-4 py-2 text-xs font-semibold transition ${
            view === "prompts" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-950/60 text-slate-400 hover:bg-slate-900"
          }`}
        >
          Prompts de impressão
        </button>
        <button
          type="button"
          onClick={() => setView("skills")}
          className={`px-4 py-2 text-xs font-semibold transition ${
            view === "skills" ? "bg-cyan-500/20 text-cyan-300" : "bg-slate-950/60 text-slate-400 hover:bg-slate-900"
          }`}
        >
          Skills
        </button>
      </div>

      {view === "skills" ? (
        AI_SKILLS.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {AI_SKILLS.map((s, i) => {
              const accent = ACCENTS[i % ACCENTS.length];
              return (
                <div
                  key={s.id}
                  className={`glass-panel flex flex-col items-start gap-3 rounded-2xl border ${accent.ring} bg-slate-950/50 p-4 text-left`}
                >
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg}`}>
                    <Puzzle className={`h-5 w-5 ${accent.text}`} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{s.name}</p>
                    <p className={`mt-0.5 text-[11px] font-medium uppercase tracking-wide ${accent.text}`}>
                      {s.subtitle}
                    </p>
                  </div>
                  <p className="text-xs leading-snug text-slate-400">{s.description}</p>
                  <div className="mt-1 flex w-full gap-2">
                    <a
                      href={`/skills/${s.zipFileName}`}
                      download
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-slate-950 transition hover:from-cyan-400 hover:to-emerald-400"
                    >
                      <Download className="h-3.5 w-3.5" /> Baixar .zip
                    </a>
                    <button
                      type="button"
                      onClick={() => setActiveSkill(s)}
                      className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                      Como instalar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/50 p-8 text-center">
            <Puzzle className="mx-auto h-10 w-10 text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-200">Nenhuma skill cadastrada ainda</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">
              Quando um arquivo .zip de skill for adicionado, ele aparece aqui com botão de download e instruções de
              instalação e uso.
            </p>
          </div>
        )
      ) : (
      <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PRINT_PROMPTS.map((p, i) => {
          const Icon = ICONS[p.icon];
          const accent = ACCENTS[i % ACCENTS.length];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => openPrompt(p)}
              className={`glass-panel group flex flex-col items-start gap-3 rounded-2xl border ${accent.ring} bg-slate-950/50 p-4 text-left transition hover:bg-slate-900/60`}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg}`}>
                  <Icon className={`h-5 w-5 ${accent.text}`} />
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  MAPH PRO 3D · {String(p.number).padStart(2, "0")}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100 group-hover:text-slate-50">{p.title}</p>
                <p className={`mt-0.5 text-[11px] font-medium uppercase tracking-wide ${accent.text}`}>
                  {p.subtitle}
                </p>
              </div>
              <ul className="space-y-1 text-[11px] leading-snug text-slate-500">
                {p.recognize.slice(0, 2).map((r, idx) => (
                  <li key={idx} className="truncate">
                    • {r}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {active ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-neon-cyan">
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-4 lg:max-h-[85vh]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    MAPH PRO 3D · Prompt {String(active.number).padStart(2, "0")}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-50">{active.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{active.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Você reconhece quando
                </p>
                <ul className="space-y-0.5 text-xs text-slate-400">
                  {active.recognize.map((r, idx) => (
                    <li key={idx}>• {r}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 max-h-[42vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/40 p-3">
                <pre className="whitespace-pre-wrap break-words font-sans text-xs leading-relaxed text-slate-300">
                  {active.prompt}
                </pre>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(active.prompt)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
                >
                  {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                  {copied ? "Copiado!" : "Copiar prompt"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      </>
      )}

      {activeSkill ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-neon-cyan">
            <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto p-4 lg:max-h-[85vh]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    MAPH PRO 3D · Skill
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-slate-50">{activeSkill.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{activeSkill.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSkill(null)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:bg-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Como instalar — Claude Code
                </p>
                <ol className="space-y-1 text-xs text-slate-400">
                  {(activeSkill.install.length > 0 ? activeSkill.install : DEFAULTS.installClaudeCode).map(
                    (step, idx) => (
                      <li key={idx}>
                        {idx + 1}. {step}
                      </li>
                    ),
                  )}
                </ol>
              </div>

              <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Como instalar — claude.ai / app do Claude
                </p>
                <ol className="space-y-1 text-xs text-slate-400">
                  {DEFAULTS.installClaudeAi.map((step, idx) => (
                    <li key={idx}>
                      {idx + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Como usar</p>
                <ul className="space-y-0.5 text-xs text-slate-400">
                  {(activeSkill.usage.length > 0 ? activeSkill.usage : DEFAULTS.usage).map((step, idx) => (
                    <li key={idx}>• {step}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSkill(null)}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
                >
                  Fechar
                </button>
                <a
                  href={`/skills/${activeSkill.zipFileName}`}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
                >
                  <Download className="h-4 w-4" /> Baixar .zip
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
