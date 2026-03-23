import { NextRequest, NextResponse } from "next/server";
import { normalizeMarketingPayload } from "@/lib/appMarketing";
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
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no servidor para editar o conteúdo.",
      },
      { status: 503 },
    );
  }

  const { data, error } = await admin
    .from("app_marketing")
    .select("fornecedores, promocoes, updated_at")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Erro ao ler app_marketing." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    fornecedores: Array.isArray(data?.fornecedores) ? data!.fornecedores : [],
    promocoes: Array.isArray(data?.promocoes) ? data!.promocoes : [],
    updated_at: data?.updated_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no servidor para salvar o conteúdo.",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const normalized = normalizeMarketingPayload(body);
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const { fornecedores, promocoes } = normalized.data;
  const now = new Date().toISOString();

  const { error } = await admin.from("app_marketing").upsert(
    {
      id: "default",
      fornecedores,
      promocoes,
      updated_at: now,
    },
    { onConflict: "id" },
  );

  if (error) {
    return NextResponse.json(
      {
        error:
          error.message ||
          "Falha ao salvar. Rode a migration supabase/migrations/20260322_app_marketing.sql no projeto.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    fornecedores,
    promocoes,
    updated_at: now,
  });
}
