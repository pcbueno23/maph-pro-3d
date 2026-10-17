"use client";

import { Plus, Trash2 } from "lucide-react";
import DiscountField from "@/components/marketplaces/shopee/DiscountField";
import InputField from "@/components/marketplaces/shopee/InputField";
import type { ShopeeCupomTier } from "@/lib/engines/shopee/engine";

/** As faixas reais que o usuário relatou ter na loja (Meus Cupons de Vendedor) — usadas
 * só como ponto de partida ao ligar o modo "por faixa" pela primeira vez; editável depois. */
const FAIXAS_INICIAIS: ShopeeCupomTier[] = [
  { min: 15.99, percent: 5, maxRS: 1 },
  { min: 39.9, percent: 5, maxRS: 2 },
  { min: 59.9, percent: 5, maxRS: 3 },
  { min: 89.9, percent: 5, maxRS: 5 },
];

export function CupomTierEditor({
  tiers,
  onTiersChange,
  flatPercent,
  onFlatPercentChange,
  flatMaxRS,
  onFlatMaxRSChange,
  referencePrice,
  allowValorMode,
}: {
  tiers: ShopeeCupomTier[] | undefined;
  onTiersChange: (tiers: ShopeeCupomTier[]) => void;
  flatPercent: number;
  onFlatPercentChange: (v: number) => void;
  flatMaxRS: number;
  onFlatMaxRSChange: (v: number) => void;
  referencePrice: number;
  allowValorMode: boolean;
}) {
  // Deriva do próprio array (não guarda estado próprio) — assim, se a página zerar
  // cupomTiers de fora (ex.: aplicar uma estratégia de ranking com cupom único), a UI
  // volta sozinha pra "Único" em vez de ficar mostrando "Por faixa" com a lista vazia.
  const porFaixa = (tiers?.length ?? 0) > 0;

  function ativarPorFaixa() {
    onTiersChange(FAIXAS_INICIAIS);
  }

  function ativarUnico() {
    onTiersChange([]);
  }

  function updateTier(idx: number, patch: Partial<ShopeeCupomTier>) {
    const next = (tiers ?? []).map((t, i) => (i === idx ? { ...t, ...patch } : t));
    onTiersChange(next);
  }

  function removeTier(idx: number) {
    onTiersChange((tiers ?? []).filter((_, i) => i !== idx));
  }

  function addTier() {
    const ultimo = (tiers ?? [])[tiers!.length - 1];
    onTiersChange([
      ...(tiers ?? []),
      { min: (ultimo?.min ?? 0) + 20, percent: ultimo?.percent ?? 5, maxRS: (ultimo?.maxRS ?? 0) + 1 },
    ]);
  }

  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-ink-200">
          Cupom loja
        </label>
        <div className="flex overflow-hidden rounded-lg border border-slate-800 text-[10px] font-semibold">
          <button
            type="button"
            onClick={ativarUnico}
            className={`px-2.5 py-1 transition ${
              !porFaixa ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Único
          </button>
          <button
            type="button"
            onClick={ativarPorFaixa}
            className={`px-2.5 py-1 transition ${
              porFaixa ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Por faixa de preço
          </button>
        </div>
      </div>

      {!porFaixa ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <DiscountField
            label="Desconto do cupom"
            percent={flatPercent}
            onPercentChange={onFlatPercentChange}
            referencePrice={referencePrice}
            allowValorMode={allowValorMode}
            capAmount={flatMaxRS}
          />
          <InputField
            label="Teto do cupom"
            value={flatMaxRS}
            onChange={onFlatMaxRSChange}
            prefix="R$"
            placeholder="Sem limite"
            hint="Ex.: cupom de 5%, até R$10 — deixe 0 pra não limitar."
          />
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="mb-2 text-[11px] text-slate-500">
            Igual "Meus Cupons de Vendedor" da Shopee: cada faixa libera a partir de um pedido mínimo. O
            cálculo usa sempre a maior faixa que o preço atingir.
          </p>
          <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-x-2 gap-y-1.5">
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Pedido mínimo</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Desconto</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">Teto</span>
            <span />
            {(tiers ?? []).map((t, idx) => (
              <div key={idx} className="contents">
                <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100">
                  <span className="mr-1 text-slate-500">R$</span>
                  <input
                    type="number"
                    step={0.01}
                    value={t.min}
                    onChange={(e) => updateTier(idx, { min: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent text-right outline-none"
                  />
                </div>
                <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100">
                  <input
                    type="number"
                    step={0.1}
                    value={t.percent}
                    onChange={(e) => updateTier(idx, { percent: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent text-right outline-none"
                  />
                  <span className="ml-1 text-slate-500">%</span>
                </div>
                <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100">
                  <span className="mr-1 text-slate-500">R$</span>
                  <input
                    type="number"
                    step={0.01}
                    value={t.maxRS}
                    onChange={(e) => updateTier(idx, { maxRS: Number(e.target.value) || 0 })}
                    className="w-full bg-transparent text-right outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeTier(idx)}
                  title="Remover faixa"
                  className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/15"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addTier}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar faixa
          </button>
        </div>
      )}
    </div>
  );
}
