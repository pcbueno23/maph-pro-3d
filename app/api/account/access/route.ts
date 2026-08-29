import { NextRequest, NextResponse } from "next/server";
import { isAppPaywallDisabledAsync } from "@/lib/appAccess";
import { evaluateAccountAccessFromJwt, getExtensionGrantedFromToken } from "@/lib/accountAccessEvaluate";
import type { AccountAccessResponse } from "@/lib/accountAccessEvaluate";

/** Paywall depende de sessão + env em runtime — não cachear como resposta fixa. */
export const dynamic = "force-dynamic";

export type { AccountAccessResponse };

function getBearerToken(req: NextRequest): string | null {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7).trim() || null;
}

export async function GET(req: NextRequest) {
  const token = getBearerToken(req);

  if (await isAppPaywallDisabledAsync()) {
    // Modo gratuito libera todo mundo, mas a extensão continua exigindo
    // liberação manual do admin (user_metadata.extension_granted) — não é
    // afetada pelo paywall geral estar ligado ou não.
    const extensionGranted = token ? await getExtensionGrantedFromToken(token) : false;
    return NextResponse.json({
      allowed: true,
      reason: "paywall_disabled",
      trialEndsAt: new Date().toISOString(),
      accountCreatedAt: new Date().toISOString(),
      hasPaidPlan: false,
      extensionGranted,
      daysRemaining: 999,
    } satisfies AccountAccessResponse);
  }

  if (!token) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const evaluated = await evaluateAccountAccessFromJwt(token);
  if (!evaluated.ok) {
    return NextResponse.json(
      { error: evaluated.error },
      { status: evaluated.status },
    );
  }

  return NextResponse.json(evaluated.body satisfies AccountAccessResponse);
}
