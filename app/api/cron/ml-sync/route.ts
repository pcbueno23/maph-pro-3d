import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { syncMlAccountOrders } from "@/lib/mlSync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron job — sincroniza pedidos de todas as contas Mercado Livre conectadas,
 * rodando pelo Vercel Cron (vercel.json). 1x/dia é o limite do plano Hobby;
 * o botão "Sincronizar agora" em /settings cobre o caso de querer na hora.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.error("[cron/ml-sync] CRON_SECRET não configurado.");
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

  const { data: accounts, error } = await admin.from("ml_accounts").select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let synced = 0;
  let failed = 0;
  for (const account of accounts ?? []) {
    const result = await syncMlAccountOrders(admin, account as any);
    if (result.ok) synced++;
    else failed++;
  }

  return NextResponse.json({ ok: true, accounts: accounts?.length ?? 0, synced, failed });
}
