"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, Gauge, RotateCcw, Save, TrendingUp } from "lucide-react";
import InputField from "@/components/marketplaces/shopee/InputField";
import DiscountField from "@/components/marketplaces/shopee/DiscountField";
import ResultCard from "@/components/marketplaces/shopee/ResultCard";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";
import { PresetPicker, type PresetItem } from "@/components/marketplaces/shared/PresetPicker";
import { KitCostPicker } from "@/components/marketplaces/shared/KitCostPicker";
import {
  calcularPrecoShopee,
  formatBRL,
  formatPct,
  type ShopeeInputs,
} from "@/lib/engines/shopee/engine";
import { openPrintRoute } from "@/lib/printReport";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveMarketplaceProduct } from "@/lib/saveMarketplaceProduct";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useMarketplacePresets } from "@/hooks/useMarketplacePresets";

const DEFAULT_INPUTS: ShopeeInputs = {
  fullCustoUnidade: 0,
  valorCompra: 25,
  custoEnvio: 1.5,
  isKit: false,
  kitQtd: 2,
  modo: "margem",
  metaLucroPercent: 20,
  precoTravado: 50,
  metaLucroRS: 10,
  markupPercent: 70,
  tributacaoPercent: 0,
  roasAlvo: 13,
  promocaoPercent: 15,
  cupomLojaPercent: 0,
  cupomMaxRS: 0,
  ofertaRelampagoPercent: 0,
  campanhasDestaque: false,
  shopeeAcelera: "none",
  tipoVendedor: "cnpj",
  altaVolume: false,
  estimativaVendas: 100,
  referenciaPrecoMercado: 0,
};

type RankingStrategyKey = "agressivo" | "medio" | "pos";

type RankingStrategyPreset = Pick<
  ShopeeInputs,
  | "modo"
  | "metaLucroPercent"
  | "markupPercent"
  | "metaLucroRS"
  | "precoTravado"
  | "promocaoPercent"
  | "cupomLojaPercent"
  | "ofertaRelampagoPercent"
>;

const RANKING_STRATEGY_STORAGE_KEY = "maphpro3d-shopee-ranking-strategies";

const RANKING_STRATEGY_DEFAULTS: Record<RankingStrategyKey, RankingStrategyPreset> = {
  agressivo: {
    modo: "margem",
    metaLucroPercent: 0,
    markupPercent: 70,
    metaLucroRS: 10,
    precoTravado: 50,
    promocaoPercent: 10,
    cupomLojaPercent: 8,
    ofertaRelampagoPercent: 15,
  },
  medio: {
    modo: "margem",
    metaLucroPercent: 8,
    markupPercent: 70,
    metaLucroRS: 10,
    precoTravado: 50,
    promocaoPercent: 5,
    cupomLojaPercent: 4,
    ofertaRelampagoPercent: 5,
  },
  pos: {
    modo: "margem",
    metaLucroPercent: 20,
    markupPercent: 70,
    metaLucroRS: 10,
    precoTravado: 50,
    promocaoPercent: 0,
    cupomLojaPercent: 0,
    ofertaRelampagoPercent: 0,
  },
};

function describeRankingStrategy(p: RankingStrategyPreset) {
  const metaLabel =
    p.modo === "markup"
      ? `Markup ${p.markupPercent}%`
      : p.modo === "lucroRS"
        ? `Lucro ${p.metaLucroRS} R$`
        : p.modo === "precoTravado"
          ? `Preço travado R$${p.precoTravado}`
          : `Margem ${p.metaLucroPercent}%`;
  const parts = [metaLabel];
  if (p.promocaoPercent > 0) parts.push(`Promoção ${p.promocaoPercent}%`);
  if (p.cupomLojaPercent > 0) parts.push(`Cupom ${p.cupomLojaPercent}%`);
  if ((p.ofertaRelampagoPercent ?? 0) > 0) parts.push(`Oferta ${p.ofertaRelampagoPercent}%`);
  if (parts.length === 1) parts.push("sem descontos");
  return parts.join(" · ");
}

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

function round2(v: number) {
  return Math.round((Number.isFinite(v) ? v : 0) * 100) / 100;
}

export default function ShopeeCalculatorPage() {
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
  } = useMarketplacePresets<ShopeeInputs>("shopee");

  const [inputs, setInputs] = useState<ShopeeInputs>(() => activePreset?.inputs ?? DEFAULT_INPUTS);
  const [nomeProduto, setNomeProduto] = useState("");
  const [showKitPicker, setShowKitPicker] = useState(false);

  // Carrega o preset ativo assim que ele estiver disponível (ex.: sincronizou do Supabase
  // após o mount). Só uma vez, pra não sobrescrever edições feitas na sessão.
  const loadedPresetOnceRef = useRef(false);
  useEffect(() => {
    if (loadedPresetOnceRef.current) return;
    if (activePreset) {
      setInputs(activePreset.inputs);
      loadedPresetOnceRef.current = true;
    }
  }, [activePreset]);

  const handleSelectPreset = useCallback((preset: PresetItem<ShopeeInputs>) => {
    setInputs(preset.inputs);
    selectPresetId(preset.id);
    loadedPresetOnceRef.current = true;
  }, [selectPresetId]);

  const handleSavePreset = useCallback((name: string) => {
    savePreset(name, inputs);
  }, [savePreset, inputs]);

  const lastCost = useMemo(() => {
    const c = lastResults?.custoTotalAjustado;
    return typeof c === "number" && Number.isFinite(c) ? c : null;
  }, [lastResults?.custoTotalAjustado]);

  const result = useMemo(() => {
    try {
      return calcularPrecoShopee(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  // Cadeia de preços de referência para os campos %/R$: cadastro -> desconto normal (Promoção)
  // -> oferta relâmpago (substitui o desconto, não acumula) -> cupom (em cima do que estiver ativo).
  const discountChain = useMemo(() => {
    const p0 = result?.precoCadastroSugerido ?? 0;
    const comDesconto = p0 * (1 - (inputs.promocaoPercent || 0) / 100);
    const oferta = inputs.ofertaRelampagoPercent || 0;
    const precoAtivo = oferta > 0 ? p0 * (1 - oferta / 100) : comDesconto;
    return { p0, comDesconto, precoAtivo };
  }, [result?.precoCadastroSugerido, inputs.promocaoPercent, inputs.ofertaRelampagoPercent]);

  const set = useCallback(<K extends keyof ShopeeInputs>(k: K, v: ShopeeInputs[K]) => {
    setInputs((p) => ({ ...p, [k]: v }));
  }, []);

  const setNum = useCallback(
    (k: keyof ShopeeInputs, v: number) => {
      const value = round2(v);
      // Regra existente: se custo 3D estiver preenchido, não somar com valorCompra.
      if (k === "fullCustoUnidade") {
        setInputs((p) => ({ ...p, fullCustoUnidade: value, valorCompra: value > 0 ? 0 : p.valorCompra }));
        return;
      }
      if (k === "valorCompra") {
        setInputs((p) => ({ ...p, valorCompra: value, fullCustoUnidade: value > 0 ? 0 : p.fullCustoUnidade }));
        return;
      }
      setInputs((p) => ({ ...p, [k]: value } as ShopeeInputs));
    },
    [],
  );

  const useLastCost = useCallback(() => {
    if (lastCost == null) return;
    setInputs((p) => ({
      ...p,
      fullCustoUnidade: lastCost,
      // não duplicar: `valorCompra` só é usado se `fullCustoUnidade` estiver zerado
      valorCompra: 0,
    }));
    const suggestedName =
      typeof lastInput?.productName === "string" ? lastInput.productName.trim() : "";
    if (suggestedName && !nomeProduto.trim()) setNomeProduto(suggestedName);
  }, [lastCost, lastInput?.productName, nomeProduto]);

  const [rankingStrategies, setRankingStrategies] = useState<Record<RankingStrategyKey, RankingStrategyPreset>>(
    RANKING_STRATEGY_DEFAULTS,
  );
  const [savedStrategyFlash, setSavedStrategyFlash] = useState<RankingStrategyKey | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RANKING_STRATEGY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<RankingStrategyKey, Partial<RankingStrategyPreset>>>;
      setRankingStrategies((prev) => {
        const next = { ...prev };
        (Object.keys(parsed) as RankingStrategyKey[]).forEach((key) => {
          const saved = parsed[key];
          // Mescla com o padrão daquela estratégia — saves antigos (antes do campo
          // "modo" existir) não quebram, só caem no padrão pros campos que faltam.
          if (saved) next[key] = { ...RANKING_STRATEGY_DEFAULTS[key], ...saved };
        });
        return next;
      });
    } catch {
      // localStorage indisponível ou JSON inválido — mantém os padrões.
    }
  }, []);

  const applyRankingStrategy = useCallback(
    (strategy: RankingStrategyKey) => {
      setInputs((prev) => ({ ...prev, ...rankingStrategies[strategy] }));
    },
    [rankingStrategies],
  );

  const saveRankingStrategy = useCallback(
    (strategy: RankingStrategyKey) => {
      const captured: RankingStrategyPreset = {
        modo: inputs.modo,
        metaLucroPercent: inputs.metaLucroPercent,
        markupPercent: inputs.markupPercent,
        metaLucroRS: inputs.metaLucroRS,
        precoTravado: inputs.precoTravado,
        promocaoPercent: inputs.promocaoPercent,
        cupomLojaPercent: inputs.cupomLojaPercent,
        ofertaRelampagoPercent: inputs.ofertaRelampagoPercent ?? 0,
      };
      setRankingStrategies((prev) => {
        const next = { ...prev, [strategy]: captured };
        try {
          window.localStorage.setItem(RANKING_STRATEGY_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // localStorage indisponível — mantém só em memória nesta sessão.
        }
        return next;
      });
      setSavedStrategyFlash(strategy);
      setTimeout(() => setSavedStrategyFlash((s) => (s === strategy ? null : s)), 1500);
    },
    [
      inputs.modo,
      inputs.metaLucroPercent,
      inputs.markupPercent,
      inputs.metaLucroRS,
      inputs.precoTravado,
      inputs.promocaoPercent,
      inputs.cupomLojaPercent,
      inputs.ofertaRelampagoPercent,
    ],
  );

  async function handleSave() {
    if (!result) return;
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
        channelPrice: result.precoFinalSugerido,
        channelMarginPercent: Number.isFinite(result.margemReal) ? result.margemReal : null,
        marketplace: "Shopee",
        suggestedPriceShopee: result.precoFinalSugerido,
        totalCost: result.custoBase,
        printTimeMinutes:
          typeof lastResults?.printHoursPerUnit === "number" && lastResults.printHoursPerUnit > 0
            ? Math.round(lastResults.printHoursPerUnit * 60)
            : null,
      },
      settings,
      user,
      addProduct,
      router,
    });
  }

  return (
    <div className="space-y-4">
      {/* Relatório de impressão (PDF) – estilo “calculadora externa” */}
      <div className="hidden print:block">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <div className="text-sm font-bold text-slate-900">MAPH PRO 3D</div>
              <div className="text-xs text-slate-600">
                Calculadora de Precificação · Shopee 2026
              </div>
            </div>
            <div className="text-right text-xs text-slate-600">
              <div>{new Date().toLocaleString("pt-BR")}</div>
              {nomeProduto?.trim() ? <div>Produto: {nomeProduto.trim()}</div> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Dados do produto
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-600">Custo 3D / unidade</div>
                <div className="text-right font-semibold">{brl(inputs.fullCustoUnidade)}</div>
                <div className="text-slate-600">Valor de compra (fallback)</div>
                <div className="text-right font-semibold">{brl(inputs.valorCompra)}</div>
                <div className="text-slate-600">Custo de envio</div>
                <div className="text-right font-semibold">{brl(inputs.custoEnvio)}</div>
                <div className="text-slate-600">Kit</div>
                <div className="text-right font-semibold">
                  {inputs.isKit ? `Sim (${inputs.kitQtd} un.)` : "Não"}
                </div>
                <div className="text-slate-600">Tributação</div>
                <div className="text-right font-semibold">{pct(inputs.tributacaoPercent)}</div>
                <div className="text-slate-600">ROAS alvo</div>
                <div className="text-right font-semibold">x{inputs.roasAlvo.toFixed(1)}</div>
                <div className="text-slate-600">Promoção</div>
                <div className="text-right font-semibold">{pct(inputs.promocaoPercent)}</div>
                <div className="text-slate-600">Cupom loja</div>
                <div className="text-right font-semibold">
                  {pct(inputs.cupomLojaPercent)}
                  {inputs.cupomMaxRS ? ` (máx. ${brl(inputs.cupomMaxRS)})` : ""}
                </div>
                <div className="text-slate-600">Oferta relâmpago</div>
                <div className="text-right font-semibold">{pct(inputs.ofertaRelampagoPercent ?? 0)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Configuração Shopee
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-600">Tipo vendedor</div>
                <div className="text-right font-semibold">{inputs.tipoVendedor.toUpperCase()}</div>
                <div className="text-slate-600">Alta volume (CPF)</div>
                <div className="text-right font-semibold">{inputs.altaVolume ? "Sim" : "Não"}</div>
                <div className="text-slate-600">Campanhas destaque</div>
                <div className="text-right font-semibold">
                  {inputs.campanhasDestaque ? "Ativo" : "Inativo"}
                </div>
                <div className="text-slate-600">Shopee Acelera</div>
                <div className="text-right font-semibold">{inputs.shopeeAcelera}</div>
                <div className="text-slate-600">Estimativa mensal</div>
                <div className="text-right font-semibold">{inputs.estimativaVendas} vendas</div>
                <div className="text-slate-600">Referência mercado</div>
                <div className="text-right font-semibold">{brl(inputs.referenciaPrecoMercado)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
              Resultado (sem lucro)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-slate-600">Preço para cadastrar na Shopee</div>
              <div className="text-right font-extrabold">
                {result ? brl(result.precoCadastroSugerido) : "—"}
              </div>
              <div className="text-slate-600">Preço final ao cliente</div>
              <div className="text-right font-semibold">
                {result ? brl(result.precoFinalSugerido) : "—"}
              </div>
              <div className="text-slate-600">Comissão (estimada)</div>
              <div className="text-right font-semibold">
                {result ? brl(result.valorComissao) : "—"}
              </div>
              <div className="text-slate-600">Taxa de transação (2%)</div>
              <div className="text-right font-semibold">
                {result ? brl(result.custoTaxaTransacao) : "—"}
              </div>
              <div className="text-slate-600">Ads (estimado)</div>
              <div className="text-right font-semibold">{result ? brl(result.custoAds) : "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* UI normal (tela) */}
      <div className="print:hidden space-y-4">
      <div className="glass-panel rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Calculadora Shopee
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Precificação avançada com foco em comissão por faixa, descontos e ROAS.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PresetPicker
              presets={presets}
              activeId={activePresetId}
              onSelect={handleSelectPreset}
              onSave={handleSavePreset}
              onDelete={removePreset}
              label="preset Shopee"
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

        <div className="glass-panel rounded-2xl p-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Estratégia de Ranqueamento
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Aplica de uma vez a meta de lucro e os descontos (promoção, cupom, oferta relâmpago) para empurrar o ranqueamento do produto na Shopee. Ajuste os campos abaixo como quiser e clique no ícone de salvar do card pra guardar seus próprios valores nesse botão.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-left transition hover:bg-rose-500/15">
              <button
                type="button"
                onClick={() => applyRankingStrategy("agressivo")}
                className="absolute inset-0 rounded-xl"
                aria-label="Aplicar estratégia Agressivo"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  saveRankingStrategy("agressivo");
                }}
                title="Salvar os valores atuais dos campos nesse botão"
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-slate-500 opacity-60 transition hover:bg-slate-900/60 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
              >
                {savedStrategyFlash === "agressivo" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="pointer-events-none inline-flex items-center gap-1.5 text-sm font-semibold text-rose-300">
                <Flame className="h-4 w-4" /> Agressivo
              </span>
              <span className="pointer-events-none text-xs text-slate-400">
                {describeRankingStrategy(rankingStrategies.agressivo)}
              </span>
            </div>
            <div className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-left transition hover:bg-amber-500/15">
              <button
                type="button"
                onClick={() => applyRankingStrategy("medio")}
                className="absolute inset-0 rounded-xl"
                aria-label="Aplicar estratégia Médio"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  saveRankingStrategy("medio");
                }}
                title="Salvar os valores atuais dos campos nesse botão"
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-slate-500 opacity-60 transition hover:bg-slate-900/60 hover:text-amber-300 focus:opacity-100 group-hover:opacity-100"
              >
                {savedStrategyFlash === "medio" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="pointer-events-none inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300">
                <Gauge className="h-4 w-4" /> Médio
              </span>
              <span className="pointer-events-none text-xs text-slate-400">
                {describeRankingStrategy(rankingStrategies.medio)}
              </span>
            </div>
            <div className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-left transition hover:bg-emerald-500/15">
              <button
                type="button"
                onClick={() => applyRankingStrategy("pos")}
                className="absolute inset-0 rounded-xl"
                aria-label="Aplicar estratégia Pós-Ranqueamento"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  saveRankingStrategy("pos");
                }}
                title="Salvar os valores atuais dos campos nesse botão"
                className="absolute right-2 top-2 z-10 rounded-md p-1 text-slate-500 opacity-60 transition hover:bg-slate-900/60 hover:text-emerald-300 focus:opacity-100 group-hover:opacity-100"
              >
                {savedStrategyFlash === "pos" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
              </button>
              <span className="pointer-events-none inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-300">
                <TrendingUp className="h-4 w-4" /> Pós-Ranqueamento
              </span>
              <span className="pointer-events-none text-xs text-slate-400">
                {describeRankingStrategy(rankingStrategies.pos)}
              </span>
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
                  <p className="mt-1 text-xs text-slate-500">
                    Custos, descontos e marketing (conforme o PDF).
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
                  label="Valor de compra (custo unitário)"
                  value={inputs.valorCompra}
                  onChange={(v) => setNum("valorCompra", v)}
                  prefix="R$"
                  hint="Se o custo 3D estiver preenchido, este campo vira opcional."
                />
                <InputField
                  label="Custo de envio"
                  value={inputs.custoEnvio}
                  onChange={(v) => setNum("custoEnvio", v)}
                  prefix="R$"
                />

                <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                  <input
                    id="isKit"
                    type="checkbox"
                    checked={inputs.isKit}
                    onChange={(e) => set("isKit", e.currentTarget.checked)}
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
                    onChange={(e) => set("modo", e.currentTarget.value as ShopeeInputs["modo"])}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="margem">Margem (%)</option>
                    <option value="markup">Markup sobre custo (%)</option>
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
                ) : inputs.modo === "markup" ? (
                  <InputField
                    label="Cadastrar X% acima do custo"
                    value={inputs.markupPercent}
                    onChange={(v) => setNum("markupPercent", v)}
                    suffix="%"
                    step={1}
                    hint="Cadastro = custo total (produto + envio + comissão/taxas Shopee) + esse %. Não garante margem — use a margem mínima como só um alerta."
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

                {inputs.modo !== "margem" && (
                  <InputField
                    label="Margem mínima desejada (%)"
                    value={inputs.metaLucroPercent}
                    onChange={(v) => setNum("metaLucroPercent", v)}
                    suffix="%"
                    step={0.1}
                    hint="Só gera alerta se a margem real ficar abaixo — não afeta o preço nesse modo."
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
                  label="ROAS alvo"
                  value={inputs.roasAlvo}
                  onChange={(v) => setNum("roasAlvo", v)}
                  step={0.1}
                />

                {inputs.modo === "margem" && (
                  <div className="sm:col-span-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 text-xs text-amber-200/90">
                    No modo Margem, o preço final e o lucro ficam sempre travados na meta —
                    os descontos abaixo só mudam quanto cadastrar, não o que o cliente paga.
                    Pra ver o lucro cair de verdade com o desconto, use o modo Markup.
                  </div>
                )}

                <DiscountField
                  label="Desconto"
                  percent={inputs.promocaoPercent}
                  onPercentChange={(v) => setNum("promocaoPercent", v)}
                  referencePrice={discountChain.p0}
                  allowValorMode={inputs.modo !== "margem"}
                />
                <DiscountField
                  label="Oferta relâmpago"
                  percent={inputs.ofertaRelampagoPercent ?? 0}
                  onPercentChange={(v) => setNum("ofertaRelampagoPercent", v)}
                  referencePrice={discountChain.p0}
                  ceilingPrice={discountChain.comDesconto}
                  ceilingHint="do desconto normal (não acumula com ele, substitui)"
                  allowValorMode={inputs.modo !== "margem"}
                />
                <DiscountField
                  label="Cupom loja"
                  percent={inputs.cupomLojaPercent}
                  onPercentChange={(v) => setNum("cupomLojaPercent", v)}
                  referencePrice={discountChain.precoAtivo}
                  allowValorMode={inputs.modo !== "margem"}
                />
                <InputField
                  label="Teto do cupom"
                  value={inputs.cupomMaxRS ?? 0}
                  onChange={(v) => setNum("cupomMaxRS", v)}
                  prefix="R$"
                  placeholder="Sem limite"
                  hint="Ex.: cupom de 5%, até R$10 — deixe 0 pra não limitar."
                />

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 text-neutral-500 dark:text-ink-200">
                    Campanhas destaque
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={inputs.campanhasDestaque}
                      onChange={(e) => set("campanhasDestaque", e.currentTarget.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <span className="text-sm text-slate-200">Ativar (3,5% do preço)</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 text-neutral-500 dark:text-ink-200">
                    Shopee Acelera
                  </label>
                  <select
                    value={inputs.shopeeAcelera}
                    onChange={(e) =>
                      set(
                        "shopeeAcelera",
                        e.currentTarget.value as ShopeeInputs["shopeeAcelera"],
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="none">Nenhum</option>
                    <option value="loja-oficial">Loja oficial</option>
                    <option value="vendedor-indicado">Vendedor indicado</option>
                    <option value="demais">Demais</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 text-neutral-500 dark:text-ink-200">
                    Tipo vendedor
                  </label>
                  <select
                    value={inputs.tipoVendedor}
                    onChange={(e) =>
                      set(
                        "tipoVendedor",
                        e.currentTarget.value as ShopeeInputs["tipoVendedor"],
                      )
                    }
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="cnpj">CNPJ</option>
                    <option value="cpf">CPF</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase tracking-wide mb-1 text-neutral-500 dark:text-ink-200">
                    Alta volume (CPF)
                  </label>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={inputs.altaVolume}
                      onChange={(e) => set("altaVolume", e.currentTarget.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <span className="text-sm text-slate-200">+R$3 taxa fixa por venda</span>
                  </div>
                </div>

                <InputField
                  label="Referência preço mercado"
                  value={inputs.referenciaPrecoMercado}
                  onChange={(v) => setNum("referenciaPrecoMercado", v)}
                  prefix="R$"
                />
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
            <ResultCard
              result={result}
              productName={nomeProduto}
              onPrint={() => {
                openPrintRoute({ kind: "shopee", productName: nomeProduto, inputs, result });
              }}
            />
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

