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

  const { data, error } = await admin.rpc("admin_metrics_counts");
  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ??
          "Execute a migration 20260327_admin_audit_site_metrics.sql no Supabase.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    counts: data as {
      users_total: number;
      users_7d: number;
      users_30d: number;
      banned: number;
    },
  });
}
