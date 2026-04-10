"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Save } from "lucide-react";
import InputField from "@/components/marketplaces/shopee/InputField";
import ResultCard from "@/components/marketplaces/shopee/ResultCard";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";
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
  tributacaoPercent: 0,
  roasAlvo: 13,
  promocaoPercent: 15,
  cupomLojaPercent: 0,
  campanhasDestaque: false,
  shopeeAcelera: "none",
  tipoVendedor: "cnpj",
  altaVolume: false,
  estimativaVendas: 100,
  referenciaPrecoMercado: 0,
};

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

export default function ShopeeCalculatorPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const lastResults = useCalculatorStore((s) => s.lastResults);
  const lastInput = useCalculatorStore((s) => s.lastInput);

  const [inputs, setInputs] = useState<ShopeeInputs>(DEFAULT_INPUTS);
  const [nomeProduto, setNomeProduto] = useState("");

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

  const set = useCallback(
    <K extends keyof ShopeeInputs>(k: K, v: ShopeeInputs[K]) => {
      setInputs((p) => ({ ...p, [k]: v }));
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
                <div className="text-right font-semibold">{pct(inputs.cupomLojaPercent)}</div>
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
                <button
                  type="button"
                  onClick={useLastCost}
                  disabled={lastCost == null}
                  className="rounded-xl px-3 py-2 text-xs font-semibold border border-cyan-500/25 text-cyan-200 bg-cyan-500/10 disabled:opacity-50"
                >
                  Usar custo do último cálculo 3D
                </button>
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
                      setInputs((prev) => ({
                        ...prev,
                        fullCustoUnidade: Number(p.totalCost ?? 0),
                        // não duplicar: `valorCompra` só é usado se `fullCustoUnidade` estiver zerado
                        valorCompra: 0,
                      }));
                    }
                  }}
                />

                <InputField
                  label="Custo 3D / unidade"
                  value={inputs.fullCustoUnidade}
                  onChange={(v) => set("fullCustoUnidade", v)}
                  prefix="R$"
                  hint="Custo final calculado no módulo de custo 3D (recomendado)."
                />
                <InputField
                  label="Valor de compra (custo unitário)"
                  value={inputs.valorCompra}
                  onChange={(v) => set("valorCompra", v)}
                  prefix="R$"
                  hint="Se o custo 3D estiver preenchido, este campo vira opcional."
                />
                <InputField
                  label="Custo de envio"
                  value={inputs.custoEnvio}
                  onChange={(v) => set("custoEnvio", v)}
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
                    onChange={(v) => set("kitQtd", v)}
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
                    <option value="lucroRS">Lucro (R$)</option>
                    <option value="precoTravado">Preço travado</option>
                  </select>
                </div>

                {inputs.modo === "margem" ? (
                  <InputField
                    label="Meta de lucro (%)"
                    value={inputs.metaLucroPercent}
                    onChange={(v) => set("metaLucroPercent", v)}
                    suffix="%"
                    step={0.1}
                  />
                ) : inputs.modo === "lucroRS" ? (
                  <InputField
                    label="Meta de lucro (R$)"
                    value={inputs.metaLucroRS}
                    onChange={(v) => set("metaLucroRS", v)}
                    prefix="R$"
                  />
                ) : (
                  <InputField
                    label="Preço travado (final)"
                    value={inputs.precoTravado}
                    onChange={(v) => set("precoTravado", v)}
                    prefix="R$"
                  />
                )}

                <InputField
                  label="Tributação (%)"
                  value={inputs.tributacaoPercent}
                  onChange={(v) => set("tributacaoPercent", v)}
                  suffix="%"
                  step={0.1}
                />
                <InputField
                  label="ROAS alvo"
                  value={inputs.roasAlvo}
                  onChange={(v) => set("roasAlvo", v)}
                  step={0.1}
                />

                <InputField
                  label="Promoção (%)"
                  value={inputs.promocaoPercent}
                  onChange={(v) => set("promocaoPercent", v)}
                  suffix="%"
                  step={0.1}
                />
                <InputField
                  label="Cupom loja (%)"
                  value={inputs.cupomLojaPercent}
                  onChange={(v) => set("cupomLojaPercent", v)}
                  suffix="%"
                  step={0.1}
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
                  onChange={(v) => set("referenciaPrecoMercado", v)}
                  prefix="R$"
                />
                <InputField
                  label="Estimativa mensal (vendas)"
                  value={inputs.estimativaVendas}
                  onChange={(v) => set("estimativaVendas", v)}
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
    </div>
  );
}

