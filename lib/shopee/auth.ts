import { buildAuthPartnerUrl, callPublic, callShop } from "./client";

function redirectUri(): string {
  const explicit = process.env.SHOPEE_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.maphpro3d.com";
  return `${appUrl.replace(/\/$/, "")}/api/shopee/oauth/callback`;
}

/** state assinado vai embutido no próprio redirect (Shopee não tem parâmetro "state" nativo
 * no shop/auth_partner) — por isso o state entra como querystring do redirect_uri mesmo. */
export function shopeeAuthorizationUrl(state: string): string {
  const redirect = `${redirectUri()}?state=${encodeURIComponent(state)}`;
  return buildAuthPartnerUrl(redirect);
}

export type ShopeeTokenResult =
  | { ok: true; accessToken: string; refreshToken: string; expireInSec: number; shopId: number }
  | { ok: false; status: number; body: string };

export async function shopeeExchangeCode(code: string, shopId: number): Promise<ShopeeTokenResult> {
  const result = await callPublic("/api/v2/auth/token/get", { code, shop_id: shopId, partner_id: Number(process.env.SHOPEE_PARTNER_ID) });
  if (!result.ok) return result;
  const j = result.json;
  if (!j?.access_token || !j?.refresh_token) {
    return { ok: false, status: 200, body: JSON.stringify(j).slice(0, 500) };
  }
  return {
    ok: true,
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expireInSec: Number(j.expire_in) || 14400,
    shopId: Number(j.shop_id) || shopId,
  };
}

export async function shopeeRefreshToken(refreshToken: string, shopId: number): Promise<ShopeeTokenResult> {
  const result = await callPublic("/api/v2/auth/access_token/get", {
    refresh_token: refreshToken,
    shop_id: shopId,
    partner_id: Number(process.env.SHOPEE_PARTNER_ID),
  });
  if (!result.ok) return result;
  const j = result.json;
  if (!j?.access_token || !j?.refresh_token) {
    return { ok: false, status: 200, body: JSON.stringify(j).slice(0, 500) };
  }
  return {
    ok: true,
    accessToken: j.access_token,
    refreshToken: j.refresh_token,
    expireInSec: Number(j.expire_in) || 14400,
    shopId: Number(j.shop_id) || shopId,
  };
}

export async function shopeeFetchShopName(
  accessToken: string,
  shopId: number,
): Promise<string | null> {
  const result = await callShop("/api/v2/shop/get_shop_info", accessToken, shopId);
  if (!result.ok) return null;
  return result.json?.shop_name ?? null;
}
