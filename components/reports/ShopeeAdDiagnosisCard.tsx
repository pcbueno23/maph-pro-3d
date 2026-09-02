"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import type { AdsRowSummary } from "@/lib/supabaseShopeeReports";
import { analyzeAd, type MetricStatus } from "@/lib/shopeeAdsAnalysis";

function formatBRL(value: number | null) {
  return value == null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_STYLE: Record<MetricStatus, { dot: string; text: string; bg: string; icon: typeof CheckCircle2 }> = {
  boa: { dot: "bg-emerald-400", text: "text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/25", icon: CheckCircle2 },
  atencao: { dot: "bg-amber-400", text: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/25", icon: AlertTriangle },
  ruim: { dot: "bg-rose-400", text: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/25", icon: XCircle },
  neutro: { dot: "bg-slate-500", text: "text-slate-400", bg: "bg-slate-800/40 border-slate-700", icon: HelpCircle },
};

const STATUS_LABEL: Record<MetricStatus, string> = {
  boa: "Saudável",
  atencao: "Atenção",
  ruim: "Problema",
  neutro: "Sem dados",
};

export function ShopeeAdDiagnosisCard({ row }: { row: AdsRowSummary }) {
  const [open, setOpen] = useState(false);
  const diagnosis = analyzeAd(row);
  const s = STATUS_STYLE[diagnosis.overallStatus];
  const roasTone =
    row.roas == null ? "text-slate-400" : row.roas < 1 ? "text-rose-400" : row.roas < 1.5 ? "text-amber-300" : "text-emerald-400";

  return (
    <div className={`rounded-xl border ${s.bg} overflow-hidden`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-slate-100" title={row.adName ?? ""}>
              {row.adName ?? "—"}
            </p>
            {!row.matchedProductId && (
              <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">
                sem produto casado
              </span>
            )}
            {diagnosis.lowSample && (
              <span className="shrink-0 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">
                amostra pequena
              </span>
            )}
          </div>
          <p className={`mt-0.5 text-xs ${s.text}`}>{STATUS_LABEL[diagnosis.overallStatus]} — {diagnosis.overallSummary}</p>
        </div>
        <div className="hidden shrink-0 gap-4 text-right sm:flex">
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">Investido</p>
            <p className="text-xs text-slate-200">{formatBRL(row.expenses)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wide text-slate-500">ROAS</p>
            <p className={`text-xs font-semibold ${roasTone}`}>{row.roas != null ? `${row.roas.toFixed(2)}x` : "—"}</p>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-800/70 px-4 py-3">
          {diagnosis.breakEvenRoas != null && (
            <p className="mb-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-200">
              ROAS de equilíbrio deste produto (usando o custo real cadastrado): <strong>{diagnosis.breakEvenRoas.toFixed(2)}x</strong> —
              abaixo disso, o anúncio dá prejuízo mesmo gerando venda.
            </p>
          )}
          <div className="space-y-2">
            {diagnosis.metrics.map((m) => {
              const ms = STATUS_STYLE[m.status];
              const Icon = ms.icon;
              return (
                <div key={m.key} className="flex gap-2.5">
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${ms.text}`} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-200">
                      <span className="font-medium">{m.label}:</span>{" "}
                      <span className={`font-semibold ${ms.text}`}>{m.value}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{m.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
