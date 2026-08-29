/**
 * Extrai preço e vendidos da página de um anúncio da Shopee.
 *
 * A Shopee não expõe uma API pública pra isso — lemos o HTML que o próprio
 * usuário já está vendo. Isso é inerentemente frágil (a Shopee muda a
 * estrutura da página sem aviso), então priorizamos fontes mais estáveis
 * (meta tags / JSON-LD) e só caímos pra varredura de texto como último
 * recurso. Se a Shopee mudar o layout, é aqui que precisa mexer primeiro.
 */

export type ScrapedListing = {
  price: number | null;
  soldCount: number | null;
  title: string | null;
};

function parseBRLNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function priceFromMeta(): number | null {
  const metaSelectors = [
    'meta[property="og:price:amount"]',
    'meta[property="product:price:amount"]',
    'meta[itemprop="price"]',
  ];
  for (const sel of metaSelectors) {
    const el = document.querySelector<HTMLMetaElement>(sel);
    const content = el?.content;
    if (content) {
      const n = parseFloat(content);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function priceFromJsonLd(): number | null {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  for (const script of Array.from(scripts)) {
    try {
      const data = JSON.parse(script.textContent ?? "");
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const offers = item?.offers;
        const price = offers?.price ?? offers?.[0]?.price;
        if (price != null) {
          const n = typeof price === "number" ? price : parseFloat(String(price));
          if (Number.isFinite(n)) return n;
        }
      }
    } catch {
      // JSON-LD malformado ou de outro tipo — ignora e segue tentando.
    }
  }
  return null;
}

function priceFromVisibleText(): number | null {
  // Último recurso: procura o maior valor "R$ X,XX" visível na tela — costuma
  // ser o preço em destaque do anúncio, mas pode pegar frete/parcelamento.
  const candidates = Array.from(document.querySelectorAll("div, span"))
    .filter((el) => el.children.length === 0)
    .map((el) => el.textContent?.trim() ?? "")
    .filter((t) => /^R\$\s?[\d.,]+$/.test(t));
  const values = candidates.map((t) => parseBRLNumber(t)).filter((n): n is number => n != null);
  if (values.length === 0) return null;
  return Math.max(...values);
}

function soldCountFromText(): number | null {
  const bodyText = document.body.innerText;
  const match = bodyText.match(/([\d.,]+\s?(?:mil|k)?)\s*vendidos?/i);
  if (!match) return null;
  const raw = match[1].toLowerCase().trim();
  if (raw.includes("mil") || raw.includes("k")) {
    const n = parseBRLNumber(raw.replace(/mil|k/gi, ""));
    return n != null ? Math.round(n * 1000) : null;
  }
  return parseBRLNumber(raw);
}

export function scrapeListing(): ScrapedListing {
  const price = priceFromMeta() ?? priceFromJsonLd() ?? priceFromVisibleText();
  const soldCount = soldCountFromText();
  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ??
    document.title.replace(/\s*\|\s*Shopee.*$/i, "").trim();
  return { price, soldCount, title: title || null };
}

export type EnrichedListing = {
  soldTotal: number | null;
  salesPerDay: number | null;
  rating: number | null;
  reviewCount: number | null;
  favorites: number | null;
  createdDaysAgo: number | null;
  sellerName: string | null;
  sellerLocation: string | null;
  isInternational: boolean;
};

export type EnrichedListingResult = {
  listing: EnrichedListing | null;
  /** JSON bruto capturado (ou null se nada foi capturado) — mostrado na tela quando algum campo vem vazio, pra ajustar `shopeeParse.ts` sem precisar do console. */
  rawJson: unknown;
};

async function toEnrichedListing(item: {
  sold: number | null;
  rating: number | null;
  reviewCount: number | null;
  liked: number | null;
  createdAt: Date | null;
  sellerName: string | null;
  sellerLocation: string | null;
  isInternational: boolean;
}): Promise<EnrichedListing> {
  const { daysSince, salesPerDayEstimate } = await import("../../lib/shopeeApi");
  const createdDaysAgo = daysSince(item.createdAt);
  return {
    soldTotal: item.sold,
    salesPerDay: salesPerDayEstimate(item.sold, createdDaysAgo),
    rating: item.rating,
    reviewCount: item.reviewCount,
    favorites: item.liked,
    createdDaysAgo,
    sellerName: item.sellerName,
    sellerLocation: item.sellerLocation,
    isInternational: item.isInternational,
  };
}

/**
 * Versão instantânea: se esse anúncio já foi visto numa busca antes (cache
 * de `lib/shopeeCache.ts`), devolve na hora sem esperar nenhuma captura de
 * rede — pra não deixar a página "Buscando dados..." quando o usuário já
 * tinha acabado de ver esses dados na grade de resultados.
 */
export async function getCachedListingFast(): Promise<EnrichedListing | null> {
  const { parseItemUrl } = await import("../../lib/shopeeApi");
  const { getCachedItem } = await import("../../lib/shopeeCache");

  const ids = parseItemUrl(location.href);
  if (!ids) return null;
  const item = await getCachedItem(ids.shopId, ids.itemId);
  if (!item) return null;
  return toEnrichedListing(item);
}

/**
 * Pega os campos "ricos" (nota, avaliações, favoritos, criado em, vendedor)
 * espiando a resposta que a própria página da Shopee busca ao renderizar o
 * anúncio (`pdp/get_pc`) — não vêm do HTML visível, e chamar a API por conta
 * própria é bloqueado pela proteção anti-bot deles (ver `content/inject.ts`).
 */
export async function fetchEnrichedListing(): Promise<EnrichedListingResult> {
  const { waitForCapture } = await import("../../lib/shopeeCapture");
  const { parsePdpGetPc } = await import("../../lib/shopeeParse");

  const captured = await waitForCapture("pdpGetPc");
  if (!captured) return { listing: null, rawJson: null };

  const item = parsePdpGetPc(captured.json);
  if (!item) return { listing: null, rawJson: captured.json };

  return { rawJson: captured.json, listing: await toEnrichedListing(item) };
}
