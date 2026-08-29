/**
 * Varre os cards de produto de uma página de busca/categoria da Shopee — só
 * pra achar o elemento DOM de cada card (pra posicionar o selo de campeão) e
 * o itemId/shopId dele. Os DADOS (preço, vendidos, nota, vendedor...) vêm de
 * espiar a resposta de `search_items` que a própria página já busca (ver
 * `content/inject.ts` + `lib/shopeeCapture.ts`) — chamar a API por conta
 * própria é bloqueado pela proteção anti-bot da Shopee.
 */

import { parseItemUrl } from "../../lib/shopeeApi";
import { onCapture } from "../../lib/shopeeCapture";
import { parseSearchItems, type ParsedItem } from "../../lib/shopeeParse";
import { daysSince, salesPerDayEstimate } from "../../lib/shopeeApi";

export type CardElement = { el: HTMLElement; itemId: string | null; shopId: string | null };

export type EnrichedCard = ParsedItem & {
  el: HTMLElement | null;
  soldCount: number; // alias de `sold`, sempre numérico (0 se desconhecido) — facilita soma/agregação
  createdDaysAgo: number | null;
  salesPerDay: number | null;
};

const PRODUCT_LINK_SELECTOR = 'a[href*="-i."]';

export function scrapeCardElements(): CardElement[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR));
  const seen = new Set<HTMLElement>();
  const cards: CardElement[] = [];

  for (const a of anchors) {
    const card = (a.closest("li") ?? a.closest("[class]") ?? a) as HTMLElement;
    if (seen.has(card)) continue;
    seen.add(card);
    const ids = parseItemUrl(a.href);
    cards.push({ el: card, itemId: ids?.itemId ?? null, shopId: ids?.shopId ?? null });
  }

  return cards;
}

function toEnrichedCard(item: ParsedItem, el: HTMLElement | null): EnrichedCard {
  const createdDaysAgo = daysSince(item.createdAt);
  return {
    ...item,
    el,
    soldCount: item.sold ?? 0,
    createdDaysAgo,
    salesPerDay: salesPerDayEstimate(item.sold, createdDaysAgo),
  };
}

export type SearchDebugInfo = {
  capturesReceived: number;
  itemsFoundLastCapture: number;
  /** Preenchido só quando `itemsFoundLastCapture === 0` — o JSON completo, pra achar o caminho certo de "items". */
  rawJsonWhenEmpty: unknown;
  /** Preenchido quando itens foram encontrados — o 1º item cru, pra achar os nomes de campo certos. */
  rawFirstEntry: unknown;
};

/**
 * Escuta capturas de `search_items` (pode disparar mais de uma vez — scroll
 * infinito, paginação) e devolve a lista combinada de cards enriquecidos,
 * casados com os elementos DOM por itemId+shopId. Chama `onUpdate` a cada
 * nova captura, e `onDebug` sempre junto (mesmo quando não achou nada) —
 * pensado pra aparecer na tela do painel, não no console.
 */
export function watchSearchItems(
  onUpdate: (cards: EnrichedCard[]) => void,
  onDebug: (info: SearchDebugInfo) => void,
): () => void {
  const byId = new Map<string, ParsedItem>();
  let capturesReceived = 0;

  const stop = onCapture("searchItems", (capture) => {
    capturesReceived += 1;
    const { items, rawJson, rawFirstEntry } = parseSearchItems(capture.json);
    onDebug({
      capturesReceived,
      itemsFoundLastCapture: items.length,
      rawJsonWhenEmpty: items.length === 0 ? rawJson : null,
      rawFirstEntry,
    });

    for (const item of items) {
      if (!item.itemId) continue;
      byId.set(`${item.shopId}:${item.itemId}`, item);
    }

    const elements = scrapeCardElements();
    const elByKey = new Map(elements.map((c) => [`${c.shopId}:${c.itemId}`, c.el]));

    const merged: EnrichedCard[] = Array.from(byId.values()).map((item) =>
      toEnrichedCard(item, elByKey.get(`${item.shopId}:${item.itemId}`) ?? null),
    );
    onUpdate(merged);
  });

  return stop;
}
