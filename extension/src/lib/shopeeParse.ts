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
  /** Vendido nos últimos 30 dias — só vem preenchido em endpoints que trazem
   * `monthly_sold_count` (ex.: shop/rcmd_items). Confirmado ao vivo que às vezes vem 0
   * mesmo pra item com vendas (ver comentário de `parseDisplayCount`/sold abaixo) —
   * trate como "dado da Shopee, mas pode subestimar"; prefira o `salesPerDay` estimado
   * (histórico ÷ dias no ar) quando precisar de um número mais confiável. */
  soldMonthly: number | null;
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

/** `pdp/get_pc` só traz "vendidos" como texto formatado ("672", "1,2mil") — não como número limpo. */
function parseDisplayCount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return null;
  const lower = value.toLowerCase();
  const cleaned = lower.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return lower.includes("mil") ? Math.round(n * 1000) : Math.round(n);
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
        "item_card_display_price.price", // shop/rcmd_items (sem o prefixo "item_data.")
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
        "item_card_display_price.original_price", // shop/rcmd_items
        "item_card_displayed_asset.display_price.strikethrough_price",
        "price_before_discount",
        "price_info.original_price",
      ]),
    ),
    discountPercent: pick<number>(node, [
      "item_basic.raw_discount",
      "item_data.item_card_display_price.discount",
      "item_card_display_price.discount", // shop/rcmd_items
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
    // Em shop/rcmd_items, confirmado ao vivo (17/10/2026) que o campo numérico
    // "historical_sold_count" vem 0 mesmo em item com vendas reais — só o texto
    // formatado "historical_sold_count_text" ("12 Vendido(s)") tem o valor certo
    // (mesma pegadinha que o pdp/get_pc já tinha, ver parsePdpGetPc). Por isso o
    // texto é tentado ANTES do número aqui — não quebra os outros endpoints porque
    // eles não têm esse campo de texto (pick só "acha" o que existir de fato).
    // Em search_items, confirmado ao vivo (23/10/2026) que o caminho é outro:
    // "item_card_displayed_asset.sold_count.text" (não "item_card_display_sold_count",
    // que vem null nesse endpoint) — por isso "Vendidos"/"vendas por dia"/"campeões"
    // vinham todos vazios na busca até essa correção.
    sold:
      parseDisplayCount(
        pick(node, [
          "item_card_display_sold_count.historical_sold_count_text",
          "item_card_displayed_asset.sold_count.text", // search_items
        ]),
      ) ??
      pick<number>(node, [
        "item_basic.historical_sold",
        "item_data.item_card_display_sold_count.historical_sold_count",
        "item_card_display_sold_count.historical_sold_count", // shop/rcmd_items
        "historical_sold",
        "sold",
        "global_sold",
      ]),
    // "Últimos 30 dias" direto da Shopee — mesma pegadinha do historical_sold_count:
    // confirmado ao vivo (17/10/2026) que "monthly_sold_count" (número) vem 0 mesmo em
    // item com "monthly_sold_count_text": "105 Vendido/Mês" — texto tentado ANTES do
    // número pelo mesmo motivo. O painel da loja ainda assim calcula uma estimativa
    // própria (histórico ÷ dias no ar) como checagem cruzada, nunca só confia aqui.
    soldMonthly:
      parseDisplayCount(pick(node, ["item_card_display_sold_count.monthly_sold_count_text"])) ??
      pick<number>(node, [
        "item_card_display_sold_count.monthly_sold_count",
        "item_data.item_card_display_sold_count.monthly_sold_count",
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
      "shop_data.shop_name", // shop/rcmd_items
      "shop_name",
      "shop.name",
    ]),
    sellerLocation: pick<string>(node, [
      "item_basic.shop_location",
      "item_data.shop_data.shop_location",
      "shop_data.shop_location", // shop/rcmd_items
      "item_card_displayed_asset.shop_location",
      "shop_location",
      "shop.shop_location",
    ]),
    isInternational: Boolean(
      pick(node, ["item_basic.is_cb", "item_data.is_cb", "is_cb", "shop.is_cb"]),
    ),
  };
}

/**
 * `pdp/get_pc`: o item vem em `data.item`, mas vendidos/avaliações/favoritos
 * de verdade ficam numa seção IRMÃ — `data.product_review` — não dentro do
 * item (confirmado com resposta real capturada ao vivo em 29/08/2026:
 * `product_review.liked_count`, `product_review.total_rating_count`,
 * `product_review.historical_sold_display` — esse último só existe como
 * texto formatado "672", não como número).
 */
export function parsePdpGetPc(json: unknown): ParsedItem | null {
  const item = pick<object>(json, ["data.item", "item", "data.item_detail.item"]);
  if (!item) return null;

  const parsed = parseItemNode(item);

  const reviewNode = pick<any>(json, ["data.product_review", "product_review"]);
  if (reviewNode) {
    parsed.sold =
      parsed.sold ??
      parseDisplayCount(
        pick(reviewNode, ["historical_sold_display", "sold_count_display", "global_sold_display"]),
      ) ??
      pick<number>(reviewNode, ["historical_sold", "global_sold"]);
    parsed.liked = parsed.liked ?? pick<number>(reviewNode, ["liked_count"]);
    parsed.reviewCount =
      parsed.reviewCount ?? pick<number>(reviewNode, ["total_rating_count", "cmt_count"]);
    parsed.rating = parsed.rating ?? pick<number>(reviewNode, ["rating_star"]);
  }

  // Vendedor às vezes vem numa seção irmã (data.shop_detailed), não dentro do item.
  const shopNode = pick<object>(json, ["data.shop_detailed", "data.shop", "shop_detailed"]);
  if (shopNode) {
    parsed.sellerName = parsed.sellerName ?? pick<string>(shopNode, ["name", "shop_name"]);
    parsed.sellerLocation =
      parsed.sellerLocation ?? pick<string>(shopNode, ["place", "shop_location"]);
    parsed.isInternational = parsed.isInternational || Boolean(pick(shopNode, ["is_cb"]));
  }
  return parsed;
}

export type SearchItemsParseResult = {
  items: ParsedItem[];
  /** JSON bruto completo da resposta — pra debug quando `items` vem vazio (path "items"/"data.items" errado). */
  rawJson: unknown;
  /** O 1º item, ainda cru — pra debug de nomes de campo quando os itens vêm, mas algum valor não bate. O 1º
   * resultado costuma ser um anúncio patrocinado ("Ad"), que pode ter campos vazios só por ser patrocinado
   * (ex.: vendido oculto) — por isso `rawOrganicEntry` abaixo serve de 2ª amostra pra comparar. */
  rawFirstEntry: unknown;
  /** 1º item ORGÂNICO (não patrocinado) da lista, cru — identificado por ter `item_basic` preenchido (os
   * patrocinados vêm com `item_basic: null`, dado real em `item_data`/`item_card_displayed_asset`). Null
   * quando a página só tem patrocinados na amostra capturada. */
  rawOrganicEntry: unknown;
};

/** `search_items`: lista de resultados — cada entrada é orgânica ou patrocinada, `parseItemNode` cobre as duas. */
export function parseSearchItems(json: unknown): SearchItemsParseResult {
  const items = pick<any[]>(json, ["items", "data.items"]) ?? [];
  if (items.length === 0) {
    return { items: [], rawJson: json, rawFirstEntry: null, rawOrganicEntry: null };
  }
  const rawFirstEntry = items[0];
  const rawOrganicEntry = items.find((entry) => entry?.item_basic != null) ?? null;
  const parsed = items.map((entry) => parseItemNode(entry));
  return { items: parsed, rawJson: json, rawFirstEntry, rawOrganicEntry };
}

export type ShopRcmdItemsParseResult = SearchItemsParseResult & {
  /** Total de produtos da loja (segundo a própria Shopee) — pode ser bem maior que
   * `items.length` nessa captura: a loja pagina, e só capturamos a(s) página(s) que o
   * usuário realmente visitou. Usado pra deixar claro na tela que o dado é parcial. */
  total: number | null;
};

/** `shop/rcmd_items` (página da loja): lista em `data.centralize_item_card.item_cards`
 * — confirmado ao vivo em 17/10/2026 (ver CAPTURE_PATTERNS.shopRcmdItems). */
export function parseShopRcmdItems(json: unknown): ShopRcmdItemsParseResult {
  const items = pick<any[]>(json, ["data.centralize_item_card.item_cards"]) ?? [];
  const total = pick<number>(json, ["data.total"]);
  if (items.length === 0) {
    return { items: [], rawJson: json, rawFirstEntry: null, rawOrganicEntry: null, total };
  }
  const rawFirstEntry = items[0];
  const rawOrganicEntry = items.find((entry) => entry?.item_basic != null) ?? null;
  const parsed = items.map((entry) => parseItemNode(entry));
  return { items: parsed, rawJson: json, rawFirstEntry, rawOrganicEntry, total };
}
