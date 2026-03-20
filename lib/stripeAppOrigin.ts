import type { NextRequest } from "next/server";

/** URLs absolutas para Stripe (checkout / portal). Origin pode faltar em serverless. */
export function resolveStripeAppOrigin(req: NextRequest): string {
  const origin = req.headers.get("origin")?.trim();
  if (origin) return origin.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }
  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) return app.replace(/\/$/, "");
  const host = req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`.replace(/\/$/, "");
  }
  return "";
}
