/**
 * Cliente da API oficial do Mercado Livre (developers.mercadolivre.com.br) —
 * OAuth 2.0 (authorization code) + Orders API. access_token expira em 6h,
 * refresh_token dura mais mas some se ficar muito tempo sem uso — por isso
 * o cron de sincronização (ver app/api/cron/ml-sync) deve rodar com
 * frequência suficiente pra manter a conexão viva.
 */

const API_BASE = "https://api.mercadolibre.com";
const AUTH_BASE = "https://auth.mercadolivre.com.br";

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} não configurado no servidor.`);
  return v;
}

function redirectUri(): string {
  const explicit = process.env.ML_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.maphpro3d.com";
  return `${appUrl.replace(/\/$/, "")}/api/ml/oauth/callback`;
}

export function mlAuthorizationUrl(state: string): string {
  const clientId = env("ML_CLIENT_ID");
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri(),
    state,
  });
  return `${AUTH_BASE}/authorization?${params.toString()}`;
}

type MlTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  user_id: number;
  refresh_token?: string;
};

export type MlTokenResult =
  | { ok: true; accessToken: string; refreshToken: string; expiresInSec: number; mlUserId: string }
  | { ok: false; status: number; body: string };

async function postForm(url: string, body: Record<string, string>): Promise<MlTokenResult> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(body).toString(),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
  let json: MlTokenResponse;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
  if (!json.access_token || !json.refresh_token) {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
  return {
    ok: true,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresInSec: json.expires_in,
    mlUserId: String(json.user_id),
  };
}

/** Troca o "code" do redirect OAuth pelos tokens da loja. */
export async function mlExchangeCode(code: string): Promise<MlTokenResult> {
  return postForm(`${API_BASE}/oauth/token`, {
    grant_type: "authorization_code",
    client_id: env("ML_CLIENT_ID"),
    client_secret: env("ML_CLIENT_SECRET"),
    code,
    redirect_uri: redirectUri(),
  });
}

/** Renova o access_token — necessário porque ele expira a cada 6h. */
export async function mlRefreshToken(refreshToken: string): Promise<MlTokenResult> {
  return postForm(`${API_BASE}/oauth/token`, {
    grant_type: "refresh_token",
    client_id: env("ML_CLIENT_ID"),
    client_secret: env("ML_CLIENT_SECRET"),
    refresh_token: refreshToken,
  });
}

export async function mlFetchUser(
  accessToken: string,
): Promise<{ ok: true; nickname: string | null } | { ok: false; status: number; body: string }> {
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 300) };
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 300) };
  }
  return { ok: true, nickname: json?.nickname ?? null };
}

export type MlOrderItem = {
  title: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

export type MlOrder = {
  id: string;
  dateClosed: string;
  status: string;
  totalAmount: number;
  items: MlOrderItem[];
};

/**
 * Busca pedidos pagos/concluídos de um vendedor, paginados. `sinceIso` filtra
 * por data de fechamento (order.date_closed) pra sincronização incremental.
 */
export async function mlFetchOrders(
  accessToken: string,
  sellerId: string,
  opts: { sinceIso?: string; offset?: number; limit?: number } = {},
): Promise<{ ok: true; orders: MlOrder[]; total: number } | { ok: false; status: number; body: string }> {
  const params = new URLSearchParams({
    seller: sellerId,
    "order.status": "paid",
    sort: "date_desc",
    offset: String(opts.offset ?? 0),
    limit: String(opts.limit ?? 50),
  });
  if (opts.sinceIso) params.set("order.date_closed.from", opts.sinceIso);

  const res = await fetch(`${API_BASE}/orders/search?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
  const results = Array.isArray(json?.results) ? json.results : [];
  const orders: MlOrder[] = results.map((o: any) => ({
    id: String(o.id),
    dateClosed: o.date_closed ?? o.date_created ?? new Date().toISOString(),
    status: o.status ?? "unknown",
    totalAmount: Number(o.total_amount) || 0,
    items: Array.isArray(o.order_items)
      ? o.order_items.map((oi: any) => ({
          title: oi.item?.title ?? "Item sem título",
          sku: oi.item?.seller_sku ?? oi.item?.seller_custom_field ?? null,
          quantity: Number(oi.quantity) || 1,
          unitPrice: Number(oi.unit_price) || 0,
        }))
      : [],
  }));
  return { ok: true, orders, total: Number(json?.paging?.total) || orders.length };
}
