/**
 * Cliente da API oficial Shopee Open Platform v2 (open.shopee.com) — assinatura
 * HMAC-SHA256 obrigatória em toda chamada. Base string:
 *   - Endpoint público (sem token, ex: shop/auth_partner, auth/token/get):
 *       partner_id + path + timestamp
 *   - Endpoint de loja (com access_token, ex: order/get_order_list):
 *       partner_id + path + timestamp + access_token + shop_id
 * sign = HMAC-SHA256(base_string, partner_key) em hex.
 * Fonte: documentação oficial (open.shopee.com/documents) + confirmado cruzando
 * SDKs de terceiros — validar contra a resposta real do sandbox antes de ir a produção.
 */
import { createHmac } from "crypto";

function env(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name} não configurado no servidor.`);
  return v;
}

/** Sandbox por padrão — só usa produção se SHOPEE_API_BASE apontar explicitamente pra ela. */
function apiBase(): string {
  return process.env.SHOPEE_API_BASE?.trim() || "https://partner.test-stable.shopeemobile.com";
}

function sign(path: string, timestamp: number, extra = ""): string {
  const partnerKey = env("SHOPEE_PARTNER_KEY");
  const partnerId = env("SHOPEE_PARTNER_ID");
  const base = `${partnerId}${path}${timestamp}${extra}`;
  return createHmac("sha256", partnerKey).update(base).digest("hex");
}

/** Timestamp da assinatura no fluxo de autorização (shop/auth_partner) — sem access_token/shop_id. */
export function buildAuthPartnerUrl(redirectUri: string): string {
  const partnerId = env("SHOPEE_PARTNER_ID");
  const timestamp = Math.floor(Date.now() / 1000);
  const path = "/api/v2/shop/auth_partner";
  const signature = sign(path, timestamp);
  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    sign: signature,
    redirect: redirectUri,
  });
  return `${apiBase()}${path}?${params.toString()}`;
}

type ShopeeFetchResult = { ok: true; json: any } | { ok: false; status: number; body: string };

async function callPublic(path: string, body: Record<string, unknown>): Promise<ShopeeFetchResult> {
  const partnerId = env("SHOPEE_PARTNER_ID");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(path, timestamp);
  const params = new URLSearchParams({ partner_id: partnerId, timestamp: String(timestamp), sign: signature });
  const res = await fetch(`${apiBase()}${path}?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
}

async function callShop(
  path: string,
  accessToken: string,
  shopId: number,
  query: Record<string, string> = {},
): Promise<ShopeeFetchResult> {
  const partnerId = env("SHOPEE_PARTNER_ID");
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(path, timestamp, `${accessToken}${shopId}`);
  const params = new URLSearchParams({
    partner_id: partnerId,
    timestamp: String(timestamp),
    sign: signature,
    access_token: accessToken,
    shop_id: String(shopId),
    ...query,
  });
  const res = await fetch(`${apiBase()}${path}?${params.toString()}`, {
    headers: { "content-type": "application/json" },
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body: text.slice(0, 500) };
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: 200, body: text.slice(0, 500) };
  }
}

export { callPublic, callShop, apiBase };
