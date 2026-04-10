import { NextRequest, NextResponse } from "next/server";
import { evaluateAccountAccessFromJwt } from "@/lib/accountAccessEvaluate";
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
  if (process.env.APP_PAYWALL_DISABLED === "true") {
    return NextResponse.json({
      allowed: true,
      reason: "paywall_disabled",
      trialEndsAt: new Date().toISOString(),
      accountCreatedAt: new Date().toISOString(),
      hasPaidPlan: false,
      daysRemaining: 999,
    } satisfies AccountAccessResponse);
  }

  const token = getBearerToken(req);
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
