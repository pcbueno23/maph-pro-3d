import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getSupabaseServiceRole } from "@/lib/adminApiAuth";
import { anycubicLoginWithSlicerToken } from "@/lib/anycubicCloud";

export const dynamic = "force-dynamic";

/**
 * Não é login e-mail+senha — o usuário extrai um "access token" de dentro do Anycubic
 * Slicer Next (processo manual, fora do SaaS) e cola aqui. Guardamos o token do slicer
 * TAMBÉM (não só o de sessão), porque ele é reaproveitado pra gerar a senha da conexão MQTT.
 */
export async function POST(req: NextRequest) {
  const auth = await requireUserSession(req);
  if (!auth.ok) return auth.response;

  let body: { email?: string; slicerAccessToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const email = body.email?.trim();
  const slicerAccessToken = body.slicerAccessToken?.trim();
  if (!email || !slicerAccessToken) {
    return NextResponse.json({ error: "E-mail e token do Slicer Next são obrigatórios." }, { status: 400 });
  }

  const result = await anycubicLoginWithSlicerToken(slicerAccessToken);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Falha ao trocar o token com a Anycubic.",
        anycubicStatus: result.status,
        anycubicBody: result.body,
        debugJwtPayload: result.debugJwtPayload,
        debugRequest: result.debugRequest,
      },
      { status: 502 },
    );
  }

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 500 });
  }
  const { error } = await admin.from("anycubic_cloud_accounts").upsert(
    {
      user_id: auth.user.id,
      email,
      slicer_access_token: slicerAccessToken,
      session_token: result.sessionToken,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
