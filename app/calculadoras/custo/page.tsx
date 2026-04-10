"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Save } from "lucide-react";
import { InputPanel } from "@/components/calculator/InputPanel";
import { useCalculator } from "@/hooks/useCalculator";
import { LAB_PRINTING_SUPPLY_FALLBACK_ID } from "@/lib/calculatorLabDefaults";
import { useCalculatorStore } from "@/store/calculatorStore";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Custo3DPage() {
  const router = useRouter();
  const { form, results } = useCalculator();
  const requestSave = useCalculatorStore((s) => s.requestSave);
  const [saving, setSaving] = useState(false);

  const unitCost = useMemo(() => {
    if (!results) return null;
    const adj = results.custoTotalAjustado;
    if (typeof adj === "number" && Number.isFinite(adj)) return Math.max(0, adj);
    return Math.max(0, Number(results.totalCost ?? 0));
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InputPanel
            form={form}
            hidePricingSection
            materialSupplyFallbackId={LAB_PRINTING_SUPPLY_FALLBACK_ID}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Custo unitário (base)
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-300">
              {unitCost != null ? fmtBRL(unitCost) : "—"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!results || saving}
                onClick={() => {
                  setSaving(true);
                  requestSave("venda_direta");
                  window.setTimeout(() => setSaving(false), 600);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar produto (base)
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/shopee")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Shopee
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/mercado-livre")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Mercado Livre
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/venda-direta")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Venda Direta
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Dica: nas calculadoras de canal, use o botão “Usar custo do último cálculo 3D”.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

