import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/adminAudit";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import {
  defaultSiteConfigData,
  parseSiteConfigData,
  siteConfigDataSchema,
} from "@/lib/siteConfig";

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

  const { data, error } = await admin
    .from("app_site_config")
    .select("data, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message ?? "Erro ao ler app_site_config." },
      { status: 500 },
    );
  }

  const merged = parseSiteConfigData(data?.data ?? {});

  return NextResponse.json({
    data: merged,
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json(
      { error: "Defina SUPABASE_SERVICE_ROLE_KEY no servidor." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const raw = (body as { data?: unknown }).data ?? body;
  const parsed = siteConfigDataSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const merged = parseSiteConfigData({
    ...defaultSiteConfigData,
    ...parsed.data,
  });
  const now = new Date().toISOString();

  const { error } = await admin.from("app_site_config").upsert(
    {
      id: "default",
      data: merged,
      updated_at: now,
    },
    { onConflict: "id" },
  );

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

  await logAdminAudit({
    adminEmail: auth.user.email ?? "unknown",
    action: "site_config_save",
    targetType: "app_site_config",
    targetId: "default",
  });

  return NextResponse.json({ ok: true, data: merged, updated_at: now });
}
