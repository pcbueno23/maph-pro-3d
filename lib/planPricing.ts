/** Preços canônicos dos planos. Altere aqui e reflita em toda a app. */

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
