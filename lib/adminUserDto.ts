import type { User } from "@supabase/supabase-js";
import { getAppTrialDays, parseTrialEndsAt } from "@/lib/appTrial";

export function isActiveBan(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const t = new Date(bannedUntil).getTime();
  return Number.isFinite(t) && t > Date.now();
}

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  /** Valor salvo em user_metadata.trial_ends_at ou null se não há override. */
  trial_ends_at_metadata: string | null;
  effective_trial_ends_at: string;
  uses_custom_trial: boolean;
  /** Nota interna em user_metadata.admin_notes */
  admin_notes: string | null;
  /** Ban do Supabase Auth (se existir). */
  banned_until: string | null;
  /** `banned_until` ainda no futuro. */
  is_banned: boolean;
  /** Usuário tem pagamento confirmado (abacatepay_paid_at no user_metadata). */
  has_paid_plan: boolean;
  /** ISO da data em que o pagamento foi confirmado via webhook. */
  abacatepay_paid_at: string | null;
};

export function toAdminUserRow(u: User): AdminUserRow {
  const trialDays = getAppTrialDays();
  const createdMs = new Date(u.created_at).getTime();
  const defaultEndMs = createdMs + trialDays * 86_400_000;
  const rawMeta = u.user_metadata?.trial_ends_at;
  const metaEnd = parseTrialEndsAt(rawMeta);
  const trialEndMs = metaEnd ? metaEnd.getTime() : defaultEndMs;
  const usesCustom =
    typeof rawMeta === "string" &&
    rawMeta.trim() !== "" &&
    metaEnd !== null;
  const notesRaw = u.user_metadata?.admin_notes;
  const adminNotes =
    typeof notesRaw === "string" && notesRaw.trim() !== ""
      ? notesRaw.trim()
      : null;
  const banned = (u as User & { banned_until?: string | null }).banned_until;
  const bannedStr =
    typeof banned === "string" && banned.trim() !== "" ? banned.trim() : null;
  const paidAtRaw = u.user_metadata?.abacatepay_paid_at;
  const abacatepayPaidAt =
    typeof paidAtRaw === "string" && paidAtRaw.trim() !== "" ? paidAtRaw.trim() : null;
  return {
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    trial_ends_at_metadata: usesCustom ? rawMeta.trim() : null,
    effective_trial_ends_at: new Date(trialEndMs).toISOString(),
    uses_custom_trial: usesCustom,
    admin_notes: adminNotes,
    banned_until: bannedStr,
    is_banned: isActiveBan(bannedStr),
    has_paid_plan: abacatepayPaidAt !== null,
    abacatepay_paid_at: abacatepayPaidAt,
  };
}
