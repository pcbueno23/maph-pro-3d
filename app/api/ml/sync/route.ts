import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { syncMlAccountOrders } from "@/lib/mlSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }

  const { data: account, error: accErr } = await admin
    .from("ml_accounts")
    .select("*")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (accErr) return NextResponse.json({ error: accErr.message }, { status: 500 });
  if (!account) {
    return NextResponse.json({ error: "Nenhuma conta Mercado Livre conectada." }, { status: 404 });
  }

  const result = await syncMlAccountOrders(admin, account);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });

  return NextResponse.json(result);
}
