"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save, RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveMarketplaceProduct } from "@/lib/saveMarketplaceProduct";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useMarketplacePresets } from "@/hooks/useMarketplacePresets";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";
import { PresetPicker, type PresetItem } from "@/components/marketplaces/shared/PresetPicker";
import {
  calcularPrecoVendaDireta,
  MACHINE_PROFILES,
  type MachineProfileId,
  type VendaDiretaInputs,
} from "@/lib/engines/vendaDireta/engine";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number) {
  return `${(v ?? 0).toFixed(2)}%`;
}

function round2(v: number) {
  return Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;
}

const DEFAULT_INPUTS: VendaDiretaInputs = {
  fullCustoUnidade: 0,
  margem: 25,
  imposto: 0,
  mode: "margem",
  targetNet: 100,
  pixDiscountPercent: 0,
  machineProfile: "custom",
  installments: 6,
  anticipationEnabled: false,
  anticipationRatePerMonth: 0,
  receiveDays: 30,
};

export default function VendaDiretaCalculatorPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const lastResults = useCalculatorStore((s) => s.lastResults);
  const lastInput = useCalculatorStore((s) => s.lastInput);

  const {
    list: presets,
    activeId: activePresetId,
    active: activePreset,
    save: savePreset,
    select: selectPresetId,
    remove: removePreset,
  } = useMarketplacePresets<VendaDiretaInputs>("vendaDireta");

  const [nomeProduto, setNomeProduto] = useState("");
  const [inputs, setInputs] = useState<VendaDiretaInputs>(
    () => activePreset?.inputs ?? DEFAULT_INPUTS,
  );

  const loadedPresetOnceRef = useRef(false);
  useEffect(() => {
    if (loadedPresetOnceRef.current) return;
    if (activePreset) {
      setInputs(activePreset.inputs);
      loadedPresetOnceRef.current = true;
    }
  }, [activePreset]);

  const handleSelectPreset = useCallback((preset: PresetItem<VendaDiretaInputs>) => {
    setInputs(preset.inputs);
    selectPresetId(preset.id);
    loadedPresetOnceRef.current = true;
  }, [selectPresetId]);

  const handleSavePreset = useCallback((name: string) => {
    savePreset(name, inputs);
  }, [savePreset, inputs]);

  const selectedMachine = useMemo(
    () => MACHINE_PROFILES.find((p) => p.id === inputs.machineProfile) ?? MACHINE_PROFILES[0]!,
    [inputs.machineProfile],
  );
  const machineTable = selectedMachine.table;

  const lastCost = useMemo(() => {
    const c = lastResults?.custoTotalAjustado;
    return typeof c === "number" && Number.isFinite(c) ? c : null;
  }, [lastResults?.custoTotalAjustado]);

  const setField = useCallback(
    <K extends keyof VendaDiretaInputs>(key: K, value: VendaDiretaInputs[K]) => {
      setInputs((p) => ({ ...p, [key]: value }));
    },
    [],
  );
  const setNumField = useCallback(
    (key: keyof VendaDiretaInputs, v: number) => setField(key, round2(v) as never),
    [setField],
  );
  const setCusto2 = useCallback((v: number) => setNumField("fullCustoUnidade", v), [setNumField]);
  const setMargem2 = useCallback((v: number) => setNumField("margem", v), [setNumField]);
  const setTargetNet2 = useCallback((v: number) => setNumField("targetNet", v), [setNumField]);
  const setImposto2 = useCallback((v: number) => setNumField("imposto", v), [setNumField]);
  const setPixDiscount2 = useCallback((v: number) => setNumField("pixDiscountPercent", v), [setNumField]);
  const setAnticipationRate2 = useCallback(
    (v: number) => setNumField("anticipationRatePerMonth", v),
    [setNumField],
  );

  const result = useMemo(() => calcularPrecoVendaDireta(inputs), [inputs]);
  const {
    pricePix,
    priceCard,
    parcelaValue,
    lucroPix,
    lucroCard,
    diffPixVsCardPct,
    feeForInstallments,
    anticipationPercent,
  } = result;

  async function handleSave() {
    const customName = nomeProduto.trim();
    const name =
      customName ||
      "Simulação " +
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

    await saveMarketplaceProduct({
      payload: {
        name,
        weightGrams: 0,
        channelPrice: pricePix,
        channelMarginPercent: Number.isFinite(inputs.margem) ? inputs.margem : null,
        marketplace: "Venda Direta",
        suggestedPriceDirect: pricePix,
        totalCost: inputs.fullCustoUnidade,
      },
      settings,
      user,
      addProduct,
      router,
    });
  }

  function buildWhatsAppText() {
    const n = Math.max(1, Math.round(Math.min(12, Math.max(1, inputs.installments))));
    return `
💰 *Formas de pagamento*

${nomeProduto.trim() ? `📦 *Produto:* ${nomeProduto.trim()}\n` : ""}PIX: ${fmtBRL(pricePix)}
Cartão ${n}x: ${fmtBRL(parcelaValue)} (${fmtBRL(priceCard)})

📊 Diferença PIX vs Cartão: +${diffPixVsCardPct.toFixed(1)}%
    `.trim();
  }

  async function handleCopyWhatsApp() {
    const text = buildWhatsAppText();
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Calculadora venda direta
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Precificação para PIX e cartão, com margem e taxas.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PresetPicker
              presets={presets}
              activeId={activePresetId}
              onSelect={handleSelectPreset}
              onSave={handleSavePreset}
              onDelete={removePreset}
              label="preset Venda Direta"
            />
            <button
              type="button"
              onClick={() => {
                setNomeProduto("");
                setInputs(DEFAULT_INPUTS);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
            >
              <RotateCcw className="h-4 w-4" />
              Limpar
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <ProductNameAutocomplete
            label="Nome do produto (opcional)"
            value={nomeProduto}
            onChange={setNomeProduto}
            placeholder="Ex.: Suporte de celular"
            onPick={(p) => {
              setNomeProduto(p.name);
              if (typeof p.totalCost === "number" && Number.isFinite(p.totalCost)) {
                setCusto2(p.totalCost);
              }
            }}
          />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Custo unitário
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastCost != null) setCusto2(lastCost);
                      const suggestedName =
                        typeof lastInput?.productName === "string"
                          ? lastInput.productName.trim()
                          : "";
                      if (suggestedName && !nomeProduto.trim()) setNomeProduto(suggestedName);
                    }}
                    disabled={lastCost == null}
                    className="text-[11px] font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    usar último custo 3D
                  </button>
                </div>
                <input
                  type="number"
                  value={inputs.fullCustoUnidade}
                  onChange={(e) => setCusto2(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Modo de cálculo
                </label>
                <select
                  value={inputs.mode}
                  onChange={(e) => setField("mode", e.currentTarget.value as VendaDiretaInputs["mode"])}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  <option value="margem">Meta de margem (%)</option>
                  <option value="receber_liquido">Quero receber (líquido)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  {inputs.mode === "margem" ? "Margem desejada (%)" : "Quero receber (R$) líquido"}
                </label>
                {inputs.mode === "margem" ? (
                  <input
                    type="number"
                    value={inputs.margem}
                    onChange={(e) => setMargem2(parseFloat(e.currentTarget.value) || 0)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                ) : (
                  <input
                    type="number"
                    value={inputs.targetNet}
                    onChange={(e) => setTargetNet2(parseFloat(e.currentTarget.value) || 0)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Imposto (%)
                </label>
                <input
                  type="number"
                  value={inputs.imposto}
                  onChange={(e) => setImposto2(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Desconto PIX (%)
                </label>
                <input
                  type="number"
                  value={inputs.pixDiscountPercent}
                  onChange={(e) => setPixDiscount2(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Selecionar maquininha
                </label>
                <select
                  value={inputs.machineProfile}
                  onChange={(e) => setField("machineProfile", e.currentTarget.value as MachineProfileId)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  {MACHINE_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Parcelamento (1x até 12x)
                </label>
                <select
                  value={inputs.installments}
                  onChange={(e) => setField("installments", parseInt(e.currentTarget.value, 10) || 1)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x ({fmtPct(machineTable[n] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Antecipação</span>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={inputs.anticipationEnabled}
                    onChange={(e) => setField("anticipationEnabled", e.currentTarget.checked)}
                    className="h-4 w-4 accent-emerald-400"
                  />
                  Antecipação automática
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Taxa antecipação (% ao mês)
                  </label>
                  <input
                    type="number"
                    value={inputs.anticipationRatePerMonth}
                    onChange={(e) => setAnticipationRate2(parseFloat(e.currentTarget.value) || 0)}
                    disabled={!inputs.anticipationEnabled}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Prazo recebimento
                  </label>
                  <select
                    value={inputs.receiveDays}
                    onChange={(e) => setField("receiveDays", (parseInt(e.currentTarget.value, 10) as 30 | 14 | 2))}
                    disabled={!inputs.anticipationEnabled}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  >
                    <option value={30}>30 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={2}>2 dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Taxa efetiva
                  </label>
                  <div className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100">
                    {inputs.anticipationEnabled ? fmtPct(anticipationPercent) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-emerald disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar produto
              </button>
            </div>
          </div>

        <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Preço PIX
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-50 tabular-nums">
                  {fmtBRL(pricePix)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Valor total: {fmtBRL(pricePix)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Preço cartão ({inputs.installments}x)
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-50 tabular-nums">
                  {fmtBRL(priceCard)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {inputs.installments}x de {fmtBRL(parcelaValue)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 print:hidden">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm text-slate-300">Lucro (PIX)</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-300">
                  {fmtBRL(lucroPix)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-300">Lucro (Cartão)</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-300">
                  {fmtBRL(lucroCard)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Diferença PIX vs Cartão
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">PIX</p>
                  <p className="mt-1 text-slate-50 tabular-nums font-semibold">{fmtBRL(pricePix)}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">Cartão {inputs.installments}x</p>
                  <p className="mt-1 text-slate-50 tabular-nums font-semibold">{fmtBRL(priceCard)}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">Diferença</p>
                  <p className="mt-1 text-amber-200 tabular-nums font-semibold">
                    +{diffPixVsCardPct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Tabela de taxas (maquininha)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      n === inputs.installments
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <span className="text-slate-300">{n}x</span>
                    <span className="tabular-nums text-slate-50 font-semibold">
                      {fmtPct(machineTable[n] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Taxa cartão (selecionada): {fmtPct(feeForInstallments)}{" "}
                {inputs.anticipationEnabled ? `+ antecipação ${fmtPct(anticipationPercent)}` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 print:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Simulação de lucro por forma de pagamento
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-300">Forma</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">Preço</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">Lucro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">PIX</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">{fmtBRL(pricePix)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtBRL(lucroPix)}</td>
                    </tr>
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">Crédito {inputs.installments}x</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">{fmtBRL(priceCard)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtBRL(lucroCard)}</td>
                    </tr>
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">Parcela (cliente)</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">
                        {inputs.installments}x de {fmtBRL(parcelaValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyWhatsApp()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                >
                  <Copy className="h-4 w-4" />
                  Copiar preço para WhatsApp
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Copia um texto pronto com PIX e cartão {inputs.installments}x.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}

