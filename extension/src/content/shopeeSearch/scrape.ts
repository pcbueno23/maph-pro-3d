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

/**
 * Sobe a partir do link até achar o container do "card" inteiro — não dá
 * pra confiar em `<li>` ou na 1ª classe CSS encontrada porque a Shopee usa
 * nomes de classe ofuscados/trocados sem aviso. Heurística: sobe até achar
 * um nível cujo PAI tem vários filhos parecidos (>=5) — sinal forte de estar
 * numa grade/lista junto de outros cards.
 */
function findCardContainer(a: HTMLAnchorElement): HTMLElement {
  let el: HTMLElement = a;
  for (let i = 0; i < 6; i++) {
    const parent = el.parentElement;
    if (!parent) break;
    if (parent.children.length >= 5) return el;
    el = parent;
  }
  return el;
}

export function scrapeCardElements(): CardElement[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR));
  const seen = new Set<HTMLElement>();
  const cards: CardElement[] = [];

  for (const a of anchors) {
    const card = findCardContainer(a);
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
 *
 * O "casamento" com o DOM é refeito de duas formas: (1) com atraso crescente
 * logo após cada captura de rede (a resposta chega antes da Shopee terminar
 * de renderizar os cards correspondentes) e (2) sempre que novos cards
 * aparecem no DOM — a Shopee costuma já ter os dados de TODOS os itens numa
 * única resposta, mas só desenha o restante conforme o usuário rola a
 * página, então sem isso só os primeiros ~20-25 cards visíveis no carregamento
 * inicial ganhariam o card de estatísticas.
 */
export function watchSearchItems(
  onUpdate: (cards: EnrichedCard[]) => void,
  onDebug: (info: SearchDebugInfo) => void,
): () => void {
  const byId = new Map<string, ParsedItem>();
  let capturesReceived = 0;
  let rematchTimer: number | undefined;
  let firstPendingMutationAt: number | null = null;

  const rematch = () => {
    const elements = scrapeCardElements();
    const elByKey = new Map(elements.map((c) => [`${c.shopId}:${c.itemId}`, c.el]));
    const merged: EnrichedCard[] = Array.from(byId.values()).map((item) =>
      toEnrichedCard(item, elByKey.get(`${item.shopId}:${item.itemId}`) ?? null),
    );
    onUpdate(merged);
  };

  // Debounce normal de 250ms após a última mutação — mas se o DOM ficar
  // mudando sem parar por mais de 1s (comum numa SPA barulhenta como a da
  // Shopee), força rodar mesmo assim em vez de esperar pra sempre.
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

  // Reage a cards novos aparecendo no DOM (scroll infinito) sem precisar de
  // uma nova captura de rede — debounced pra não rodar a cada mutação isolada
  // numa página tão barulhenta quanto a da Shopee.
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.addedNodes.length > 0) {
        scheduleRematch();
        return;
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

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

    rematch();
    for (const delay of [300, 800, 1800]) window.setTimeout(rematch, delay);
  });

  return () => {
    stop();
    observer.disconnect();
    if (rematchTimer != null) window.clearTimeout(rematchTimer);
  };
}
