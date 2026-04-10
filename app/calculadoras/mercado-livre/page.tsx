"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, RotateCcw } from "lucide-react";
import { calcularPrecoML, type MlInputs } from "@/lib/engines/ml/engine";
import InputField from "@/components/marketplaces/ml/InputField";
import ResultCard from "@/components/marketplaces/ml/ResultCard";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveMarketplaceProduct } from "@/lib/saveMarketplaceProduct";
import { useCalculatorStore } from "@/store/calculatorStore";
import { openPrintRoute } from "@/lib/printReport";

const DEFAULT_INPUTS: MlInputs = {
  valorCompra: 25,
  custoEnvioMaterial: 1.5,
  custosFixos: 0,
  custosOperacionaisPercent: 0,
  notaFiscalPercent: 0,
  fullCustoUnidade: 0,
  tipoAnuncio: "classico",
  comissaoPercent: 12,
  formaEnvio: "mercado-envios",
  categoriaFixa: "geral",
  categoriaEspecial: false,
  alimentosAnimais: false,
  reputacao: "verde",
  peso: 0.4,
  comprimento: 20,
  largura: 15,
  altura: 10,
  modo: "margem",
  metaLucroPercent: 20,
  precoTravado: 79,
  metaLucroRS: 10,
  modoAds: "roas",
  roasAlvo: 10,
  acosPercent: 0,
  tacosPercent: 4,
  proporcaoOrganica: 50,
  promocaoPercent: 0,
  cupomLojaPercent: 0,
  ofertaRelampago: false,
  estimativaVendas: 100,
};

function brl(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

export default function MercadoLivreCalculatorPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const lastResults = useCalculatorStore((s) => s.lastResults);
  const lastInput = useCalculatorStore((s) => s.lastInput);

  const [inputs, setInputs] = useState<MlInputs>(DEFAULT_INPUTS);
  const [nomeProduto, setNomeProduto] = useState("");

  // Puxa custo real ajustado da calculadora de custo 3D do SaaS
  const lastCost = useMemo(() => {
    const c = lastResults?.custoTotalAjustado;
    return typeof c === "number" && Number.isFinite(c) ? c : null;
  }, [lastResults?.custoTotalAjustado]);

  const result = useMemo(() => {
    try {
      return calcularPrecoML(inputs);
    } catch {
      return null;
    }
  }, [inputs]);

  const profitOk = (result?.lucro ?? 0) > 0;

  const setNum = useCallback(
    (key: keyof MlInputs, value: number) => {
      setInputs((p) => ({ ...p, [key]: value } as MlInputs));
    },
    [],
  );

  const setAny = useCallback(
    <K extends keyof MlInputs>(key: K, value: MlInputs[K]) => {
      setInputs((p) => ({ ...p, [key]: value }));
    },
    [],
  );

  const useLastCost = useCallback(() => {
    if (lastCost == null) return;
    setInputs((p) => ({ ...p, fullCustoUnidade: lastCost }));
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

    const totalCost = result.custoBase;
    const margin = result.margem;

    await saveMarketplaceProduct({
      payload: {
        name,
        weightGrams: 0,
        channelPrice: result.precoFinal,
        channelMarginPercent: Number.isFinite(margin) ? margin : null,
        marketplace: "Mercado Livre",
        suggestedPriceML: result.precoFinal,
        suggestedPriceShopee: undefined,
        suggestedPriceDirect: undefined,
        totalCost,
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
                Calculadora de Precificação · Mercado Livre 2026
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
                <div className="text-slate-600">Custo de compra</div>
                <div className="text-right font-semibold">{brl(inputs.valorCompra)}</div>
                <div className="text-slate-600">Material de envio</div>
                <div className="text-right font-semibold">{brl(inputs.custoEnvioMaterial)}</div>
                <div className="text-slate-600">Custos fixos / unidade</div>
                <div className="text-right font-semibold">{brl(inputs.custosFixos)}</div>
                <div className="text-slate-600">Nota fiscal</div>
                <div className="text-right font-semibold">{pct(inputs.notaFiscalPercent)}</div>
                <div className="text-slate-600">Custos operacionais</div>
                <div className="text-right font-semibold">
                  {pct(inputs.custosOperacionaisPercent)}
                </div>
                <div className="text-slate-600">Estimativa mensal</div>
                <div className="text-right font-semibold">{inputs.estimativaVendas} vendas</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Configuração do anúncio
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-600">Tipo anúncio</div>
                <div className="text-right font-semibold">
                  {inputs.tipoAnuncio === "premium" ? "Premium" : "Clássico"}
                </div>
                <div className="text-slate-600">Comissão</div>
                <div className="text-right font-semibold">{pct(inputs.comissaoPercent)}</div>
                <div className="text-slate-600">Forma de envio</div>
                <div className="text-right font-semibold">{inputs.formaEnvio}</div>
                <div className="text-slate-600">Categoria taxa fixa</div>
                <div className="text-right font-semibold">{inputs.categoriaFixa}</div>
                <div className="text-slate-600">Reputação</div>
                <div className="text-right font-semibold">{inputs.reputacao}</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Dimensões e peso
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-600">Peso</div>
                <div className="text-right font-semibold">{inputs.peso} kg</div>
                <div className="text-slate-600">Dimensões</div>
                <div className="text-right font-semibold">
                  {inputs.comprimento}×{inputs.largura}×{inputs.altura} cm
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
                Marketing (Ads + promoções)
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-slate-600">Modo Ads</div>
                <div className="text-right font-semibold">{inputs.modoAds}</div>
                <div className="text-slate-600">ROAS alvo</div>
                <div className="text-right font-semibold">x{inputs.roasAlvo.toFixed(1)}</div>
                <div className="text-slate-600">TACOS meta</div>
                <div className="text-right font-semibold">{pct(inputs.tacosPercent)}</div>
                <div className="text-slate-600">Orgânico</div>
                <div className="text-right font-semibold">{pct(inputs.proporcaoOrganica)}</div>
                <div className="text-slate-600">Promoção</div>
                <div className="text-right font-semibold">{pct(inputs.promocaoPercent)}</div>
                <div className="text-slate-600">Cupom loja</div>
                <div className="text-right font-semibold">{pct(inputs.cupomLojaPercent)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-700">
              Resultado (sem lucro)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="text-slate-600">Preço para cadastrar no ML</div>
              <div className="text-right font-extrabold">
                {result ? brl(result.precoFinal) : "—"}
              </div>
              <div className="text-slate-600">Preço ao cliente (após descontos)</div>
              <div className="text-right font-semibold">
                {result ? brl(result.precoCliente) : "—"}
              </div>
              <div className="text-slate-600">Total de custos + taxas</div>
              <div className="text-right font-semibold">
                {result
                  ? brl(
                      result.custoBase +
                        result.custos.comissao +
                        result.custos.taxaFixa +
                        result.custos.frete +
                        result.custos.ads +
                        result.custos.nf +
                        result.custos.opsPercent +
                        result.custos.promo +
                        result.custos.cupom +
                        result.custos.oferta,
                    )
                  : "—"}
              </div>
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
              Calculadora Mercado Livre
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Precificação avançada com foco em taxas, frete e marketing.
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
                    Preencha custos, anúncio, dimensões e marketing (como no PDF).
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
                  placeholder="Ex.: Suporte de controle"
                  onPick={(p) => {
                    setNomeProduto(p.name);
                    if (typeof p.totalCost === "number" && Number.isFinite(p.totalCost)) {
                      setInputs((prev) => ({
                        ...prev,
                        fullCustoUnidade: Number(p.totalCost ?? 0),
                      }));
                    }
                  }}
                />

                <InputField
                  label="Custo 3D / unidade"
                  type="number"
                  value={inputs.fullCustoUnidade}
                  onChange={(e) => setNum("fullCustoUnidade", parseFloat(e.currentTarget.value) || 0)}
                  prefix="R$"
                  hint="Custo final calculado no módulo de custo 3D."
                />

                <InputField
                  label="Custo de compra"
                  type="number"
                  value={inputs.valorCompra}
                  onChange={(e) => setNum("valorCompra", parseFloat(e.currentTarget.value) || 0)}
                  prefix="R$"
                  hint="Preço pago ao fornecedor."
                />

                <InputField
                  label="Material de envio"
                  type="number"
                  value={inputs.custoEnvioMaterial}
                  onChange={(e) =>
                    setNum("custoEnvioMaterial", parseFloat(e.currentTarget.value) || 0)
                  }
                  prefix="R$"
                  hint="Caixas, plástico, etiqueta..."
                />

                <InputField
                  label="Custos fixos / unidade"
                  type="number"
                  value={inputs.custosFixos}
                  onChange={(e) => setNum("custosFixos", parseFloat(e.currentTarget.value) || 0)}
                  prefix="R$"
                />

                <InputField
                  label="Nota fiscal (%)"
                  type="number"
                  value={inputs.notaFiscalPercent}
                  onChange={(e) =>
                    setNum("notaFiscalPercent", parseFloat(e.currentTarget.value) || 0)
                  }
                  suffix="%"
                />

                <InputField
                  label="Custos operacionais (%)"
                  type="number"
                  value={inputs.custosOperacionaisPercent}
                  onChange={(e) =>
                    setNum(
                      "custosOperacionaisPercent",
                      parseFloat(e.currentTarget.value) || 0,
                    )
                  }
                  suffix="%"
                />

                <InputField
                  label="Estimativa mensal (vendas)"
                  type="number"
                  value={inputs.estimativaVendas}
                  onChange={(e) =>
                    setNum("estimativaVendas", parseFloat(e.currentTarget.value) || 0)
                  }
                />

                <InputField
                  label="Comissão (%)"
                  type="number"
                  value={inputs.comissaoPercent}
                  onChange={(e) => setNum("comissaoPercent", parseFloat(e.currentTarget.value) || 0)}
                  suffix="%"
                />

                <InputField label="Forma de envio">
                  <select
                    value={inputs.formaEnvio}
                    onChange={(e) =>
                      setAny("formaEnvio", e.currentTarget.value as MlInputs["formaEnvio"])
                    }
                    className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="mercado-envios">Mercado Envios</option>
                    <option value="full">Full</option>
                    <option value="flex-proximo">Flex (próximo)</option>
                    <option value="flex-medio">Flex (médio)</option>
                    <option value="flex-distante">Flex (distante)</option>
                  </select>
                </InputField>

                <InputField label="Tipo de anúncio">
                  <select
                    value={inputs.tipoAnuncio}
                    onChange={(e) => setAny("tipoAnuncio", e.currentTarget.value as MlInputs["tipoAnuncio"])}
                    className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="classico">Clássico</option>
                    <option value="premium">Premium</option>
                  </select>
                </InputField>

                <InputField label="Modo de cálculo">
                  <select
                    value={inputs.modo}
                    onChange={(e) => setAny("modo", e.currentTarget.value as MlInputs["modo"])}
                    className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="margem">Margem (%)</option>
                    <option value="lucroRS">Lucro (R$)</option>
                    <option value="precoTravado">Preço travado</option>
                  </select>
                </InputField>

                {inputs.modo === "margem" ? (
                  <InputField
                    label="Meta de lucro (%)"
                    type="number"
                    value={inputs.metaLucroPercent}
                    onChange={(e) =>
                      setNum("metaLucroPercent", parseFloat(e.currentTarget.value) || 0)
                    }
                    suffix="%"
                  />
                ) : inputs.modo === "lucroRS" ? (
                  <InputField
                    label="Meta de lucro (R$)"
                    type="number"
                    value={inputs.metaLucroRS}
                    onChange={(e) => setNum("metaLucroRS", parseFloat(e.currentTarget.value) || 0)}
                    prefix="R$"
                  />
                ) : (
                  <InputField
                    label="Preço travado (cliente)"
                    type="number"
                    value={inputs.precoTravado}
                    onChange={(e) =>
                      setNum("precoTravado", parseFloat(e.currentTarget.value) || 0)
                    }
                    prefix="R$"
                  />
                )}

                <InputField label="Categoria taxa fixa (<R$79)">
                  <select
                    value={inputs.categoriaFixa}
                    onChange={(e) =>
                      setAny(
                        "categoriaFixa",
                        e.currentTarget.value as MlInputs["categoriaFixa"],
                      )
                    }
                    className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="geral">Geral</option>
                    <option value="livros">Livros</option>
                    <option value="supermercado">Supermercado</option>
                  </select>
                </InputField>

                <InputField label="Reputação">
                  <select
                    value={inputs.reputacao}
                    onChange={(e) =>
                      setAny("reputacao", e.currentTarget.value as MlInputs["reputacao"])
                    }
                    className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                  >
                    <option value="verde">MercadoLíder / Verde</option>
                    <option value="amarelo">Amarela</option>
                    <option value="vermelho">Vermelha</option>
                    <option value="sem">Sem reputação</option>
                  </select>
                </InputField>

                <InputField label="Opções especiais">
                  <div className="grid grid-cols-1 gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={inputs.categoriaEspecial}
                        onChange={(e) => setAny("categoriaEspecial", e.currentTarget.checked)}
                      />
                      Categoria especial
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={inputs.alimentosAnimais}
                        onChange={(e) => setAny("alimentosAnimais", e.currentTarget.checked)}
                      />
                      Alimentos para animais
                    </label>
                  </div>
                </InputField>

                <InputField
                  label="Peso (kg)"
                  type="number"
                  value={inputs.peso}
                  onChange={(e) => setNum("peso", parseFloat(e.currentTarget.value) || 0)}
                  step={0.01}
                />
                <InputField
                  label="Comprimento (cm)"
                  type="number"
                  value={inputs.comprimento}
                  onChange={(e) =>
                    setNum("comprimento", parseFloat(e.currentTarget.value) || 0)
                  }
                />
                <InputField
                  label="Largura (cm)"
                  type="number"
                  value={inputs.largura}
                  onChange={(e) => setNum("largura", parseFloat(e.currentTarget.value) || 0)}
                />
                <InputField
                  label="Altura (cm)"
                  type="number"
                  value={inputs.altura}
                  onChange={(e) => setNum("altura", parseFloat(e.currentTarget.value) || 0)}
                />

                <div className="sm:col-span-2 mt-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Central de Marketing (Ads + Promoções)
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Modo Ads">
                      <select
                        value={inputs.modoAds}
                        onChange={(e) =>
                          setAny("modoAds", e.currentTarget.value as MlInputs["modoAds"])
                        }
                        className="w-full rounded-xl border bg-slate-950/40 border-slate-800 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 focus:border-cyan-500/25"
                      >
                        <option value="roas">ROAS</option>
                        <option value="tacos">TACOS</option>
                      </select>
                    </InputField>
                    <InputField
                      label="ROAS alvo"
                      type="number"
                      value={inputs.roasAlvo}
                      onChange={(e) =>
                        setNum("roasAlvo", parseFloat(e.currentTarget.value) || 0)
                      }
                      step={0.1}
                      hint="Se modo Ads = ROAS"
                    />
                    <InputField
                      label="TACOS meta (%)"
                      type="number"
                      value={inputs.tacosPercent}
                      onChange={(e) =>
                        setNum("tacosPercent", parseFloat(e.currentTarget.value) || 0)
                      }
                      suffix="%"
                      step={0.1}
                    />
                    <InputField
                      label="Proporção orgânica (%)"
                      type="number"
                      value={inputs.proporcaoOrganica}
                      onChange={(e) =>
                        setNum("proporcaoOrganica", parseFloat(e.currentTarget.value) || 0)
                      }
                      suffix="%"
                      step={1}
                    />
                    <InputField
                      label="Promoção (%)"
                      type="number"
                      value={inputs.promocaoPercent}
                      onChange={(e) =>
                        setNum("promocaoPercent", parseFloat(e.currentTarget.value) || 0)
                      }
                      suffix="%"
                      step={0.1}
                    />
                    <InputField
                      label="Cupom loja (%)"
                      type="number"
                      value={inputs.cupomLojaPercent}
                      onChange={(e) =>
                        setNum("cupomLojaPercent", parseFloat(e.currentTarget.value) || 0)
                      }
                      suffix="%"
                      step={0.1}
                    />
                    <InputField label="Oferta relâmpago">
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={inputs.ofertaRelampago}
                          onChange={(e) =>
                            setAny("ofertaRelampago", e.currentTarget.checked)
                          }
                        />
                        Ativar custo médio (5%)
                      </label>
                    </InputField>
                  </div>
                </div>
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

          <div>
            <ResultCard
              result={result}
              inputs={inputs}
              productName={nomeProduto}
              onPrint={() => {
                openPrintRoute({ kind: "ml", productName: nomeProduto, inputs, result });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

