/** Dias de trial do app (sem cartão). Pode sobrescrever com APP_TRIAL_DAYS. */
export function getAppTrialDays(): number {
  const raw = process.env.APP_TRIAL_DAYS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n > 0 && n <= 365) return n;
  return 7;
}

export function parseTrialEndsAt(iso: unknown): Date | null {
  if (typeof iso !== "string" || !iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
