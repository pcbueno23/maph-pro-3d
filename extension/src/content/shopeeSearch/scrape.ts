/**
 * Varre os cards de produto de uma página de busca/categoria da Shopee.
 *
 * Duas camadas: (1) leitura rápida do DOM (título/preço/vendidos aproximado)
 * pra pintar algo na tela imediatamente, e (2) enriquecimento assíncrono via
 * API interna da Shopee (nota, favoritos, criado em, vendedor) — ver aviso de
 * fragilidade em `lib/shopeeApi.ts`. Cards sem link de produto reconhecível
 * são ignorados.
 */

import {
  parseItemUrl,
  fetchItemDetail,
  fetchShopDetail,
  daysSince,
  salesPerDayEstimate,
  withConcurrency,
} from "../../lib/shopeeApi";

export type ScrapedCard = {
  el: HTMLElement;
  itemId: string | null;
  shopId: string | null;
  title: string | null;
  price: number | null;
  soldCount: number;
};

export type EnrichedCard = ScrapedCard & {
  rating: number | null;
  reviewCount: number | null;
  favorites: number | null;
  createdDaysAgo: number | null;
  salesPerDay: number | null;
  sellerName: string | null;
  sellerLocation: string | null;
  isInternational: boolean;
};

function parseBRLNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function extractSoldCount(text: string): number {
  const match = text.match(/([\d.,]+\s?(?:mil|k)?)\s*vendidos?/i);
  if (!match) return 0;
  const raw = match[1].toLowerCase().trim();
  if (raw.includes("mil") || raw.includes("k")) {
    const n = parseBRLNumber(raw.replace(/mil|k/gi, ""));
    return n != null ? Math.round(n * 1000) : 0;
  }
  return parseBRLNumber(raw) ?? 0;
}

function extractPrice(text: string): number | null {
  const matches = Array.from(text.matchAll(/R\$\s?[\d.,]+/g)).map((m) => parseBRLNumber(m[0]));
  const values = matches.filter((n): n is number => n != null && n > 0);
  return values.length ? Math.min(...values) : null;
}

/** Links de anúncio da Shopee sempre terminam em "-i.<shopId>.<itemId>". */
const PRODUCT_LINK_SELECTOR = 'a[href*="-i."]';

/** Teto de cards enriquecidos via API por página — evita bombardear a Shopee numa busca com 90+ resultados. */
const MAX_ENRICH = 60;
const ENRICH_CONCURRENCY = 5;

export function scrapeSearchCards(): ScrapedCard[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR));
  const seen = new Set<HTMLElement>();
  const cards: ScrapedCard[] = [];

  for (const a of anchors) {
    const card = (a.closest("li") ?? a.closest("[class]") ?? a) as HTMLElement;
    if (seen.has(card)) continue;
    seen.add(card);

    const img = card.querySelector("img[alt]");
    const title = img?.getAttribute("alt")?.trim() || a.getAttribute("aria-label")?.trim() || null;
    const text = card.innerText || "";
    const ids = parseItemUrl(a.href);

    cards.push({
      el: card,
      itemId: ids?.itemId ?? null,
      shopId: ids?.shopId ?? null,
      title,
      price: extractPrice(text),
      soldCount: extractSoldCount(text),
    });
  }

  return cards;
}

/** Enriquece os cards (nota/favoritos/criado em/vendedor) via API, chamando `onProgress` a cada lote resolvido. */
export async function enrichCards(
  cards: ScrapedCard[],
  onProgress: (enriched: EnrichedCard[]) => void,
): Promise<EnrichedCard[]> {
  const target = cards.slice(0, MAX_ENRICH);
  const results: EnrichedCard[] = target.map((c) => ({
    ...c,
    rating: null,
    reviewCount: null,
    favorites: null,
    createdDaysAgo: null,
    salesPerDay: null,
    sellerName: null,
    sellerLocation: null,
    isInternational: false,
  }));

  await withConcurrency(results, ENRICH_CONCURRENCY, async (card) => {
    if (!card.itemId || !card.shopId) return;
    const item = await fetchItemDetail(card.shopId, card.itemId);
    if (item) {
      const createdDaysAgo = daysSince(item.createdAt);
      card.price = item.price ?? card.price;
      card.soldCount = item.sold ?? card.soldCount;
      card.rating = item.rating;
      card.reviewCount = item.reviewCount;
      card.favorites = item.liked;
      card.createdDaysAgo = createdDaysAgo;
      card.salesPerDay = salesPerDayEstimate(item.sold, createdDaysAgo);
    }
    const shop = await fetchShopDetail(card.shopId);
    if (shop) {
      card.sellerName = shop.name;
      card.sellerLocation = shop.location;
      card.isInternational = shop.isCrossBorder;
    }
    onProgress([...results]);
  });

  return results;
}
