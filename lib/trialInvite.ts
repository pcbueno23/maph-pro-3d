/** Convite por link: quem abre /login?trial=1 marca intenção de trial (checkout Pro com período grátis no Stripe). */
export const TRIAL_INVITE_STORAGE_KEY = "precifica_pending_trial";

export function setTrialInvitePending() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TRIAL_INVITE_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function clearTrialInvitePending() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(TRIAL_INVITE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function hasTrialInvitePending(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(TRIAL_INVITE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}
