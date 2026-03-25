/** Preços canônicos dos planos. Altere aqui e reflita em toda a app.
 *  Em produção os preços podem ser sobrescritos via painel admin (app_site_config). */

export const PLAN_PRICING = {
  pro: {
    priceCents: 2990,
    priceBrl: 29.9,
    label: "R$ 29,90",
    period: "/mês",
  },
  lifetime: {
    priceCents: 19990,
    priceBrl: 199.9,
    label: "R$ 199,90",
    period: "/ano",
    monthlyEquivalentBrl: 199.9 / 12,
    /** Percentual de economia vs. mensal (arredondado). */
    savingsVsMonthlyPct: Math.round((1 - 199.9 / 12 / 29.9) * 100),
  },
} as const;

/** Formata centavos para exibição: 2990 → "R$ 29,90" */
export function centsToBrl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Retorna preços efetivos considerando override do site config (admin). */
export function getPlanPricingFromConfig(config?: {
  plan_price_pro_cents?: number | null;
  plan_price_lifetime_cents?: number | null;
}) {
  const proCents = config?.plan_price_pro_cents ?? PLAN_PRICING.pro.priceCents;
  const lifetimeCents =
    config?.plan_price_lifetime_cents ?? PLAN_PRICING.lifetime.priceCents;

  const proLabel = centsToBrl(proCents);
  const lifetimeLabel = centsToBrl(lifetimeCents);
  const monthlyEquiv = lifetimeCents / 12 / 100;
  const savingsPct = Math.round(
    (1 - monthlyEquiv / (proCents / 100)) * 100,
  );

  return {
    pro: {
      priceCents: proCents,
      priceBrl: proCents / 100,
      label: proLabel,
      period: PLAN_PRICING.pro.period,
    },
    lifetime: {
      priceCents: lifetimeCents,
      priceBrl: lifetimeCents / 100,
      label: lifetimeLabel,
      period: PLAN_PRICING.lifetime.period,
      monthlyEquivalentBrl: monthlyEquiv,
      savingsVsMonthlyPct: savingsPct,
    },
  };
}
