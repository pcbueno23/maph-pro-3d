/** Paywall desligado: todo usuário logado tem acesso completo (modo gratuito). */
export function isAppPaywallDisabled(): boolean {
  return process.env.APP_PAYWALL_DISABLED?.trim().toLowerCase() === "true";
}
