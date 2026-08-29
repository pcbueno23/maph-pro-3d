import type { EnrichedCard } from "./scrape";

export type PageStats = {
  cardCount: number;
  totalRevenue: number;
  revenue30d: number;
  totalSales: number;
  sales30d: number;
  minPrice: number | null;
  maxPrice: number | null;
  nationalCount: number;
  internationalCount: number;
  ageBuckets: { until90: number; until180: number; until365: number; older: number };
};

export function computePageStats(cards: EnrichedCard[]): PageStats {
  let totalRevenue = 0;
  let revenue30d = 0;
  let totalSales = 0;
  let sales30d = 0;
  let minPrice: number | null = null;
  let maxPrice: number | null = null;
  let nationalCount = 0;
  let internationalCount = 0;
  const ageBuckets = { until90: 0, until180: 0, until365: 0, older: 0 };

  for (const c of cards) {
    if (c.price != null) {
      minPrice = minPrice == null ? c.price : Math.min(minPrice, c.price);
      maxPrice = maxPrice == null ? c.price : Math.max(maxPrice, c.price);
    }
    if (c.price != null && c.soldCount) totalRevenue += c.price * c.soldCount;
    if (c.price != null && c.salesPerDay != null) revenue30d += c.price * c.salesPerDay * 30;
    if (c.soldCount) totalSales += c.soldCount;
    if (c.salesPerDay != null) sales30d += c.salesPerDay * 30;

    if (c.shopId) {
      if (c.isInternational) internationalCount += 1;
      else nationalCount += 1;
    }

    if (c.createdDaysAgo != null) {
      if (c.createdDaysAgo <= 90) ageBuckets.until90 += 1;
      else if (c.createdDaysAgo <= 180) ageBuckets.until180 += 1;
      else if (c.createdDaysAgo <= 365) ageBuckets.until365 += 1;
      else ageBuckets.older += 1;
    }
  }

  return {
    cardCount: cards.length,
    totalRevenue,
    revenue30d,
    totalSales,
    sales30d,
    minPrice,
    maxPrice,
    nationalCount,
    internationalCount,
    ageBuckets,
  };
}

export type SellerGroup = {
  shopId: string;
  name: string;
  location: string | null;
  isInternational: boolean;
  listingCount: number;
  salesPerDay30d: number;
};

export function groupBySeller(cards: EnrichedCard[]): SellerGroup[] {
  const map = new Map<string, SellerGroup>();

  for (const c of cards) {
    if (!c.shopId || !c.sellerName) continue;
    const existing = map.get(c.shopId);
    const dailySales = c.salesPerDay ?? 0;
    if (existing) {
      existing.listingCount += 1;
      existing.salesPerDay30d += dailySales * 30;
    } else {
      map.set(c.shopId, {
        shopId: c.shopId,
        name: c.sellerName,
        location: c.sellerLocation,
        isInternational: c.isInternational,
        listingCount: 1,
        salesPerDay30d: dailySales * 30,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.salesPerDay30d - a.salesPerDay30d);
}

/** Campeões = top 20% por vendas/dia (ou 5, o que for maior) — velocidade, não volume bruto acumulado. */
export function pickChampions(cards: EnrichedCard[]): Set<HTMLElement> {
  const withVelocity = cards
    .filter((c) => (c.salesPerDay ?? 0) > 0)
    .sort((a, b) => (b.salesPerDay ?? 0) - (a.salesPerDay ?? 0));
  const n = Math.max(5, Math.round(withVelocity.length * 0.2));
  const els = withVelocity.slice(0, n).map((c) => c.el).filter((el): el is HTMLElement => el != null);
  return new Set(els);
}

export type FilterKey = "champion" | "until90" | "until180" | "until365" | "older";

/** Um card "bate" com o filtro selecionado — usado pra decidir o que fica visível na tela. */
export function matchesFilter(card: EnrichedCard, filter: FilterKey, champions: Set<HTMLElement>): boolean {
  if (filter === "champion") return card.el != null && champions.has(card.el);
  const days = card.createdDaysAgo;
  if (days == null) return false;
  if (filter === "until90") return days <= 90;
  if (filter === "until180") return days > 90 && days <= 180;
  if (filter === "until365") return days > 180 && days <= 365;
  return days > 365; // "older"
}
