"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import InputField from "@/components/marketplaces/shopee/InputField";
import ResultCard from "@/components/marketplaces/tiktok/ResultCard";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";
import { PresetPicker, type PresetItem } from "@/components/marketplaces/shared/PresetPicker";
import { KitCostPicker } from "@/components/marketplaces/shared/KitCostPicker";
import { calcularPrecoTikTok, type TikTokInputs } from "@/lib/engines/tiktok/engine";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveMarketplaceProduct } from "@/lib/saveMarketplaceProduct";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useMarketplacePresets } from "@/hooks/useMarketplacePresets";

const DEFAULT_INPUTS: TikTokInputs = {
  fullCustoUnidade: 0,
  valorCompra: 25,
  custoEnvio: 1.5,
  isKit: false,
  kitQtd: 2,
  modo: "margem",
  metaLucroPercent: 20,
  precoTravado: 50,
  metaLucroRS: 10,
  tributacaoPercent: 0,
  participaSFP: true,
  comissaoAfiliadoPercent: 0,
  roasAlvo: 0,
  novoVendedorIsento: false,
  estimativaVendas: 100,
  referenciaPrecoMercado: 0,
};

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function round2(v: number) {
  return Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;
}

export default function TikTokCalculatorPage() {
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
  } = useMarketplacePresets<TikTokInputs>("tiktok");

  const [inputs, setInputs] = useState<TikTokInputs>(() => activePreset?.inputs ?? DEFAULT_INPUTS);
  const [nomeProduto, setNomeProduto] = useState("");
  const [showKitPicker, setShowKitPicker] = useState(false);

  const loadedPresetOnceRef = useRef(false);
  useEffect(() => {
    if (loadedPresetOnceRef.current) return;
    if (activePreset) {
      setInputs(activePreset.inputs);
      loadedPresetOnceRef.current = true;
    }
  }, [activePreset]);

  const handleSelectPreset = useCallback(
    (preset: PresetItem<TikTokInputs>) => {
      setInputs(preset.inputs);
      selectPresetId(preset.id);
      loadedPresetOnceRef.current = true;
    },
    [selectPresetId],
  );

  const handleSavePreset = useCallback(
    (name: string) => {
      savePreset(name, inputs);
    },
    [savePreset, inputs],
  );

  const lastCost = useMemo(() => {
    const c = lastResults?.custoTotalAjustado;
    return typeof c === "number" && Number.isFinite(c) ? c : null;
  }, [lastResults?.custoTotalAjustado]);

  const result = useMemo(() => {
    try {
      return calcularPrecoTikTok(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  const setField = useCallback(<K extends keyof TikTokInputs>(k: K, v: TikTokInputs[K]) => {
    setInputs((p) => ({ ...p, [k]: v }));
  }, []);

  const setNum = useCallback(
    (k: keyof TikTokInputs, v: number) => {
      const value = round2(v);
      if (k === "fullCustoUnidade") {
        setInputs((p) => ({ ...p, fullCustoUnidade: value, valorCompra: value > 0 ? 0 : p.valorCompra }));
        return;
      }
      if (k === "valorCompra") {
        setInputs((p) => ({ ...p, valorCompra: value, fullCustoUnidade: value > 0 ? 0 : p.fullCustoUnidade }));
        return;
      }
      setInputs((p) => ({ ...p, [k]: value } as TikTokInputs));
    },
    [],
  );

  const useLastCost = useCallback(() => {
    if (lastCost == null) return;
    setInputs((p) => ({ ...p, fullCustoUnidade: lastCost, valorCompra: 0 }));
    const suggestedName = typeof lastInput?.productName === "string" ? lastInput.productName.trim() : "";
    if (suggestedName && !nomeProduto.trim()) setNomeProduto(suggestedName);
  }, [lastCost, lastInput?.productName, nomeProduto]);

  async function handleSave() {
    if (!result) return;
    const customName = nomeProduto.trim();
    const name =
      customName ||
      "Simulação " +
        new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

    await saveMarketplaceProduct({
      payload: {
        name,
        weightGrams: 0,
        channelPrice: result.precoFinalSugerido,
        channelMarginPercent: Number.isFinite(result.margemReal) ? result.margemReal : null,
        marketplace: "TikTok Shop",
        totalCost: result.custoBase,
      },
      settings,
      user,
      addProduct,
      router,
    });
  }

  return (
    <div className="space-y-4">
      {/* Relatório de impressão (mesmo padrão da Venda Direta: usa a impressão nativa da página) */}
      <div className="hidden print:block">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <div className="text-sm font-bold text-slate-900">MAPH PRO 3D</div>
              <div className="text-xs text-slate-600">Calculadora de Precificação · TikTok Shop 2026</div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>{new Date().toLocaleString("pt-BR")}</div>
              {nomeProduto?.trim() ? <div>Produto: {nomeProduto.trim()}</div> : null}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">Resultado</div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-slate-600">Preço sugerido</div>
              <div className="text-right font-extrabold">{result ? brl(result.precoFinalSugerido) : "—"}</div>
              <div className="text-slate-600">Comissão TikTok Shop</div>
              <div className="text-right font-semibold">{result ? brl(result.valorComissao) : "—"}</div>
              <div className="text-slate-600">Frete (Programa Frete Grátis)</div>
              <div className="text-right font-semibold">{result ? brl(result.valorSFP) : "—"}</div>
              <div className="text-slate-600">Lucro real</div>
              <div className="text-right font-semibold">{result ? brl(result.lucroLiquido) : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="print:hidden space-y-4">
        <div className="glass-panel rounded-2xl p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Calculadora TikTok Shop
              </p>
              <p className="mt-1 text-sm text-slate-300">
                Comissão por faixa de preço, Programa de Frete Grátis (SFP), afiliados e Ads/GMV Max.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PresetPicker
                presets={presets}
                activeId={activePresetId}
                onSelect={handleSelectPreset}
                onSave={handleSavePreset}
                onDelete={removePreset}
                label="preset TikTok Shop"
              />
              <button
                type="button"
                onClick={() => {
                  setInputs(DEFAULT_INPUTS);
                  setNomeProduto("");
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
          <div className="space-y-4">
            <div className="glass-panel rounded-2xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Dados do produto
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={useLastCost}
                      disabled={lastCost == null}
                      className="rounded-xl px-3 py-2 text-xs font-semibold border border-cyan-500/25 text-cyan-200 bg-cyan-500/10 disabled:opacity-50"
                    >
                      Usar custo do último cálculo 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowKitPicker(true)}
                      className="rounded-xl px-3 py-2 text-xs font-semibold border border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-900"
                    >
                      Montar kit de produtos
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ProductNameAutocomplete
                    label="Nome do produto (opcional)"
                    value={nomeProduto}
                    onChange={setNomeProduto}
                    placeholder="Ex.: Chaveiro articulado"
                    className="sm:col-span-2"
                    onPick={(p) => {
                      setNomeProduto(p.name);
                      if (typeof p.totalCost === "number" && Number.isFinite(p.totalCost)) {
                        setNum("fullCustoUnidade", Number(p.totalCost ?? 0));
                      }
                    }}
                  />

                  <InputField
                    label="Custo 3D / unidade"
                    value={inputs.fullCustoUnidade}
                    onChange={(v) => setNum("fullCustoUnidade", v)}
                    prefix="R$"
                    hint="Custo final calculado no módulo de custo 3D (recomendado)."
                  />
                  <InputField
                    label="Valor de compra (fallback)"
                    value={inputs.valorCompra}
                    onChange={(v) => setNum("valorCompra", v)}
                    prefix="R$"
                    hint="Se o custo 3D estiver preenchido, este campo vira opcional."
                  />
                  <InputField
                    label="Custo de envio (embalagem)"
                    value={inputs.custoEnvio}
                    onChange={(v) => setNum("custoEnvio", v)}
                    prefix="R$"
                  />

                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <input
                      id="isKit"
                      type="checkbox"
                      checked={inputs.isKit}
                      onChange={(e) => setField("isKit", e.currentTarget.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <label htmlFor="isKit" className="text-sm text-slate-200">
                      É kit?
                    </label>
                  </div>
                  {inputs.isKit ? (
                    <InputField
                      label="Quantidade no kit"
                      value={inputs.kitQtd}
                      onChange={(v) => setNum("kitQtd", v)}
                      step={1}
                      min={1}
                    />
                  ) : (
                    <div />
                  )}

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 block mb-2">
                      Modo
                    </label>
                    <select
                      value={inputs.modo}
                      onChange={(e) => setField("modo", e.currentTarget.value as TikTokInputs["modo"])}
                      className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                    >
                      <option value="margem">Margem (%)</option>
                      <option value="lucroRS">Lucro (R$)</option>
                      <option value="precoTravado">Preço travado</option>
                    </select>
                  </div>

                  {inputs.modo === "margem" ? (
                    <InputField
                      label="Meta de lucro (%)"
                      value={inputs.metaLucroPercent}
                      onChange={(v) => setNum("metaLucroPercent", v)}
                      suffix="%"
                      step={0.1}
                    />
                  ) : inputs.modo === "lucroRS" ? (
                    <InputField
                      label="Meta de lucro (R$)"
                      value={inputs.metaLucroRS}
                      onChange={(v) => setNum("metaLucroRS", v)}
                      prefix="R$"
                    />
                  ) : (
                    <InputField
                      label="Preço travado (final)"
                      value={inputs.precoTravado}
                      onChange={(v) => setNum("precoTravado", v)}
                      prefix="R$"
                    />
                  )}

                  <InputField
                    label="Tributação (%)"
                    value={inputs.tributacaoPercent}
                    onChange={(v) => setNum("tributacaoPercent", v)}
                    suffix="%"
                    step={0.1}
                  />
                  <InputField
                    label="ROAS alvo (Ads/GMV Max)"
                    value={inputs.roasAlvo}
                    onChange={(v) => setNum("roasAlvo", v)}
                    step={0.1}
                    hint="Deixe 0 se não investe em Ads/GMV Max."
                  />

                  <InputField
                    label="Comissão de afiliado/criador (%)"
                    value={inputs.comissaoAfiliadoPercent}
                    onChange={(v) => setNum("comissaoAfiliadoPercent", v)}
                    suffix="%"
                    step={0.1}
                    hint="Definida por você, por SKU. 0 se não usa afiliados."
                  />
                  <InputField
                    label="Referência preço mercado"
                    value={inputs.referenciaPrecoMercado}
                    onChange={(v) => setNum("referenciaPrecoMercado", v)}
                    prefix="R$"
                  />

                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <input
                      id="participaSFP"
                      type="checkbox"
                      checked={inputs.participaSFP}
                      onChange={(e) => setField("participaSFP", e.currentTarget.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <label htmlFor="participaSFP" className="text-sm text-slate-200">
                      Participa do Programa de Frete Grátis (6%, teto R$50)
                    </label>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <input
                      id="novoVendedorIsento"
                      type="checkbox"
                      checked={inputs.novoVendedorIsento}
                      onChange={(e) => setField("novoVendedorIsento", e.currentTarget.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <label htmlFor="novoVendedorIsento" className="text-sm text-slate-200">
                      Comissão 0% (missão novo vendedor, até R$17k)
                    </label>
                  </div>

                  <InputField
                    label="Estimativa mensal (vendas)"
                    value={inputs.estimativaVendas}
                    onChange={(v) => setNum("estimativaVendas", v)}
                    step={1}
                    min={0}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={!result}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  Salvar produto
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <ResultCard result={result} productName={nomeProduto} />
            </div>
          </div>
        </div>
      <KitCostPicker
        open={showKitPicker}
        onClose={() => setShowKitPicker(false)}
        onConfirm={({ cost, name }) => {
          setNum("fullCustoUnidade", cost);
          if (name && !nomeProduto.trim()) setNomeProduto(name);
        }}
      />
    </div>
  );
}



