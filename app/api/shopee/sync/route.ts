import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { syncShopeeConnectionOrders } from "@/lib/shopeeSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }

  const { data: conn, error: connErr } = await admin
    .from("shopee_shop_connections")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (connErr) return NextResponse.json({ error: connErr.message }, { status: 500 });
  if (!conn) {
    return NextResponse.json({ error: "Nenhuma loja Shopee conectada." }, { status: 404 });
  }

  const result = await syncShopeeConnectionOrders(admin, conn as any);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json(result);
}
