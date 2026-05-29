/**
 * Modo gratuito: paywall desligado, acesso total sem assinatura.
 *
 * - Padrão (sem variáveis): gratuito — funciona em produção sem config extra na Vercel.
 * - `APP_PAYWALL_ENABLED=true`: trial + cobrança (Stripe/AbacatePay).
 * - `APP_PAYWALL_DISABLED=false`: força paywall mesmo sem ENABLED (legado).
 */
export function isAppPaywallDisabled(): boolean {
  const enabled = process.env.APP_PAYWALL_ENABLED?.trim().toLowerCase();
  if (enabled === "true") return false;

  const disabled = process.env.APP_PAYWALL_DISABLED?.trim().toLowerCase();
  if (disabled === "false") return false;

  return true;
}
