import { NextResponse } from "next/server";
import { isAppPaywallDisabled } from "@/lib/appAccess";

export const dynamic = "force-dynamic";

/** Indica se o app está em modo gratuito (sem paywall). Público — sem auth. */
export async function GET() {
  return NextResponse.json(
    { freeAccess: isAppPaywallDisabled() },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      },
    },
  );
}
