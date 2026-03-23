import { NextRequest, NextResponse } from "next/server";
import { logAdminAudit } from "@/lib/adminAudit";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import { toAdminUserRow } from "@/lib/adminUserDto";

type ActionBody = {
  action:
    | "ban"
    | "unban"
    | "send_recovery"
    | "send_magic";
};

/** Ações de suporte no usuário (ban, links de e-mail). */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const admin = getSupabaseServiceRole();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Defina SUPABASE_SERVICE_ROLE_KEY no servidor. Nunca commite nem exponha no cliente.",
      },
      { status: 503 },
    );
  }

  const { id: userId } = await ctx.params;
  if (!userId?.trim()) {
    return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  }

  let body: ActionBody;
  try {
    body = (await req.json()) as ActionBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(userId);
  if (getErr || !existing.user?.email) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const email = existing.user.email;
  const adminEmail = auth.user.email ?? "unknown";

  if (body.action === "ban") {
    const { data: updated, error } = await admin.auth.admin.updateUserById(
      userId,
      { ban_duration: "876000h" } as Record<string, unknown>,
    );
    if (error || !updated.user) {
      return NextResponse.json(
        { error: error?.message ?? "Falha ao banir." },
        { status: 500 },
      );
    }
    await logAdminAudit({
      adminEmail,
      action: "user_ban",
      targetType: "user",
      targetId: userId,
    });
    return NextResponse.json({ user: toAdminUserRow(updated.user) });
  }

  if (body.action === "unban") {
    const { data: updated, error } = await admin.auth.admin.updateUserById(
      userId,
      { ban_duration: "none" } as Record<string, unknown>,
    );
    if (error || !updated.user) {
      return NextResponse.json(
        { error: error?.message ?? "Falha ao desbanir." },
        { status: 500 },
      );
    }
    await logAdminAudit({
      adminEmail,
      action: "user_unban",
      targetType: "user",
      targetId: userId,
    });
    return NextResponse.json({ user: toAdminUserRow(updated.user) });
  }

  if (body.action === "send_recovery" || body.action === "send_magic") {
    const gen = admin.auth.admin as unknown as {
      generateLink: (p: {
        type: "recovery" | "magiclink";
        email: string;
      }) => Promise<{ data: { properties?: { action_link?: string } }; error: Error | null }>;
    };
    const type = body.action === "send_recovery" ? "recovery" : "magiclink";
    const { data: linkData, error: linkErr } = await gen.generateLink({
      type,
      email,
    });
    if (linkErr) {
      return NextResponse.json(
        { error: linkErr.message ?? "Falha ao gerar link." },
        { status: 500 },
      );
    }
    const actionLink = linkData?.properties?.action_link ?? null;
    await logAdminAudit({
      adminEmail,
      action:
        body.action === "send_recovery"
          ? "user_recovery_link"
          : "user_magic_link",
      targetType: "user",
      targetId: userId,
      details: { generated: Boolean(actionLink) },
    });
    return NextResponse.json({
      ok: true,
      action_link: actionLink,
      message:
        "Copie o link e envie ao usuário por um canal seguro (o e-mail automático depende da configuração do Supabase).",
    });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
