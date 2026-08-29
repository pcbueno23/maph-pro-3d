/**
 * Extrai os campos que a extensão precisa de uma resposta capturada da API
 * da Shopee. Os caminhos abaixo foram confirmados com uma resposta real de
 * `search_items` capturada ao vivo (28/08/2026) — a Shopee mistura, no mesmo
 * resultado de busca, itens ORGÂNICOS (`item_basic` preenchido, formato
 * "clássico" documentado pela comunidade) e itens PATROCINADOS/ADS
 * (`item_basic: null`, dado de verdade em `item_data` +
 * `item_card_displayed_asset`) — por isso cada campo tenta os dois formatos.
 * Se algo ainda vier "—" na tela, a aba "⚙" do painel mostra o JSON bruto
 * capturado — é o primeiro lugar pra olhar antes de mexer aqui.
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
  // Preço sempre em micro-unidade (÷100000) nos dois formatos confirmados
  // (ex.: 4990000 = R$49,90). >1000 é sinal forte de micro-unidade pra um
  // produto de precificação normal — evita dividir um preço que já viesse cru.
  return raw > 100000 ? raw / 100000 : raw;
}

/** Soma o array `rating_count` (contagem por nº de estrelas) — não é um total pronto em nenhum formato. */
function sumRatingCount(arr: unknown): number | null {
  if (!Array.isArray(arr)) return null;
  const sum = arr.reduce((acc: number, n) => acc + (typeof n === "number" ? n : 0), 0);
  return Number.isFinite(sum) ? sum : null;
}

/**
 * Parseia um item de `search_items` (orgânico OU patrocinado) ou de
 * `pdp/get_pc`. Cada campo tenta, nessa ordem: formato orgânico
 * (`item_basic.*`), formato patrocinado (`item_data.*` /
 * `item_card_displayed_asset.*`), e por fim alguns nomes soltos de
 * fallback pro caso de `pdp/get_pc` ter uma forma diferente.
 */
export function parseItemNode(node: any): ParsedItem {
  const ratingCountArr = pick<unknown[]>(node, [
    "item_basic.item_rating.rating_count",
    "item_data.item_rating.rating_count",
    "item_rating.rating_count",
  ]);

  return {
    itemId: String(pick(node, ["itemid", "item_id", "item_data.itemid"]) ?? "") || null,
    shopId: String(pick(node, ["shopid", "shop_id", "item_data.shopid"]) ?? "") || null,
    name: pick<string>(node, [
      "item_basic.name",
      "item_card_displayed_asset.name",
      "name",
      "title",
    ]),
    price: normalizePrice(
      pick(node, [
        "item_basic.price",
        "item_data.item_card_display_price.price",
        "item_card_displayed_asset.display_price.price",
        "price",
        "price_info.current_price",
        "price_min",
      ]),
    ),
    priceBeforeDiscount: normalizePrice(
      pick(node, [
        "item_basic.price_before_discount",
        "item_data.item_card_display_price.original_price",
        "item_card_displayed_asset.display_price.strikethrough_price",
        "price_before_discount",
        "price_info.original_price",
      ]),
    ),
    discountPercent: pick<number>(node, [
      "item_basic.raw_discount",
      "item_data.item_card_display_price.discount",
      "raw_discount",
      "discount",
    ]),
    thumbnailUrl: (() => {
      const image = pick<string>(node, [
        "item_basic.image",
        "item_card_displayed_asset.image",
        "image",
        "images.0",
        "thumbnail",
      ]);
      return image ? `https://down-br.img.susercontent.com/file/${image}` : null;
    })(),
    sold: pick<number>(node, [
      "item_basic.historical_sold",
      "item_data.item_card_display_sold_count.historical_sold_count",
      "historical_sold",
      "sold",
      "global_sold",
    ]),
    liked: pick<number>(node, [
      "item_basic.liked_count",
      "item_data.liked_count",
      "liked_count",
      "liked",
      "favorite_count",
    ]),
    reviewCount:
      sumRatingCount(ratingCountArr) ??
      pick<number>(node, ["item_basic.cmt_count", "cmt_count", "comment_count"]),
    rating: pick<number>(node, [
      "item_basic.item_rating.rating_star",
      "item_data.item_rating.rating_star",
      "item_rating.rating_star",
      "rating_star",
    ]),
    createdAt: (() => {
      const ctime = pick<number>(node, ["item_basic.ctime", "item_data.ctime", "ctime", "create_time"]);
      return typeof ctime === "number" ? new Date(ctime * 1000) : null;
    })(),
    sellerName: pick<string>(node, [
      "item_basic.shop_name",
      "item_data.shop_data.shop_name",
      "shop_name",
      "shop.name",
    ]),
    sellerLocation: pick<string>(node, [
      "item_basic.shop_location",
      "item_card_displayed_asset.shop_location",
      "shop_location",
      "shop.shop_location",
    ]),
    isInternational: Boolean(
      pick(node, ["item_basic.is_cb", "item_data.is_cb", "is_cb", "shop.is_cb"]),
    ),
  };
}

/** `pdp/get_pc`: o item costuma vir em algum desses caminhos. */
export function parsePdpGetPc(json: unknown): ParsedItem | null {
  const item = pick<object>(json, ["data.item", "item", "data.item_detail.item"]);
  if (!item) return null;

  const parsed = parseItemNode(item);
  // Vendedor às vezes vem numa seção irmã (data.shop_detailed), não dentro do item.
  const shopNode = pick<object>(json, ["data.shop_detailed", "data.shop", "shop_detailed"]);
  if (shopNode) {
    parsed.sellerName = parsed.sellerName ?? pick<string>(shopNode, ["name", "shop_name"]);
    parsed.sellerLocation = parsed.sellerLocation ?? pick<string>(shopNode, ["shop_location"]);
    parsed.isInternational = parsed.isInternational || Boolean(pick(shopNode, ["is_cb"]));
  }
  return parsed;
}

export type SearchItemsParseResult = {
  items: ParsedItem[];
  /** JSON bruto completo da resposta — pra debug quando `items` vem vazio (path "items"/"data.items" errado). */
  rawJson: unknown;
  /** O 1º item, ainda cru — pra debug de nomes de campo quando os itens vêm, mas algum valor não bate. */
  rawFirstEntry: unknown;
};

/** `search_items`: lista de resultados — cada entrada é orgânica ou patrocinada, `parseItemNode` cobre as duas. */
export function parseSearchItems(json: unknown): SearchItemsParseResult {
  const items = pick<any[]>(json, ["items", "data.items"]) ?? [];
  if (items.length === 0) {
    return { items: [], rawJson: json, rawFirstEntry: null };
  }
  const rawFirstEntry = items[0];
  const parsed = items.map((entry) => parseItemNode(entry));
  return { items: parsed, rawJson: json, rawFirstEntry };
}
