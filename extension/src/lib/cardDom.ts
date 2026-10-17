/**
 * Acha os elementos DOM dos cards de produto REAIS da Shopee (pra casar com
 * os dados vindos da API capturada e posicionar overlays em cima deles).
 * Genérico o bastante pra servir tanto a grade de busca quanto a grade de
 * uma loja — as duas usam o mesmo formato de link canônico de produto.
 */
import { parseItemUrl } from "./shopeeApi";

export type CardElement = { el: HTMLElement; itemId: string | null; shopId: string | null };

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
