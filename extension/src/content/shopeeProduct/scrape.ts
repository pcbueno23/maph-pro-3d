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
