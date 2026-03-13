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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Resultado da simulação
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">{fmt(suggestedPrice)}</p>
          <p className="text-xs text-slate-400">
            Preços sugeridos por canal para a mesma margem alvo.
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 px-3 py-2 text-right text-xs text-emerald-400">
          <p className="font-semibold">
            {profitPositive ? "Lucro líquido (pior canal)" : "Prejuízo"}
          </p>
          <p className="text-sm text-slate-50">
            {fmt(profitPerSale)} ({margin.toFixed(1)}%)
          </p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            {fmt(profitPerHour)}/h
          </p>
        </div>
        <div className="rounded-xl bg-slate-950/40 px-3 py-2 text-right text-xs text-slate-300">
          <p className="font-semibold text-slate-100">Sugestões</p>
          <p className="mt-0.5">
            Shopee: <span className="font-semibold text-slate-50">{fmt(suggestedPriceShopee)}</span>
          </p>
          <p className="mt-0.5">
            ML: <span className="font-semibold text-slate-50">{fmt(suggestedPriceML)}</span>
          </p>
          {(suggestedPriceDirectCash != null || suggestedPriceDirectCard != null) && (
            <div className="mt-1 border-t border-slate-800 pt-1">
              <p className="mt-0.5">
                Direto PIX:{" "}
                <span className="font-semibold text-slate-50">
                  {fmt(suggestedPriceDirectCash ?? 0)}
                </span>
              </p>
              <p className="mt-0.5">
                Direto crédito:{" "}
                <span className="font-semibold text-slate-50">
                  {fmt(suggestedPriceDirectCard ?? 0)}
                </span>
              </p>
            </div>
          )}
        </div>
        {compareAtPriceResult && (
          <div className="rounded-xl bg-cyan-500/10 px-3 py-2 text-right text-xs text-cyan-400">
            <p className="font-semibold">Preço desejado</p>
            <p className="text-sm text-slate-50">
              {fmt(compareAtPriceResult.sellingPrice)}
            </p>
            <p className="mt-0.5 text-slate-300">
              Shopee:{" "}
              <span className={compareAtPriceResult.shopee.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {fmt(compareAtPriceResult.shopee.netProfit)} ({compareAtPriceResult.shopee.marginPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-0.5 text-slate-300">
              ML:{" "}
              <span className={compareAtPriceResult.ml.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {fmt(compareAtPriceResult.ml.netProfit)} ({compareAtPriceResult.ml.marginPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Direto PIX:{" "}
              <span className={compareAtPriceResult.directCash.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {fmt(compareAtPriceResult.directCash.netProfit)} ({compareAtPriceResult.directCash.marginPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Direto crédito:{" "}
              <span className={compareAtPriceResult.directCard.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {fmt(compareAtPriceResult.directCard.netProfit)} ({compareAtPriceResult.directCard.marginPercent.toFixed(1)}%)
              </span>
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {fmt(
                Math.min(
                  compareAtPriceResult.shopee.profitPerHour,
                  compareAtPriceResult.ml.profitPerHour,
                  compareAtPriceResult.directCash.profitPerHour,
                  compareAtPriceResult.directCard.profitPerHour,
                ),
              )}
              /h
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CascataBlock title="Detalhamento do cálculo (Shopee)" c={cascataShopee} isShopee />
        <CascataBlock title="Detalhamento do cálculo (ML)" c={cascataML} isShopee={false} />
      </div>

      {priceToAnnounceForPromo != null && priceToAnnounceForPromo > 0 && (
        <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-xs">
          <p className="mb-1 font-semibold text-purple-300">
            Promoção com lucro preservado
          </p>
          <p className="text-slate-300">
            Anuncie por <strong className="text-slate-100">{fmt(priceToAnnounceForPromo)}</strong> para que, após o desconto, o cliente pague {fmt(suggestedPrice)} e sua margem se mantenha.
          </p>
        </div>
      )}

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

      <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Detalhamento do custo do produto (produção)
        </p>
        <ul className="space-y-1 text-slate-300">
          <li className="flex justify-between">
            <span>Energia elétrica</span>
            <span className="text-slate-100">{fmt(results.energyCost)}</span>
          </li>
          <li className="flex justify-between">
            <span>Filamento</span>
            <span className="text-slate-100">{fmt(results.filamentCost)}</span>
          </li>
          <li className="flex justify-between">
            <span>Depreciação + fixos</span>
            <span className="text-slate-100">{fmt(results.depreciationCost)}</span>
          </li>
          <li className="flex justify-between">
            <span>Embalagem</span>
            <span className="text-slate-100">{fmt(results.packagingCost)}</span>
          </li>
          <li className="flex justify-between border-t border-slate-800 pt-2 font-medium text-slate-100">
            <span>Custo total</span>
            <span>{fmt(totalCost)}</span>
          </li>
        </ul>
      </div>

      <CostBreakdownChart items={costChartItems} />

      {!isDirty && (
        <p className="text-[11px] text-slate-500">
          Dica: ajuste os parâmetros nas configurações (kWh, impressora, margem).
        </p>
      )}
    </div>
  );
}

