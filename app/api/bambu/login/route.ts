import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { bambuLogin } from "@/lib/bambuCloud";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  let body: { email?: string; password?: string; region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = body.email?.trim();
  const password = body.password;
  const region = body.region?.trim() || "global";
  if (!email || !password) {
    return NextResponse.json({ error: "E-mail e senha da Bambu Lab são obrigatórios." }, { status: 400 });
  }

  const result = await bambuLogin(region, email, password);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Falha no login com a Bambu Lab.", bambuStatus: result.status, bambuBody: result.body },
      { status: 502 },
    );
  }

  if ("needsVerification" in result) {
    return NextResponse.json({ ok: true, needsVerification: true });
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }
  const { error } = await admin.from("bambu_cloud_accounts").upsert(
    {
      user_id: auth.user.id,
      email,
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      token_expires_at: result.expiresAt,
      uid: result.uid,
      region,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, needsVerification: false });
}
