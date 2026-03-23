import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json(
      { error: "Defina SUPABASE_SERVICE_ROLE_KEY no servidor." },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(searchParams.get("limit") ?? "40", 10) || 40),
  );

  const { data, error } = await admin
    .from("admin_audit_log")
    .select("id, admin_email, action, target_type, target_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ??
          "Crie a tabela admin_audit_log (migration 20260327...).",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ entries: data ?? [] });
}
