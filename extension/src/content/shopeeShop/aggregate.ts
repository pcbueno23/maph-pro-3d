import type { ShopItem } from "./scrape";

export type ShopStats = {
  itemCount: number;
  totalNaLoja: number | null;
  /** true quando `itemCount < totalNaLoja` — ainda falta paginar pra ver a loja inteira. */
  parcial: boolean;
  soldTotal: number;
  revenueTotal: number;
  /** Vendido/faturamento "últimos 30 dias" direto da Shopee (`monthly_sold_count`) —
   * só confiável quando `soldMonthly30dConfiavel` for true (ver comentário abaixo). */
  soldMonthly30d: number;
  revenueMonthly30d: number;
  /** false quando TODOS os itens com soldMonthly vieram 0 mas têm venda histórica >0 —
   * sinal de que o campo da Shopee não está populado pra essa loja (confirmado que isso
   * acontece às vezes, igual historical_sold_count). Nesse caso, prefira a estimativa. */
  soldMonthly30dConfiavel: boolean;
  /** Estimativa própria (histórico ÷ dias no ar × 30) — sempre calculada, serve de
   * checagem cruzada ou de substituto quando o dado da Shopee não é confiável. */
  soldMonthly30dEstimado: number;
  revenueMonthly30dEstimado: number;
  /** Dias desde o anúncio mais antigo capturado — "no ar há" usa esse valor. */
  oldestListingDays: number | null;
};

export function computeShopStats(items: ShopItem[], totalNaLoja: number | null): ShopStats {
  let soldTotal = 0;
  let revenueTotal = 0;
  let soldMonthly30d = 0;
  let revenueMonthly30d = 0;
  let soldMonthly30dEstimado = 0;
  let revenueMonthly30dEstimado = 0;
  let oldestListingDays: number | null = null;
  let temItemComVendaHistoricaEMonthlyZero = false;
  let temAlgumMonthlyMaiorQueZero = false;

  for (const it of items) {
    const sold = it.sold ?? 0;
    const price = it.price ?? 0;
    soldTotal += sold;
    revenueTotal += sold * price;

    const monthly = it.soldMonthly ?? 0;
    if (monthly > 0) temAlgumMonthlyMaiorQueZero = true;
    if (monthly === 0 && sold > 0) temItemComVendaHistoricaEMonthlyZero = true;
    soldMonthly30d += monthly;
    revenueMonthly30d += monthly * price;

    const est = it.salesPerDayEstimado != null ? it.salesPerDayEstimado * 30 : 0;
    soldMonthly30dEstimado += est;
    revenueMonthly30dEstimado += est * price;

    if (it.createdDaysAgo != null) {
      oldestListingDays = oldestListingDays == null ? it.createdDaysAgo : Math.max(oldestListingDays, it.createdDaysAgo);
    }
  }

  // "Confiável" = pelo menos algum item mostrou monthly > 0 (o campo está populado pra
  // essa loja) E não há um caso claro de inconsistência (venda histórica alta, monthly 0).
  // Com poucos itens isso é só uma heurística, não uma certeza — por isso o painel sempre
  // mostra a estimativa junto, nunca esconde ela.
  const soldMonthly30dConfiavel = temAlgumMonthlyMaiorQueZero && !temItemComVendaHistoricaEMonthlyZero;

  return {
    itemCount: items.length,
    totalNaLoja,
    parcial: totalNaLoja != null && items.length < totalNaLoja,
    soldTotal,
    revenueTotal,
    soldMonthly30d,
    revenueMonthly30d,
    soldMonthly30dConfiavel,
    soldMonthly30dEstimado,
    revenueMonthly30dEstimado,
    oldestListingDays,
  };
}

export function formatDuration(days: number | null): string {
  if (days == null) return "—";
  if (days < 30) return `${days} dia(s)`;
  if (days < 365) return `${Math.round(days / 30)} mês(es)`;
  const years = days / 365;
  return `${years.toFixed(1).replace(".0", "")} ano(s)`;
}
