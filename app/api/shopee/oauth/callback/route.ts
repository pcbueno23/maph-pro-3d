import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { shopeeExchangeCode, shopeeFetchShopName } from "@/lib/shopee/auth";
import { verifyShopeeState } from "@/lib/shopeeOAuthState";

export const dynamic = "force-dynamic";

function settingsUrl(req: NextRequest, status: "ok" | "erro", message?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
  const url = new URL("/settings", appUrl);
  url.searchParams.set("shopee", status);
  if (message) url.searchParams.set("shopee_msg", message);
  return url;
}

/** Callback é navegação simples do navegador vinda da Shopee — sem header Authorization.
 * A identidade do usuário vem do "state" assinado (embutido no redirect_uri de autorização). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const shopIdRaw = req.nextUrl.searchParams.get("shop_id");
  const state = req.nextUrl.searchParams.get("state");

  if (!code || !shopIdRaw || !state) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Faltou code, shop_id ou state no retorno."));
  }

  const verified = verifyShopeeState(state);
  if (!verified.ok) {
    return NextResponse.redirect(settingsUrl(req, "erro", verified.error));
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Supabase não configurado no servidor."));
  }

  const shopId = Number(shopIdRaw);
  const tokenResult = await shopeeExchangeCode(code, shopId);
  if (!tokenResult.ok) {
    return NextResponse.redirect(
      settingsUrl(req, "erro", `Falha ao trocar o code por token (${tokenResult.status}).`),
    );
  }

  const shopName = await shopeeFetchShopName(tokenResult.accessToken, tokenResult.shopId);

  const now = Date.now();
  const { error } = await admin.from("shopee_shop_connections").upsert(
    {
      user_id: verified.userId,
      shop_id: tokenResult.shopId,
      shop_name: shopName,
      access_token: tokenResult.accessToken,
      refresh_token: tokenResult.refreshToken,
      access_token_expires_at: new Date(now + tokenResult.expireInSec * 1000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Falha ao salvar a conexão no banco."));
  }

  return NextResponse.redirect(settingsUrl(req, "ok"));
}
