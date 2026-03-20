import { create } from "zustand";

export type AccessReason =
  | "subscriber"
  | "app_trial"
  | "trial_expired"
  | "paywall_disabled";

interface AccessState {
  /** Incrementar para forçar novo GET /api/account/access (ex.: voltou do Stripe). */
  accessNonce: number;
  checked: boolean;
  allowed: boolean | null;
  reason: AccessReason | null;
  trialEndsAt: string | null;
  accountCreatedAt: string | null;
  hasPaidPlan: boolean;
  daysRemaining: number | null;
  error: string | null;
  bumpAccessCheck: () => void;
  setAccess: (payload: {
    allowed: boolean;
    reason: AccessReason;
    trialEndsAt: string;
    accountCreatedAt: string;
    hasPaidPlan: boolean;
    daysRemaining: number;
  }) => void;
  setAccessError: (message: string) => void;
  reset: () => void;
}

const initial = {
  accessNonce: 0,
  checked: false,
  allowed: null as boolean | null,
  reason: null as AccessReason | null,
  trialEndsAt: null as string | null,
  accountCreatedAt: null as string | null,
  hasPaidPlan: false,
  daysRemaining: null as number | null,
  error: null as string | null,
};

export const useAccessStore = create<AccessState>((set) => ({
  ...initial,
  bumpAccessCheck: () =>
    set((s) => ({
      accessNonce: s.accessNonce + 1,
      checked: false,
    })),
  setAccess: (payload) =>
    set({
      checked: true,
      allowed: payload.allowed,
      reason: payload.reason,
      trialEndsAt: payload.trialEndsAt,
      accountCreatedAt: payload.accountCreatedAt,
      hasPaidPlan: payload.hasPaidPlan,
      daysRemaining: payload.daysRemaining,
      error: null,
    }),
  setAccessError: (message) =>
    set({
      checked: true,
      allowed: false,
      reason: "trial_expired",
      error: message,
    }),
  reset: () => set(initial),
}));
