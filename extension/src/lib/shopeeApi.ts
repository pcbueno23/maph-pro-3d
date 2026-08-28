/**
 * Cliente pro endpoint JSON interno da Shopee (`/api/v4/...`) — o mesmo que o
 * próprio site usa pra montar a página. Chamado same-origin, na sessão do
 * usuário (sem servidor terceiro, sem CORS). Não é uma API pública
 * documentada — é reverse-engineered, igual toda ferramenta desse tipo faz,
 * e pode mudar de formato sem aviso. Todo campo é lido com fallback opcional
 * de propósito: se a Shopee mudar o schema, a extensão degrada mostrando "—"
 * em vez de quebrar.
 *
 * ⚠️ Isto NÃO foi testado contra a Shopee ao vivo nesta sessão (sem acesso a
 * browser real) — os nomes de campo seguem o schema conhecido/documentado
 * pela comunidade de scraping, mas precisa de uma passada de teste real
 * antes de confiar 100%. Se algo vier "—" que deveria vir preenchido, é aqui
 * que precisa ajustar primeiro.
 */

export type ShopeeItemDetail = {
  itemId: string;
  shopId: string;
  name: string | null;
  price: number | null;
  sold: number | null;
  liked: number | null;
  reviewCount: number | null;
  rating: number | null;
  createdAt: Date | null;
};

export type ShopeeShopDetail = {
  shopId: string;
  name: string | null;
  location: string | null;
  isOfficialShop: boolean;
  isCrossBorder: boolean;
};

/** Extrai shopId/itemId de uma URL de anúncio Shopee (padrão "...-i.<shopId>.<itemId>"). */
export function parseItemUrl(url: string): { shopId: string; itemId: string } | null {
  const match = url.match(/-i\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { shopId: match[1], itemId: match[2] };
}

async function fetchJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchItemDetail(shopId: string, itemId: string): Promise<ShopeeItemDetail | null> {
  const data = await fetchJson(
    `https://shopee.com.br/api/v4/item/get?itemid=${itemId}&shopid=${shopId}`,
  );
  const item = data?.data ?? data?.item;
  if (!item) return null;

  return {
    itemId,
    shopId,
    name: item.name ?? null,
    price: typeof item.price === "number" ? item.price / 100000 : null,
    sold: item.historical_sold ?? item.sold ?? null,
    liked: item.liked_count ?? null,
    reviewCount: item.cmt_count ?? null,
    rating: item.item_rating?.rating_star ?? null,
    createdAt: typeof item.ctime === "number" ? new Date(item.ctime * 1000) : null,
  };
}

const shopCache = new Map<string, Promise<ShopeeShopDetail | null>>();

export function fetchShopDetail(shopId: string): Promise<ShopeeShopDetail | null> {
  const cached = shopCache.get(shopId);
  if (cached) return cached;

  const promise = (async () => {
    const data = await fetchJson(`https://shopee.com.br/api/v4/shop/get_shop_detail?shopid=${shopId}`);
    const shop = data?.data ?? data;
    if (!shop) return null;

    const state = shop.shop_location ?? shop.address?.state ?? null;
    return {
      shopId,
      name: shop.name ?? shop.account?.username ?? null,
      location: state,
      isOfficialShop: Boolean(shop.is_official_shop ?? shop.shopee_verified),
      isCrossBorder: Boolean(shop.is_cb ?? shop.is_cross_border),
    } as ShopeeShopDetail;
  })();

  shopCache.set(shopId, promise);
  return promise;
}

export function daysSince(date: Date | null): number | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function salesPerDayEstimate(sold: number | null, createdDaysAgo: number | null): number | null {
  if (sold == null) return null;
  const days = Math.max(1, createdDaysAgo ?? 1);
  return sold / days;
}

/** Roda `fetchers` com no máximo `limit` chamadas simultâneas — evita bombardear a Shopee numa página com 90+ cards. */
export async function withConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      await fn(current);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
