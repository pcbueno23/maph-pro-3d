import { NextRequest, NextResponse } from "next/server";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import { toAdminUserRow } from "@/lib/adminUserDto";

const MAX_PAGES = 25;

/** Busca por e-mail (substring, case-insensitive) em páginas de listUsers. */
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
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) {
    return NextResponse.json(
      { error: "Informe pelo menos 2 caracteres em q." },
      { status: 400 },
    );
  }

  const perPage = 100;
  const matches: ReturnType<typeof toAdminUserRow>[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
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
    const users = data.users ?? [];
    for (const u of users) {
      const em = (u.email ?? "").toLowerCase();
      if (em.includes(q) || (u.id && u.id.toLowerCase().includes(q))) {
        matches.push(toAdminUserRow(u));
      }
    }
    if (users.length < perPage) break;
    if (matches.length >= 50) break;
  }

  return NextResponse.json({ users: matches.slice(0, 50) });
}
