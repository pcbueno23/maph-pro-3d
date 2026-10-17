/**
 * Acumula os produtos da LOJA capturados de `shop/rcmd_items` (ver
 * lib/shopeeCapturePatterns.ts) conforme o usuário navega pelas páginas da
 * grade da loja — cada clique de paginação dispara uma nova captura. Sem
 * casamento com elementos do DOM (diferente de shopeeSearch/scrape.ts): aqui
 * só precisamos dos NÚMEROS agregados, não de pintar nada em cima dos cards.
 */
import { onCapture } from "../../lib/shopeeCapture";
import { parseShopRcmdItems, type ParsedItem } from "../../lib/shopeeParse";
import { daysSince, salesPerDayEstimate } from "../../lib/shopeeApi";

export type ShopItem = ParsedItem & {
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

function toShopItem(item: ParsedItem): ShopItem {
  const createdDaysAgo = daysSince(item.createdAt);
  return {
    ...item,
    createdDaysAgo,
    salesPerDayEstimado: salesPerDayEstimate(item.sold, createdDaysAgo),
  };
}

/** Escuta capturas de `shopRcmdItems` (uma por página de paginação da loja) e devolve
 * a lista ACUMULADA (dedup por itemId) toda vez que uma nova chegar. */
export function watchShopItems(
  onUpdate: (items: ShopItem[]) => void,
  onDebug: (info: ShopDebugInfo) => void,
): () => void {
  const byId = new Map<string, ParsedItem>();
  let capturesReceived = 0;
  let totalNaLoja: number | null = null;

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

    onUpdate(Array.from(byId.values()).map(toShopItem));
  });

  return stop;
}
