import { NextRequest, NextResponse } from "next/server";
import { requireUserSession } from "@/lib/adminApiAuth";
import { shopeeAuthorizationUrl } from "@/lib/shopee/auth";
import { signShopeeState } from "@/lib/shopeeOAuthState";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  try {
    const state = signShopeeState(auth.user.id);
    return NextResponse.json({ ok: true, url: shopeeAuthorizationUrl(state) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao montar URL de autorização." },
      { status: 500 },
    );
  }
}
