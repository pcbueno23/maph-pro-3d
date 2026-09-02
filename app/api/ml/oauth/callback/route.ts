import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { mlExchangeCode, mlFetchUser } from "@/lib/mercadoLivre";
import { verifyMlState } from "@/lib/mlOAuthState";

export const dynamic = "force-dynamic";

function settingsUrl(req: NextRequest, status: "ok" | "erro", message?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin;
  const url = new URL("/settings", appUrl);
  url.searchParams.set("ml", status);
  if (message) url.searchParams.set("ml_msg", message);
  return url;
}

/** Callback é uma navegação simples do navegador vinda do Mercado Livre — sem header
 * Authorization. A identidade do usuário vem do "state" assinado (ver lib/mlOAuthState). */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Autorização recusada no Mercado Livre."));
  }
  if (!code || !state) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Faltou code ou state no retorno."));
  }

  const verified = verifyMlState(state);
  if (!verified.ok) {
    return NextResponse.redirect(settingsUrl(req, "erro", verified.error));
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Supabase não configurado no servidor."));
  }

  const tokenResult = await mlExchangeCode(code);
  if (!tokenResult.ok) {
    return NextResponse.redirect(
      settingsUrl(req, "erro", `Falha ao trocar o code por token (${tokenResult.status}).`),
    );
  }

  const userInfo = await mlFetchUser(tokenResult.accessToken);
  const nickname = userInfo.ok ? userInfo.nickname : null;

  const now = Date.now();
  const { error } = await admin.from("ml_accounts").upsert(
    {
      user_id: verified.userId,
      ml_user_id: tokenResult.mlUserId,
      nickname,
      access_token: tokenResult.accessToken,
      refresh_token: tokenResult.refreshToken,
      token_expires_at: new Date(now + tokenResult.expiresInSec * 1000).toISOString(),
      updated_at: new Date(now).toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.redirect(settingsUrl(req, "erro", "Falha ao salvar a conexão no banco."));
  }

  return NextResponse.redirect(settingsUrl(req, "ok"));
}
