import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { syncShopeeConnectionOrders } from "@/lib/shopeeSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cron job — sincroniza pedidos de todas as lojas Shopee conectadas, 1x/dia (limite
 * do plano Hobby da Vercel). O botão "Sincronizar agora" em /settings cobre a hora. */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[cron/shopee-sync] CRON_SECRET não configurado.");
    return NextResponse.json({ error: "Servidor não configurado corretamente." }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase service role não configurado." }, { status: 500 });
  }

  const { data: connections, error } = await admin.from("shopee_shop_connections").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let synced = 0;
  let failed = 0;
  for (const conn of connections ?? []) {
    const result = await syncShopeeConnectionOrders(admin, conn as any);
    if (result.ok) synced++;
    else failed++;
  }

  return NextResponse.json({ ok: true, connections: connections?.length ?? 0, synced, failed });
}
