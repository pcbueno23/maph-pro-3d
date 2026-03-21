/** Regime de imposto sobre o faturamento (modelo simplificado para laboratório). */
export type TaxRegime = "CPF_MEI" | "SIMPLES" | "LUCRO";

/** Marketplace do laboratório de margem de contribuição. */
export type LabMarketplace = "shopee" | "mercado_livre";

export type MLListingType = "classico" | "premium";

/** Reputação (afeta apenas estimativa de frete ML no lab). */
export type MLReputation = "verde_lider" | "amarela" | "vermelha" | "sem";

export interface ContributionBreakdown {
  price: number;
  productCost: number;
  packaging: number;
  freightSeller: number;
  commissionPercentDecimal: number;
  commissionAmount: number;
  fixedMarketplaceFee: number;
  taxRateDecimal: number;
  taxAmount: number;
  /** Soma custos + comissão variável + fixa + imposto + frete */
  totalDeductions: number;
  contributionMargin: number;
  contributionMarginPercent: number;
}

export interface ScenarioCompare {
  label: string;
  breakdown: ContributionBreakdown;
}
