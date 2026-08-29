import { NextRequest, NextResponse } from "next/server";
import { parseTrialEndsAt } from "@/lib/appTrial";
import { logAdminAudit } from "@/lib/adminAudit";
import {
  getSupabaseServiceRole,
  requireAdminSession,
} from "@/lib/adminApiAuth";
import { getAdminPaymentSummary } from "@/lib/adminPaymentSummary";
import { toAdminUserRow } from "@/lib/adminUserDto";

type PatchBody = {
  trial_ends_at?: string | null;
  admin_notes?: string | null;
  extension_granted?: boolean;
};

export async function GET(
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

  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(userId);
  if (getErr || !existing.user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const payment = await getAdminPaymentSummary(existing.user.email);

  return NextResponse.json({
    user: toAdminUserRow(existing.user),
    payment,
  });
}

export async function PATCH(
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

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const hasTrial = "trial_ends_at" in body;
  const hasNotes = "admin_notes" in body;
  const hasExtGrant = "extension_granted" in body;
  if (!hasTrial && !hasNotes && !hasExtGrant) {
    return NextResponse.json(
      {
        error:
          "Envie trial_ends_at, admin_notes e/ou extension_granted.",
      },
      { status: 400 },
    );
  }

  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(userId);
  if (getErr || !existing.user) {
    return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  }

  const meta: Record<string, unknown> = {
    ...(existing.user.user_metadata ?? {}),
  };

  if (hasTrial) {
    const v = body.trial_ends_at;
    if (v === null || v === "") {
      delete meta.trial_ends_at;
    } else if (typeof v === "string") {
      const d = parseTrialEndsAt(v);
      if (!d) {
        return NextResponse.json(
          {
            error:
              "trial_ends_at deve ser uma data ISO válida (ex.: 2026-06-30T23:59:59.000Z).",
          },
          { status: 400 },
        );
      }
      meta.trial_ends_at = d.toISOString();
    } else {
      return NextResponse.json({ error: "trial_ends_at inválido." }, { status: 400 });
    }
  }

  if (hasNotes) {
    const n = body.admin_notes;
    if (n === null || n === "") {
      delete meta.admin_notes;
    } else if (typeof n === "string") {
      meta.admin_notes = n;
    } else {
      return NextResponse.json({ error: "admin_notes inválido." }, { status: 400 });
    }
  }

  if (hasExtGrant) {
    if (typeof body.extension_granted !== "boolean") {
      return NextResponse.json({ error: "extension_granted inválido." }, { status: 400 });
    }
    if (body.extension_granted) {
      meta.extension_granted = true;
    } else {
      delete meta.extension_granted;
    }
  }

  const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(
    userId,
    { user_metadata: meta },
  );

  if (updErr || !updated.user) {
    return NextResponse.json(
      { error: updErr?.message ?? "Falha ao atualizar usuário." },
      { status: 500 },
    );
  }

  const adminEmail = auth.user.email ?? "unknown";
  if (hasTrial) {
    await logAdminAudit({
      adminEmail,
      action: "user_trial_update",
      targetType: "user",
      targetId: userId,
      details: { trial_ends_at: body.trial_ends_at ?? null },
    });
  }
  if (hasNotes) {
    await logAdminAudit({
      adminEmail,
      action: "user_admin_note",
      targetType: "user",
      targetId: userId,
      details: { has_note: Boolean(body.admin_notes) },
    });
  }
  if (hasExtGrant) {
    await logAdminAudit({
      adminEmail,
      action: "user_extension_grant",
      targetType: "user",
      targetId: userId,
      details: { extension_granted: Boolean(body.extension_granted) },
    });
  }

  return NextResponse.json({ user: toAdminUserRow(updated.user) });
}
