/**
 * Varre os cards de produto de uma página de busca/categoria da Shopee.
 * Mesma ressalva do scraper de anúncio: não há API pública, então lemos o
 * HTML renderizado — frágil a mudanças de layout, priorizando sinais mais
 * estáveis (atributo `alt` da imagem, texto visível) em vez de classes CSS
 * ofuscadas.
 */

export type ScrapedCard = {
  el: HTMLElement;
  title: string | null;
  price: number | null;
  soldCount: number;
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

export function scrapeSearchCards(): ScrapedCard[] {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(PRODUCT_LINK_SELECTOR));
  const seen = new Set<HTMLElement>();
  const cards: ScrapedCard[] = [];

  for (const a of anchors) {
    // Sobe até achar um contêiner "card" razoável (evita pegar só o link/texto).
    const card = (a.closest("li") ?? a.closest("[class]") ?? a) as HTMLElement;
    if (seen.has(card)) continue;
    seen.add(card);

    const img = card.querySelector("img[alt]");
    const title = img?.getAttribute("alt")?.trim() || a.getAttribute("aria-label")?.trim() || null;
    const text = card.innerText || "";

    cards.push({
      el: card,
      title,
      price: extractPrice(text),
      soldCount: extractSoldCount(text),
    });
  }

  return cards;
}
