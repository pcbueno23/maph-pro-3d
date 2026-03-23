"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  beginnerMarginGuidance,
  contributionBreakdown,
  estimateMercadoLivreFreightSeller,
  feeResolverForLab,
  scenarioMercadoLivreClassicVsPremium,
  SHOPEE_FFG_BANDS,
  shopeeFeeResolver,
  shopeeHundredBandHint,
  solvePriceForTargetContributionMargin,
  taxRateDecimalFromRegime,
} from "@/lib/pricingLocal";
import type {
  LabMarketplace,
  MLListingType,
  MLReputation,
  TaxRegime,
} from "@/lib/pricingLocal";

function num(v: string, fallback = 0): number {
  const n = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
}

function fmtMoney(n: number) {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtPct(n: number) {
  return `${n.toFixed(2)}%`;
}

export function marginHighlightClass(percent: number): string {
  if (percent < 0) return "text-red-400";
  if (percent < 10) return "text-orange-400";
  return "text-emerald-400";
}

export interface ContributionMarginPanelProps {
  /** Custo produto (sem embalagem) e embalagem — strings para permitir edição no lab. */
  productCostStr: string;
  packagingStr: string;
  setProductCost: (v: string) => void;
  setPackaging: (v: string) => void;
  /** Inputs de custo somente leitura (ex.: sync com impressão no lab). */
  costInputsReadOnly?: boolean;
  /** Se false, não exibe a linha Custo produto / Embalagem (valores vêm só das props). */
  showCostInputs?: boolean;
  /** Sincroniza marketplace inicial com a calculadora principal (Shopee / ML / Amazon→Shopee). */
  syncMarketplaceFromCalculator?: "Shopee" | "Mercado Livre" | "Amazon" | null;
  /** Texto opcional acima do formulário (ex.: explicação no lab). */
  topHint?: ReactNode;
  /** Título da coluna de entradas. */
  sectionTitle?: string;
  /** Margem alvo inicial — alinhar a `defaults.desiredMargin` em Configurações (mesmo preset da calculadora de markup). */
  defaultTargetMarginPercent?: number;
  /** Pontos a mais ao escolher “Venda direta” no lab (vs margem atual do campo). Alinha a `defaults.directMarginExtraPoints`. */
  directMarginExtraPoints?: number;
  /** Quando true, não exibe preço/margem (ex.: parâmetros de impressão inválidos com sync ligado). */
  suppressResults?: boolean;
  suppressResultsMessage?: string;
  /** Snapshot do resultado atual da simulação (usado para salvar no produto). */
  onSimulationChange?: (snapshot: {
    price: number;
    marginPercent: number;
    marketplace: LabMarketplace;
  }) => void;
}

export function ContributionMarginPanel({
  productCostStr,
  packagingStr,
  setProductCost,
  setPackaging,
  costInputsReadOnly = false,
  showCostInputs = true,
  syncMarketplaceFromCalculator,
  topHint,
  sectionTitle = "Margem de contribuição (Shopee / ML)",
  defaultTargetMarginPercent,
  directMarginExtraPoints = 10,
  suppressResults = false,
  suppressResultsMessage,
  onSimulationChange,
}: ContributionMarginPanelProps) {
  const [marketplace, setMarketplace] = useState<LabMarketplace>("shopee");
  const [freightSeller, setFreightSeller] = useState("0");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>("SIMPLES");
  const [simplesPct, setSimplesPct] = useState("4");
  const [lucroPct, setLucroPct] = useState("15");

  const [mode, setMode] = useState<"margem_alvo" | "preco_concorrencia">(
    "margem_alvo",
  );
  const [targetMarginPct, setTargetMarginPct] = useState(() =>
    String(defaultTargetMarginPercent ?? 15),
  );

  useEffect(() => {
    setTargetMarginPct(String(defaultTargetMarginPercent ?? 15));
  }, [defaultTargetMarginPercent]);
  const [sellPrice, setSellPrice] = useState("99.99");

  const [shopeeCpfHighVolume, setShopeeCpfHighVolume] = useState(false);
  const [mlListing, setMlListing] = useState<MLListingType>("classico");
  const [mlCommissionPct, setMlCommissionPct] = useState("12");
  const [mlWeightG, setMlWeightG] = useState("250");
  const [mlRep, setMlRep] = useState<MLReputation>("verde_lider");
  const [mlFreightUserEdited, setMlFreightUserEdited] = useState(false);

  const [competitorPrice, setCompetitorPrice] = useState("");

  useEffect(() => {
    if (!syncMarketplaceFromCalculator) return;
    if (syncMarketplaceFromCalculator === "Mercado Livre") {
      setMarketplace("mercado_livre");
    } else {
      setMarketplace("shopee");
    }
  }, [syncMarketplaceFromCalculator]);

  const taxDec = useMemo(
    () =>
      taxRateDecimalFromRegime(
        taxRegime,
        num(simplesPct, 4),
        num(lucroPct, 15),
      ),
    [taxRegime, simplesPct, lucroPct],
  );

  const feeResolver = useMemo(
    () =>
      feeResolverForLab(marketplace, {
        shopeeCpfHighVolume,
        mlListing,
        mlCommissionPercent: num(mlCommissionPct, 12),
      }),
    [marketplace, shopeeCpfHighVolume, mlListing, mlCommissionPct],
  );

  const baseCosts = useMemo(
    () => ({
      productCost: num(productCostStr),
      packaging: num(packagingStr),
      freightSeller: num(freightSeller),
      taxRateDecimal: taxDec,
      feeResolver,
    }),
    [productCostStr, packagingStr, freightSeller, taxDec, feeResolver],
  );

  const solved = useMemo(() => {
    if (suppressResults) return null;
    if (mode !== "margem_alvo") return null;
    return solvePriceForTargetContributionMargin({
      productCost: baseCosts.productCost,
      packaging: baseCosts.packaging,
      freightSeller: baseCosts.freightSeller,
      targetMarginOnPriceDecimal: num(targetMarginPct, 15) / 100,
      taxRateDecimal: baseCosts.taxRateDecimal,
      feeResolver: baseCosts.feeResolver,
    });
  }, [suppressResults, mode, baseCosts, targetMarginPct]);

  const effectivePrice = useMemo(() => {
    if (suppressResults) return 0;
    return mode === "margem_alvo" && solved?.ok ? solved.price : num(sellPrice);
  }, [suppressResults, mode, solved, sellPrice]);

  useEffect(() => {
    if (marketplace !== "mercado_livre") return;
    if (mlFreightUserEdited) return;
    const w = num(mlWeightG);
    if (w <= 0) {
      setFreightSeller("0");
      return;
    }
    const price = effectivePrice > 0 ? effectivePrice : num(sellPrice);
    if (price <= 0) return;
    const est = estimateMercadoLivreFreightSeller(price, w, mlRep);
    if (est == null) return;
    const next = String(Math.round(est * 100) / 100);
    setFreightSeller((prev) => (prev === next ? prev : next));
  }, [
    marketplace,
    mlWeightG,
    mlRep,
    effectivePrice,
    sellPrice,
    mlFreightUserEdited,
  ]);

  const breakdown = useMemo(() => {
    if (suppressResults) return null;
    if (mode === "margem_alvo" && solved && !solved.ok) return null;
    if (effectivePrice <= 0) return null;
    return contributionBreakdown({
      price: effectivePrice,
      ...baseCosts,
    });
  }, [suppressResults, mode, solved, effectivePrice, baseCosts]);

  const bandHint = useMemo(() => {
    if (marketplace !== "shopee" || !breakdown) return null;
    return shopeeHundredBandHint({
      referencePrice: breakdown.price,
      productCost: baseCosts.productCost,
      packaging: baseCosts.packaging,
      freightSeller: baseCosts.freightSeller,
      taxRateDecimal: baseCosts.taxRateDecimal,
      feeResolver: shopeeFeeResolver({ cpfHighVolume90d: shopeeCpfHighVolume }),
    });
  }, [marketplace, breakdown, baseCosts, shopeeCpfHighVolume]);

  const beginner = breakdown
    ? beginnerMarginGuidance(breakdown.contributionMarginPercent)
    : null;

  const competitorBreakdown = useMemo(() => {
    if (suppressResults) return null;
    const p = num(competitorPrice);
    if (p <= 0) return null;
    return contributionBreakdown({ price: p, ...baseCosts });
  }, [suppressResults, competitorPrice, baseCosts]);

  const mlScenarios = useMemo(() => {
    if (suppressResults) return null;
    if (marketplace !== "mercado_livre" || effectivePrice <= 0) return null;
    return scenarioMercadoLivreClassicVsPremium({
      price: effectivePrice,
      productCost: baseCosts.productCost,
      packaging: baseCosts.packaging,
      freightSeller: baseCosts.freightSeller,
      taxRateDecimal: baseCosts.taxRateDecimal,
      classicCommissionPercent: num(mlCommissionPct, 12),
      premiumCommissionPercent: Math.min(
        19,
        Math.max(15, num(mlCommissionPct, 16) + 3),
      ),
    });
  }, [suppressResults, marketplace, effectivePrice, baseCosts, mlCommissionPct]);

  useEffect(() => {
    if (!onSimulationChange) return;
    const marginPercent = breakdown?.contributionMarginPercent ?? 0;
    onSimulationChange({
      price: effectivePrice > 0 ? effectivePrice : 0,
      marginPercent: Number.isFinite(marginPercent) ? marginPercent : 0,
      marketplace,
    });
  }, [onSimulationChange, effectivePrice, breakdown, marketplace]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-cyan-400">{sectionTitle}</h2>
        {topHint}

        <label className="block text-xs text-slate-400">Marketplace</label>
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={marketplace}
          onChange={(e) => {
            const v = e.target.value as LabMarketplace;
            const prev = marketplace;
            setMarketplace(v);
            if (v === "mercado_livre") setMlFreightUserEdited(false);
            if (v === "direct" && prev !== "direct") {
              const cur = num(targetMarginPct, defaultTargetMarginPercent ?? 15);
              setTargetMarginPct(String(Math.min(95, cur + directMarginExtraPoints)));
            }
          }}
        >
          <option value="shopee">Shopee (FFG — faixas fixas)</option>
          <option value="mercado_livre">Mercado Livre</option>
          <option value="direct">Venda direta (sem marketplace)</option>
        </select>

        {marketplace === "direct" ? (
          <p className="rounded-lg border border-emerald-900/40 bg-emerald-950/25 px-3 py-2 text-[11px] leading-relaxed text-emerald-200/90">
            Simulação <strong className="text-emerald-100">sem comissão</strong> de plataforma
            (Instagram, WhatsApp, loja própria). A margem alvo foi aumentada em{" "}
            {directMarginExtraPoints} p.p. em relação ao valor do campo — ajuste se quiser.
          </p>
        ) : null}

        {showCostInputs ? (
          <>
            {costInputsReadOnly ? (
              <p className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-500">
                <strong className="text-slate-400">Como conferir:</strong>{" "}
                <strong>Custo produto</strong> + <strong>Embalagem</strong> = custo
                total do bloco de impressão acima (peça + mão de obra + embalagem).
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">
                  Custo produto
                  {costInputsReadOnly ? (
                    <span className="ml-1 text-[10px] text-cyan-500/90">
                      (simulação)
                    </span>
                  ) : null}
                </label>
                <input
                  className={`mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${
                    costInputsReadOnly ? "cursor-not-allowed opacity-85" : ""
                  }`}
                  value={productCostStr}
                  readOnly={costInputsReadOnly}
                  onChange={(e) => setProductCost(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">
                  Embalagem
                  {costInputsReadOnly ? (
                    <span className="ml-1 text-[10px] text-cyan-500/90">
                      (simulação)
                    </span>
                  ) : null}
                </label>
                <input
                  className={`mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm ${
                    costInputsReadOnly ? "cursor-not-allowed opacity-85" : ""
                  }`}
                  value={packagingStr}
                  readOnly={costInputsReadOnly}
                  onChange={(e) => setPackaging(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-[11px] text-slate-400">
            <strong>Custos</strong> vêm da simulação à esquerda: produto (sem
            embalagem) <strong>{fmtMoney(num(productCostStr))}</strong> · embalagem{" "}
            <strong>{fmtMoney(num(packagingStr))}</strong>
          </div>
        )}

        {marketplace === "mercado_livre" && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
            <p className="mb-1 font-medium text-slate-300">
              1 — Peso e reputação (Mercado Livre)
            </p>
            <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
              Preencha o peso: o frete é calculado pela tabela ao alterar peso,
              reputação ou preço estimado.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label>Peso (g)</label>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                  value={mlWeightG}
                  onChange={(e) => {
                    setMlFreightUserEdited(false);
                    setMlWeightG(e.target.value);
                  }}
                />
              </div>
              <div>
                <label>Reputação</label>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5"
                  value={mlRep}
                  onChange={(e) => {
                    setMlFreightUserEdited(false);
                    setMlRep(e.target.value as MLReputation);
                  }}
                >
                  <option value="verde_lider">Verde / Líder</option>
                  <option value="sem">Sem reputação</option>
                  <option value="amarela">Amarela</option>
                  <option value="vermelha">Vermelha</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400">
            {marketplace === "direct"
              ? "Frete / envio (se você pagar)"
              : marketplace === "mercado_livre"
                ? "2 — Frete pago pelo vendedor (tabela ML)"
                : "Frete pago pelo vendedor (subsídio / full)"}
          </label>
          {marketplace === "mercado_livre" && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Atualiza ao mudar peso ou reputação; se editar o frete, deixa de
              recalcular até mudar peso/reputação.
            </p>
          )}
          <input
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={freightSeller}
            onChange={(e) => {
              setFreightSeller(e.target.value);
              if (marketplace === "mercado_livre") setMlFreightUserEdited(true);
            }}
          />
        </div>

        <label className="block text-xs text-slate-400">Imposto (sobre PV)</label>
        <select
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
          value={taxRegime}
          onChange={(e) => setTaxRegime(e.target.value as TaxRegime)}
        >
          <option value="CPF_MEI">CPF / MEI — 0% neste modelo</option>
          <option value="SIMPLES">Simples Nacional</option>
          <option value="LUCRO">Lucro real / presumido</option>
        </select>
        {taxRegime === "SIMPLES" && (
          <div>
            <label className="text-xs text-slate-400">Alíquota % (ex.: 4)</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={simplesPct}
              onChange={(e) => setSimplesPct(e.target.value)}
            />
          </div>
        )}
        {taxRegime === "LUCRO" && (
          <div>
            <label className="text-xs text-slate-400">Alíquota efetiva %</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={lucroPct}
              onChange={(e) => setLucroPct(e.target.value)}
            />
          </div>
        )}

        {marketplace === "shopee" && (
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={shopeeCpfHighVolume}
              onChange={(e) => setShopeeCpfHighVolume(e.target.checked)}
            />
            CPF com +450 pedidos / 90 dias (+R$ 3,00 na fixa)
          </label>
        )}

        {marketplace === "mercado_livre" && (
          <>
            <label className="text-xs text-slate-400">
              Tipo de anúncio (simulação atual)
            </label>
            <select
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={mlListing}
              onChange={(e) =>
                setMlListing(e.target.value as MLListingType)
              }
            >
              <option value="classico">Clássico (10%–14% — ajuste abaixo)</option>
              <option value="premium">Premium (15%–19% — ajuste abaixo)</option>
            </select>
            <div>
              <label className="text-xs text-slate-400">Comissão % (categoria)</label>
              <input
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                value={mlCommissionPct}
                onChange={(e) => setMlCommissionPct(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="border-t border-slate-800 pt-3">
          <label className="text-xs text-slate-400">Modo</label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("margem_alvo")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "margem_alvo"
                  ? "bg-cyan-600 text-slate-950"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              Margem desejada → preço
            </button>
            <button
              type="button"
              onClick={() => setMode("preco_concorrencia")}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === "preco_concorrencia"
                  ? "bg-cyan-600 text-slate-950"
                  : "bg-slate-800 text-slate-300"
              }`}
            >
              Preço (concorrência) → margem
            </button>
          </div>
        </div>

        {mode === "margem_alvo" ? (
          <div>
            <label className="text-xs text-slate-400">
              Margem de contribuição alvo (% do preço)
              {marketplace === "direct" ? (
                <span className="mt-0.5 block text-[10px] font-normal text-slate-500">
                  Venda direta: sem taxa de marketplace no preço — use margem maior que em Shopee/ML.
                </span>
              ) : null}
            </label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={targetMarginPct}
              onChange={(e) => setTargetMarginPct(e.target.value)}
            />
          </div>
        ) : (
          <div>
            <label className="text-xs text-slate-400">Preço de venda</label>
            <input
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
            />
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400">
            Preço concorrência (opcional — compara margem)
          </label>
          <input
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            value={competitorPrice}
            onChange={(e) => setCompetitorPrice(e.target.value)}
            placeholder="Ex.: 89,90"
          />
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-emerald-400">Resultado</h2>

        {suppressResults && suppressResultsMessage ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-950/25 p-3 text-sm text-amber-100/95">
            {suppressResultsMessage}
          </p>
        ) : null}

        {!suppressResults && mode === "margem_alvo" && solved && !solved.ok && (
          <p className="text-sm text-amber-400">{solved.error}</p>
        )}

        {!suppressResults && mode === "margem_alvo" && solved?.ok && (
          <p className="text-sm text-slate-300">
            <span className="text-slate-400">Preço sugerido: </span>
            <strong className="text-lg text-cyan-300">
              {fmtMoney(solved.price)}
            </strong>
            <span className="ml-2 text-xs text-slate-500">
              ({solved.iterations} iterações)
            </span>
          </p>
        )}

        {!suppressResults && breakdown && (
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex justify-between border-b border-slate-800 py-1">
              <span>Comissão (% sobre PV)</span>
              <span>{fmtMoney(breakdown.commissionAmount)}</span>
            </li>
            <li className="flex justify-between border-b border-slate-800 py-1">
              <span>Taxa fixa marketplace</span>
              <span>{fmtMoney(breakdown.fixedMarketplaceFee)}</span>
            </li>
            <li className="flex justify-between border-b border-slate-800 py-1">
              <span>Imposto (modelo)</span>
              <span>{fmtMoney(breakdown.taxAmount)}</span>
            </li>
            <li className="flex justify-between border-b border-slate-800 py-1">
              <span>Custos + frete vendedor</span>
              <span>
                {fmtMoney(
                  breakdown.productCost +
                    breakdown.packaging +
                    breakdown.freightSeller,
                )}
              </span>
            </li>
            <li
              className={`flex justify-between py-2 text-base font-semibold ${marginHighlightClass(
                breakdown.contributionMarginPercent,
              )}`}
            >
              <span>Margem de contribuição</span>
              <span>
                {fmtMoney(breakdown.contributionMargin)} (
                {fmtPct(breakdown.contributionMarginPercent)})
              </span>
            </li>
          </ul>
        )}

        {!suppressResults && beginner && (
          <div
            className={`rounded-xl border p-3 text-sm ${
              beginner.status === "ideal"
                ? "border-emerald-800 bg-emerald-950/30 text-emerald-200"
                : beginner.status === "abaixo_ideal"
                  ? "border-amber-800 bg-amber-950/30 text-amber-200"
                  : "border-slate-700 bg-slate-950/50 text-slate-300"
            }`}
          >
            {beginner.hint}
          </div>
        )}

        {!suppressResults && bandHint && (
          <div className="rounded-xl border border-cyan-900 bg-cyan-950/30 p-3 text-sm text-cyan-100">
            <p className="font-medium">Otimização de faixa (Shopee)</p>
            <p className="mt-1">{bandHint.message}</p>
            <p className="mt-2 text-xs text-cyan-200/80">
              Margem a R$ 100,00: {fmtPct(bandHint.marginA)} · a R$ 99,99:{" "}
              {fmtPct(bandHint.marginB)}
            </p>
          </div>
        )}

        {!suppressResults && competitorBreakdown && (
          <div className="rounded-xl border border-slate-700 bg-slate-950/40 p-3 text-sm">
            <p className="font-medium text-slate-200">Na concorrência</p>
            <p className="mt-1 text-slate-400">
              A {fmtMoney(competitorBreakdown.price)} sua margem seria{" "}
              <strong
                className={marginHighlightClass(
                  competitorBreakdown.contributionMarginPercent,
                )}
              >
                {fmtPct(competitorBreakdown.contributionMarginPercent)}
              </strong>{" "}
              ({fmtMoney(competitorBreakdown.contributionMargin)}).
            </p>
          </div>
        )}

        {!suppressResults && marketplace === "shopee" && (
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer text-slate-400">
              Faixas FFG (referência)
            </summary>
            <ul className="mt-2 space-y-1 pl-4">
              {SHOPEE_FFG_BANDS.map((b) => (
                <li key={b.label}>
                  {b.label}: {(b.percentDecimal * 100).toFixed(0)}% +{" "}
                  {fmtMoney(b.fixed)}
                </li>
              ))}
            </ul>
          </details>
        )}

        {!suppressResults && mlScenarios && (
          <div className="space-y-3 border-t border-slate-800 pt-3">
            <p className="text-sm font-medium text-slate-200">
              Simulação: Clássico vs Premium (mesmo preço)
            </p>
            <p className="text-xs text-slate-500">
              Premium usa +3 p.p. sobre a comissão do campo só para comparar.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[mlScenarios.classico, mlScenarios.premium].map((s) => (
                <div
                  key={s.label}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs"
                >
                  <p className="font-medium text-cyan-300">{s.label}</p>
                  <p
                    className={`mt-2 font-medium ${marginHighlightClass(
                      s.breakdown.contributionMarginPercent,
                    )}`}
                  >
                    Margem: {fmtMoney(s.breakdown.contributionMargin)} (
                    {fmtPct(s.breakdown.contributionMarginPercent)})
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
