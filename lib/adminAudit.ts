import { getSupabaseServiceRole } from "@/lib/adminApiAuth";

export async function logAdminAudit(params: {
  adminEmail: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseServiceRole();
  if (!admin) return;
  const { error } = await admin.from("admin_audit_log").insert({
    admin_email: params.adminEmail,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    details: params.details ?? null,
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[admin_audit]", error.message);
  }
}
