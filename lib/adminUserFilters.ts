import type { AdminUserRow } from "@/lib/adminUserDto";

export type AdminUserSegment = "all" | "in_trial" | "post_trial" | "banned" | "paid";

/** Filtros da lista admin (trial por data; não consulta Stripe). */
export function matchesAdminUserFilters(
  row: AdminUserRow,
  segment: AdminUserSegment,
  createdFrom: string | null,
  createdTo: string | null,
): boolean {
  const now = Date.now();
  const trialEnd = new Date(row.effective_trial_ends_at).getTime();

  if (segment === "banned") {
    if (!row.is_banned) return false;
  } else if (segment === "paid") {
    if (!row.has_paid_plan) return false;
  } else if (segment === "in_trial") {
    if (row.is_banned) return false;
    if (row.has_paid_plan) return false;
    if (!(now < trialEnd)) return false;
  } else if (segment === "post_trial") {
    if (row.is_banned) return false;
    if (row.has_paid_plan) return false;
    if (!(now >= trialEnd)) return false;
  }

  const created = new Date(row.created_at).getTime();
  if (createdFrom) {
    const d = new Date(`${createdFrom}T00:00:00`);
    if (Number.isNaN(d.getTime())) return false;
    if (created < d.getTime()) return false;
  }
  if (createdTo) {
    const d = new Date(`${createdTo}T23:59:59.999`);
    if (Number.isNaN(d.getTime())) return false;
    if (created > d.getTime()) return false;
  }
  return true;
}
