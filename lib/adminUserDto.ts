import type { User } from "@supabase/supabase-js";
import { getAppTrialDays, parseTrialEndsAt } from "@/lib/appTrial";

export type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  /** Valor salvo em user_metadata.trial_ends_at ou null se não há override. */
  trial_ends_at_metadata: string | null;
  effective_trial_ends_at: string;
  uses_custom_trial: boolean;
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
  return {
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    trial_ends_at_metadata: usesCustom ? rawMeta.trim() : null,
    effective_trial_ends_at: new Date(trialEndMs).toISOString(),
    uses_custom_trial: usesCustom,
  };
}
