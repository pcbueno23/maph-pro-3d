import { NextRequest, NextResponse } from "next/server";
import { getAppTrialDays } from "@/lib/appTrial";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import { toAdminUserRow } from "@/lib/adminUserDto";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no servidor (Settings → API → service_role). Nunca exponha no cliente.",
      },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPageRaw = Number.parseInt(searchParams.get("perPage") ?? "50", 10);
  const perPage = Math.min(100, Math.max(1, perPageRaw || 50));

  const { data, error } = await admin.auth.admin.listUsers({
    page,
    perPage,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Falha ao listar usuários." },
      { status: 500 },
    );
  }

  const users = (data.users ?? []).map((u) => toAdminUserRow(u));

  return NextResponse.json({
    appTrialDays: getAppTrialDays(),
    page,
    perPage,
    total: data.total ?? users.length,
    users,
  });
}
