/**
 * Acumula os produtos da LOJA capturados de `shop/rcmd_items` (ver
 * lib/shopeeCapturePatterns.ts) conforme o usuário navega pelas páginas da
 * grade da loja — cada clique de paginação dispara uma nova captura. Casa
 * cada item com o elemento DOM do card real (igual shopeeSearch/scrape.ts,
 * via lib/cardDom.ts compartilhado) pra poder pintar um mini-card individual
 * embaixo de CADA anúncio da loja, não só o resumo agregado.
 */
import { onCapture } from "../../lib/shopeeCapture";
import { parseShopRcmdItems, type ParsedItem } from "../../lib/shopeeParse";
import { daysSince, salesPerDayEstimate } from "../../lib/shopeeApi";
import { scrapeCardElements } from "../../lib/cardDom";

export type ShopItem = ParsedItem & {
  el: HTMLElement | null;
  createdDaysAgo: number | null;
  salesPerDayEstimado: number | null;
};

export type ShopDebugInfo = {
  capturesReceived: number;
  itemsFoundLastCapture: number;
  totalNaLoja: number | null;
  rawJsonWhenEmpty: unknown;
  rawFirstEntry: unknown;
};

function toShopItem(item: ParsedItem, el: HTMLElement | null): ShopItem {
  const createdDaysAgo = daysSince(item.createdAt);
  return {
    ...item,
    el,
    createdDaysAgo,
    salesPerDayEstimado: salesPerDayEstimate(item.sold, createdDaysAgo),
  };
}

/** Escuta capturas de `shopRcmdItems` (uma por página de paginação da loja) e devolve
 * a lista ACUMULADA (dedup por itemId), casada com os elementos DOM, toda vez que uma
 * nova captura chegar OU que novos cards aparecerem no DOM (scroll/paginação). */
export function watchShopItems(
  onUpdate: (items: ShopItem[]) => void,
  onDebug: (info: ShopDebugInfo) => void,
): () => void {
  const byId = new Map<string, ParsedItem>();
  let capturesReceived = 0;
  let totalNaLoja: number | null = null;
  let rematchTimer: number | undefined;
  let firstPendingMutationAt: number | null = null;

  const rematch = () => {
    const elements = scrapeCardElements();
    const elByItemId = new Map(elements.map((c) => [c.itemId, c.el]));
    const merged = Array.from(byId.values()).map((item) =>
      toShopItem(item, item.itemId ? (elByItemId.get(item.itemId) ?? null) : null),
    );
    onUpdate(merged);
  };

  // Mesmo debounce com teto de 1s usado em shopeeSearch/scrape.ts — ver
  // comentário lá pro motivo (SPA barulhenta, não pode esperar pra sempre).
  const scheduleRematch = () => {
    const now = Date.now();
    if (firstPendingMutationAt == null) firstPendingMutationAt = now;
    const waitingTooLong = now - firstPendingMutationAt > 1000;
    if (rematchTimer != null) window.clearTimeout(rematchTimer);
    rematchTimer = window.setTimeout(
      () => {
        firstPendingMutationAt = null;
        rematch();
      },
      waitingTooLong ? 0 : 250,
    );
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        scheduleRematch();
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const stop = onCapture("shopRcmdItems", (capture) => {
    capturesReceived += 1;
    const { items, total, rawJson, rawFirstEntry } = parseShopRcmdItems(capture.json);
    if (total != null) totalNaLoja = total;

    onDebug({
      capturesReceived,
      itemsFoundLastCapture: items.length,
      totalNaLoja,
      rawJsonWhenEmpty: items.length === 0 ? rawJson : null,
      rawFirstEntry,
    });

    for (const item of items) {
      if (!item.itemId) continue;
      byId.set(item.itemId, item);
    }

    rematch();
    for (const delay of [300, 800, 1800]) window.setTimeout(rematch, delay);
  });

  return () => {
    stop();
    observer.disconnect();
    if (rematchTimer != null) window.clearTimeout(rematchTimer);
  };
}
