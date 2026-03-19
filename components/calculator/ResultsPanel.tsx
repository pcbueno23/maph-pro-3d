import type { CalculatorResults } from "@/types";
import { CostBreakdownChart } from "@/components/charts/CostBreakdownChart";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Props {
  results: CalculatorResults | null;
  isDirty: boolean;
}

export function ResultsPanel({ results, isDirty }: Props) {
  if (!results) {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 text-center text-sm text-slate-400">
        <p>
          Preencha os dados da impressão à esquerda para ver o custo completo,
          preço sugerido e lucro por venda.
        </p>
      </div>
    );
  }

  const {
    totalCost,
    minimumPrice,
    suggestedPrice,
    suggestedPriceShopee,
    suggestedPriceML,
    suggestedPriceDirectCash,
    suggestedPriceDirectCard,
    unitsPerBatch,
    plateTotalCost,
    profitPerSale,
    margin,
    cascataShopee,
    cascataML,
    priceToAnnounceForPromo,
    profitPerHour,
    compareAtPriceResult,
    kitSuggestedPriceShopee,
    kitSuggestedPriceML,
    kitSuggestedPriceDirectCash,
    kitSuggestedPriceDirectCard,
    kitMarginShopee,
    kitMarginML,
    kitMarginDirectCash,
    kitMarginDirectCard,
    taxaFalhaPercent,
    maoDeObraCusto,
    custoTotalAjustado,
    descontoPercentualReal,
    precoComDesconto,
    lucroLiquidoReal,
    margemReal,
    alertaLucroAbaixoDaMeta,
  } = results;

  const worstChannel =
    cascataShopee.netProfit <= cascataML.netProfit ? cascataShopee : cascataML;

  const costChartItems = [
    {
      name: "Filamento",
      value: results.filamentCost,
      color: "#22d3ee",
    },
    {
      name: "Energia",
      value: results.energyCost,
      color: "#a855f7",
    },
    {
      name: "Depreciação + fixos",
      value: results.depreciationCost,
      color: "#10b981",
    },
    {
      name: "Embalagem",
      value: results.packagingCost,
      color: "#64748b",
    },
    {
      name: "Taxa % marketplace",
      value: worstChannel.commissionAmount,
      color: "#fb7185",
    },
    {
      name: "Taxa fixa",
      value: worstChannel.fixedFeeAmount,
      color: "#f97316",
    },
    {
      name: "Frete",
      value: worstChannel.shippingAmount,
      color: "#eab308",
    },
    {
      name: "Imposto",
      value: worstChannel.taxAmount,
      color: "#facc15",
    },
  ];

  const profitPositive = profitPerSale >= 0;
  const realMarginLow = margemReal < 20;
  const lossAbs = lucroLiquidoReal - profitPerSale;
  const lossPct = profitPerSale !== 0 ? (lossAbs / Math.abs(profitPerSale)) * 100 : 0;
  const lossOver20 = lossAbs < 0 && Math.abs(lossPct) > 20;
  const taxZero = (cascataShopee.taxPercent ?? 0) === 0;
  const laborTypeHora = true; // não temos o tipo no results; usamos heurísticas abaixo
  const laborHourTooLow =
    // se mão de obra existe e ficou muito baixa, alerta
    maoDeObraCusto > 0 && maoDeObraCusto < 2;

  const shopeeBelowAdjustedCost = suggestedPriceShopee < custoTotalAjustado;
  const mlBelowAdjustedCost = suggestedPriceML < custoTotalAjustado;
  const directPriceShown = suggestedPriceDirectCash ?? suggestedPriceDirectCard ?? suggestedPrice;
  const directBelowAdjustedCost = directPriceShown < custoTotalAjustado;

  const CascataBlock = ({
    title,
    c,
    isShopee,
  }: {
    title: string;
    c: typeof cascataShopee;
    isShopee: boolean;
  }) => (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {title}
      </p>
      <ul className="space-y-1 text-slate-300">
        <li className="flex justify-between">
          <span>Venda</span>
          <span className="font-medium text-slate-100">{fmt(c.sellingPrice)}</span>
        </li>
        <li className="flex justify-between">
          <span>Taxa % (venda × taxa)</span>
          <span className="text-rose-400">
            − {fmt(c.commissionAmount)}
          </span>
        </li>
        <li className="flex justify-between">
          <span>{isShopee ? "Taxa fixa (automática)" : "Taxa fixa"}</span>
          <span className="text-rose-400">− {fmt(c.fixedFeeAmount)}</span>
        </li>
        <li className="flex justify-between">
          <span>Frete</span>
          <span className="text-rose-400">− {fmt(c.shippingAmount)}</span>
        </li>
        <li className="flex justify-between">
          <span>Embalagem</span>
          <span className="text-rose-400">− {fmt(c.packagingCost)}</span>
        </li>
        <li className="flex justify-between">
          <span>Imposto</span>
          <span className="text-rose-400">− {fmt(c.taxAmount)}</span>
        </li>
        <li className="flex justify-between">
          <span>Custo do produto (produção)</span>
          <span className="text-rose-400">− {fmt(c.totalCost)}</span>
        </li>
        <li className="flex justify-between border-t border-slate-800 pt-2 font-medium">
          <span>Lucro líquido</span>
          <span className={c.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {fmt(c.netProfit)}
          </span>
        </li>
        <li className="flex justify-between font-medium">
          <span>Margem líquida (Lucro / Venda)</span>
          <span className={c.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
            {c.marginPercent.toFixed(1)}%
          </span>
        </li>
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 via-slate-950/70 to-slate-900/80 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Por quanto eu vendo?
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Shopee</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{fmt(suggestedPriceShopee)}</p>
              {shopeeBelowAdjustedCost ? (
                <p className="mt-1 text-[11px] font-medium text-rose-300">
                  Abaixo do custo real ajustado
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Mercado Livre</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{fmt(suggestedPriceML)}</p>
              {mlBelowAdjustedCost ? (
                <p className="mt-1 text-[11px] font-medium text-rose-300">
                  Abaixo do custo real ajustado
                </p>
              ) : null}
            </div>
            <div className="rounded-xl bg-slate-950/40 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Direto</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">
                {fmt(directPriceShown)}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500" title="PIX e cartão podem variar; aqui mostramos o primeiro disponível.">
                (?)
              </p>
              {directBelowAdjustedCost ? (
                <p className="mt-1 text-[11px] font-medium text-rose-300">
                  Abaixo do custo real ajustado
                </p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 text-[11px] text-slate-500">
            Preço ideal calculado por canal para atingir sua margem alvo.
          </p>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            realMarginLow ? "border-rose-500/30 bg-rose-500/5" : "border-cyan-500/30 bg-cyan-500/5"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Quanto eu ganho?
          </p>
          <p className="mt-2 text-3xl font-semibold text-slate-50">{fmt(lucroLiquidoReal)}</p>
          <p className={realMarginLow ? "mt-1 text-sm text-rose-200" : "mt-1 text-sm text-emerald-200"}>
            Margem real: <span className="font-semibold">{margemReal.toFixed(1)}%</span>
          </p>
          {alertaLucroAbaixoDaMeta ? (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              Seu lucro real está abaixo da meta devido a falhas, taxas ou descontos.
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Custo total</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">{fmt(totalCost)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Custo real ajustado
          </p>
          <p className="mt-1 text-lg font-semibold text-emerald-200">{fmt(custoTotalAjustado)}</p>
        </div>
      </div>

      <details className="rounded-xl border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer list-none px-3 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
          Ver detalhes do cálculo
        </summary>
        <div className="px-3 pb-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Impacto dos Ajustes
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 text-slate-300">
                <p>
                  Lucro teórico: <span className="text-slate-100">{fmt(profitPerSale)}</span>
                </p>
                <p>
                  Lucro real: <span className="text-slate-100">{fmt(lucroLiquidoReal)}</span>
                </p>
              </div>
              <div className="space-y-1 text-slate-300">
                <p>
                  Diferença:{" "}
                  <span className={lossOver20 ? "text-rose-300" : lossAbs < 0 ? "text-amber-300" : "text-emerald-300"}>
                    {lossAbs >= 0 ? "+" : "−"} {fmt(Math.abs(lossAbs))} (
                    {Number.isFinite(lossPct) ? lossPct.toFixed(0) : 0}%)
                  </span>
                </p>
                <p className="text-[11px] text-slate-500">
                  (falhas, mão de obra, desconto real e taxas recalculadas)
                </p>
              </div>
            </div>

            {taxZero ? (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                <p className="font-semibold">ATENÇÃO: Você não está considerando impostos.</p>
                <p className="mt-0.5">
                  Seu lucro real pode estar superestimado. Sugestão: MEI 4%–6% · Simples Nacional 6%–12%.
                </p>
              </div>
            ) : null}

            {laborHourTooLow ? (
              <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                Sua mão de obra por peça está muito baixa — isso pode comprometer seu lucro real.
              </div>
            ) : null}

            {margemReal < 15 ? (
              <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
                <p className="font-semibold">Margem muito baixa.</p>
                <p className="mt-0.5">Esse produto pode não ser sustentável.</p>
              </div>
            ) : null}
          </div>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <CascataBlock title="Detalhamento do cálculo (Shopee)" c={cascataShopee} isShopee />
            <CascataBlock title="Detalhamento do cálculo (ML)" c={cascataML} isShopee={false} />
          </div>

          {priceToAnnounceForPromo != null && priceToAnnounceForPromo > 0 && (
            <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
              <p className="mb-1 font-semibold text-purple-300">Promoção com lucro preservado</p>
              <p className="text-slate-300">
                Anuncie por <strong className="text-slate-100">{fmt(priceToAnnounceForPromo)}</strong> para que, após o desconto, o cliente pague {fmt(suggestedPrice)}.
              </p>
            </div>
          )}

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-950/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Preço mínimo
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-100">{fmt(minimumPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-950/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Distribuição de custos
              </p>
              <div className="mt-2">
                <CostBreakdownChart items={costChartItems} />
              </div>
            </div>
          </div>
        </div>
      </details>

      <div className="grid gap-4 text-xs md:grid-cols-2">
        <div className="space-y-2 rounded-xl bg-slate-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Custo total (por peça)
          </p>
          <p className="text-lg font-semibold text-slate-100">{fmt(totalCost)}</p>
        </div>
        <div className="space-y-2 rounded-xl bg-slate-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Preço mínimo
          </p>
          <p className="text-lg font-semibold text-slate-100">{fmt(minimumPrice)}</p>
        </div>
      </div>

      {unitsPerBatch && unitsPerBatch > 1 && plateTotalCost != null && (
        <div className="rounded-xl bg-slate-950/60 p-3 text-xs">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Impressão em placa / kit
          </p>
          <p className="text-slate-300">
            <span className="font-medium text-slate-100">
              {unitsPerBatch} peças por impressão
            </span>{" "}
            → custo total da placa:{" "}
            <span className="font-semibold text-slate-100">
              {fmt(plateTotalCost)}
            </span>
          </p>
          {(kitSuggestedPriceShopee ||
            kitSuggestedPriceML ||
            kitSuggestedPriceDirectCash ||
            kitSuggestedPriceDirectCard) && (
            <div className="mt-1 border-t border-slate-800 pt-1 space-y-0.5 text-slate-300">
              {kitSuggestedPriceShopee && (
                <p>
                  Kit Shopee:{" "}
                  <span className="font-semibold text-slate-50">
                    {fmt(kitSuggestedPriceShopee)}
                  </span>
                  {typeof kitMarginShopee === "number" && (
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({kitMarginShopee.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
              {kitSuggestedPriceML && (
                <p>
                  Kit ML:{" "}
                  <span className="font-semibold text-slate-50">
                    {fmt(kitSuggestedPriceML)}
                  </span>
                  {typeof kitMarginML === "number" && (
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({kitMarginML.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
              {kitSuggestedPriceDirectCash && (
                <p>
                  Kit direto PIX:{" "}
                  <span className="font-semibold text-slate-50">
                    {fmt(kitSuggestedPriceDirectCash)}
                  </span>
                  {typeof kitMarginDirectCash === "number" && (
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({kitMarginDirectCash.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
              {kitSuggestedPriceDirectCard && (
                <p>
                  Kit direto crédito:{" "}
                  <span className="font-semibold text-slate-50">
                    {fmt(kitSuggestedPriceDirectCard)}
                  </span>
                  {typeof kitMarginDirectCard === "number" && (
                    <span className="ml-1 text-[11px] text-slate-400">
                      ({kitMarginDirectCard.toFixed(1)}%)
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* detalhes técnicos ficam no accordion acima */}

      {!isDirty && (
        <p className="text-[11px] text-slate-500">
          Dica: ajuste os parâmetros nas configurações (kWh, impressora, margem).
        </p>
      )}
    </div>
  );
}

