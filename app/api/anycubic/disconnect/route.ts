import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }
  await admin.from("anycubic_cloud_accounts").delete().eq("user_id", auth.user.id);
  await admin.from("anycubic_device_status").delete().eq("user_id", auth.user.id);

  return NextResponse.json({ ok: true });
}
