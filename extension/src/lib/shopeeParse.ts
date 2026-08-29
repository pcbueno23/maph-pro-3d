/**
 * Extrai os campos que a extensão precisa de uma resposta capturada da API
 * da Shopee. Como não consegui ver uma resposta de SUCESSO ao vivo nesta
 * sessão (só o erro de anti-bot — ver `content/inject.ts`), cada campo tenta
 * alguns caminhos plausíveis (baseados no formato conhecido/documentado pela
 * comunidade de scraping da Shopee) e cai pra `null` se nenhum bater. Se
 * algo vier "—" na tela, o console mostra o JSON bruto — é o primeiro lugar
 * pra olhar antes de mexer aqui.
 */

function pick<T = unknown>(obj: any, paths: string[]): T | null {
  for (const path of paths) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], obj);
    if (value !== undefined && value !== null) return value as T;
  }
  return null;
}

export type ParsedItem = {
  itemId: string | null;
  shopId: string | null;
  name: string | null;
  price: number | null;
  priceBeforeDiscount: number | null;
  discountPercent: number | null;
  thumbnailUrl: string | null;
  sold: number | null;
  liked: number | null;
  reviewCount: number | null;
  rating: number | null;
  createdAt: Date | null;
  sellerName: string | null;
  sellerLocation: string | null;
  isInternational: boolean;
};

function normalizePrice(raw: unknown): number | null {
  if (typeof raw !== "number") return null;
  // A Shopee historicamente manda preço em micro-unidade (÷100000); alguns
  // endpoints mais novos já mandam em reais direto. >1000 é um sinal forte
  // de que ainda está em micro-unidade pra um produto de precificação normal.
  return raw > 100000 ? raw / 100000 : raw;
}

/** Parseia um único item (usado no `pdp/get_pc`, cujo item vem "solto"). */
export function parseItemNode(node: any): ParsedItem {
  const ctime = pick<number>(node, ["ctime", "create_time", "item.ctime"]);
  return {
    itemId: String(pick(node, ["itemid", "item_id"]) ?? "") || null,
    shopId: String(pick(node, ["shopid", "shop_id"]) ?? "") || null,
    name: pick<string>(node, ["name", "title"]),
    price: normalizePrice(pick(node, ["price", "price_info.current_price", "price_min"])),
    priceBeforeDiscount: normalizePrice(
      pick(node, ["price_before_discount", "price_max_before_discount", "price_info.original_price"]),
    ),
    discountPercent: pick<number>(node, ["raw_discount", "discount"]),
    thumbnailUrl: (() => {
      const image = pick<string>(node, ["image", "images.0", "thumbnail"]);
      return image ? `https://down-br.img.susercontent.com/file/${image}` : null;
    })(),
    sold: pick<number>(node, ["historical_sold", "sold", "global_sold"]),
    liked: pick<number>(node, ["liked_count", "liked", "favorite_count"]),
    reviewCount: pick<number>(node, ["cmt_count", "comment_count", "item_rating.rating_count.0"]),
    rating: pick<number>(node, ["item_rating.rating_star", "rating_star", "item_rating.avg_rating"]),
    createdAt: typeof ctime === "number" ? new Date(ctime * 1000) : null,
    sellerName: pick<string>(node, ["shop_name", "shop.name", "shop_info.shop_name"]),
    sellerLocation: pick<string>(node, [
      "shop_location",
      "shop.shop_location",
      "shop_info.shop_location",
    ]),
    isInternational: Boolean(pick(node, ["is_cb", "shop.is_cb", "shop_info.is_cb"])),
  };
}

/** `pdp/get_pc`: o item costuma vir em algum desses caminhos. */
export function parsePdpGetPc(json: unknown): ParsedItem | null {
  const item = pick<object>(json, ["data.item", "item", "data.item_detail.item"]);
  if (!item) {
    console.error("[Maph Pro 3D] pdp/get_pc não trouxe um item reconhecível. JSON bruto:", json);
    return null;
  }
  const parsed = parseItemNode(item);
  // Vendedor às vezes vem numa seção irmã (data.shop_detailed), não dentro do item.
  const shopNode = pick<object>(json, ["data.shop_detailed", "data.shop", "shop_detailed"]);
  if (shopNode) {
    const shopParsed = parseItemNode(shopNode);
    parsed.sellerName = parsed.sellerName ?? pick<string>(shopNode, ["name", "shop_name"]);
    parsed.sellerLocation = parsed.sellerLocation ?? shopParsed.sellerLocation;
    parsed.isInternational = parsed.isInternational || Boolean(pick(shopNode, ["is_cb"]));
  }
  return parsed;
}

/** `search_items`: lista de resultados — cada item historicamente vem embrulhado em `item_basic`. */
export function parseSearchItems(json: unknown): ParsedItem[] {
  const items = pick<any[]>(json, ["items", "data.items"]) ?? [];
  if (items.length === 0) {
    console.error("[Maph Pro 3D] search_items não trouxe nenhum item reconhecível. JSON bruto:", json);
    return [];
  }
  const raw0 = items[0];
  console.debug(
    "[Maph Pro 3D] amostra do 1º item bruto de search_items (pra ajustar os caminhos de campo em shopeeParse.ts):",
    raw0,
  );
  const parsed = items.map((entry) => parseItemNode(entry.item_basic ?? entry.item ?? entry));
  console.debug("[Maph Pro 3D] 1º item já parseado:", parsed[0]);
  return parsed;
}
