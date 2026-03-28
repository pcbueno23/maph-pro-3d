import { NextRequest, NextResponse } from "next/server";
import { getAppTrialDays } from "@/lib/appTrial";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import {
  matchesAdminUserFilters,
  type AdminUserSegment,
} from "@/lib/adminUserFilters";
import { toAdminUserRow, type AdminUserRow } from "@/lib/adminUserDto";

const MAX_SCAN_PAGES = 25;
const SCAN_PER_PAGE = 100;

function parseSegment(raw: string | null): AdminUserSegment {
  if (
    raw === "in_trial" ||
    raw === "post_trial" ||
    raw === "banned" ||
    raw === "paid"
  ) {
    return raw;
  }
  return "all";
}

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
  const segment = parseSegment(searchParams.get("segment"));
  const createdFrom = (searchParams.get("createdFrom") ?? "").trim() || null;
  const createdTo = (searchParams.get("createdTo") ?? "").trim() || null;

  const needsScan =
    segment !== "all" || Boolean(createdFrom) || Boolean(createdTo);

  if (!needsScan) {
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
      filtered: false,
    });
  }

  const allRows: AdminUserRow[] = [];

  for (let p = 1; p <= MAX_SCAN_PAGES; p++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page: p,
      perPage: SCAN_PER_PAGE,
    });
    if (error) {
      return NextResponse.json(
        { error: error.message || "Falha ao listar usuários." },
        { status: 500 },
      );
    }
    const batch = data.users ?? [];
    for (const u of batch) {
      const row = toAdminUserRow(u);
      if (matchesAdminUserFilters(row, segment, createdFrom, createdTo)) {
        allRows.push(row);
      }
    }
    if (batch.length < SCAN_PER_PAGE) break;
  }

  const total = allRows.length;
  const start = (page - 1) * perPage;
  const users = allRows.slice(start, start + perPage);

  return NextResponse.json({
    appTrialDays: getAppTrialDays(),
    page,
    perPage,
    total,
    users,
    filtered: true,
  });
}
