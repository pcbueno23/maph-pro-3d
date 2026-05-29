import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import type { AdminLeadRow } from "@/lib/adminLeadDto";
import { formatBrazilWhatsappDisplay } from "@/lib/phoneBr";

export const dynamic = "force-dynamic";

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
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    200,
    Math.max(1, Number.parseInt(searchParams.get("perPage") ?? "50", 10) || 50),
  );
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const from = (searchParams.get("createdFrom") ?? "").trim() || null;
  const to = (searchParams.get("createdTo") ?? "").trim() || null;

  let query = admin
    .from("signup_leads")
    .select("id, user_id, email, whatsapp, source, created_at", { count: "exact" })
    .order("created_at", { ascending: false });

  if (from) query = query.gte("created_at", `${from}T00:00:00.000Z`);
  if (to) query = query.lte("created_at", `${to}T23:59:59.999Z`);
  if (q) {
    const digits = q.replace(/\D/g, "");
    if (digits.length >= 4) {
      query = query.or(`email.ilike.%${q}%,whatsapp.ilike.%${digits}%`);
    } else {
      query = query.ilike("email", `%${q}%`);
    }
  }

  const { data, error, count } = await query.range(
    (page - 1) * perPage,
    page * perPage - 1,
  );

  if (error) {
    const missingTable =
      /signup_leads|relation.*does not exist|schema cache/i.test(error.message ?? "");
    return NextResponse.json(
      {
        error: missingTable
          ? "Tabela signup_leads ausente. Execute a migration 20260529_signup_leads.sql no Supabase."
          : error.message ?? "Erro ao listar leads.",
      },
      { status: missingTable ? 503 : 500 },
    );
  }

  const leads: AdminLeadRow[] = (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    email: row.email ?? "",
    whatsapp: row.whatsapp ?? "",
    whatsapp_display: formatBrazilWhatsappDisplay(row.whatsapp ?? ""),
    source: row.source ?? "signup",
    created_at: row.created_at,
  }));

  return NextResponse.json({
    page,
    perPage,
    total: count ?? leads.length,
    leads,
    filtered: Boolean(q || from || to),
  });
}
