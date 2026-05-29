import { NextResponse } from "next/server";
import { isAppPaywallDisabledAsync } from "@/lib/appAccess";

export const dynamic = "force-dynamic";

/** Indica se o app está em modo gratuito (sem paywall). Público — sem auth. */
export async function GET() {
  const freeAccess = await isAppPaywallDisabledAsync();
  return NextResponse.json(
    { freeAccess, paywallEnabled: !freeAccess },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
