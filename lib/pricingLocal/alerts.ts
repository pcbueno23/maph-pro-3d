import { contributionBreakdown } from "./marginContribution";
import type { FeeResolver } from "./marginContribution";

export interface BandCrossingHint {
  kind: "shopee_fixed_drop";
  message: string;
  priceA: number;
  priceB: number;
  marginA: number;
  marginB: number;
}

/**
 * Detecta se, perto de R$ 100, vale testar R$ 99,99 (queda da taxa fixa FFG).
 */
export function shopeeHundredBandHint(params: {
  referencePrice: number;
  productCost: number;
  packaging: number;
  freightSeller: number;
  taxRateDecimal: number;
  feeResolver: FeeResolver;
  /** Só dispara se o preço estiver neste intervalo em torno de 100 */
  windowMin?: number;
  windowMax?: number;
}): BandCrossingHint | null {
  const wMin = params.windowMin ?? 98;
  const wMax = params.windowMax ?? 102;
  const p = params.referencePrice;
  if (p < wMin || p > wMax) return null;

  const baseArgs = {
    productCost: params.productCost,
    packaging: params.packaging,
    freightSeller: params.freightSeller,
    taxRateDecimal: params.taxRateDecimal,
    feeResolver: params.feeResolver,
  };

  const at100 = contributionBreakdown({ price: 100, ...baseArgs });
  const at9999 = contributionBreakdown({ price: 99.99, ...baseArgs });

  const m100 = at100.contributionMarginPercent;
  const m99 = at9999.contributionMarginPercent;

  if (m99 > m100 + 0.05) {
    return {
      kind: "shopee_fixed_drop",
      message:
        "Na Shopee (FFG), R$ 99,99 pode deixar margem maior que R$ 100,00: a taxa fixa cai de R$ 20,00 para R$ 16,00 nesta faixa.",
      priceA: 100,
      priceB: 99.99,
      marginA: m100,
      marginB: m99,
    };
  }
  return null;
}

export type BeginnerMarginStatus =
  | "abaixo_ideal"
  | "ideal"
  | "acima_ideal"
  | "neutro";

/**
 * Faixa sugerida para iniciantes (10% a 20% de margem de contribuição sobre o preço).
 */
export function beginnerMarginGuidance(contributionMarginPercent: number): {
  status: BeginnerMarginStatus;
  hint: string;
} {
  if (contributionMarginPercent < 10) {
    return {
      status: "abaixo_ideal",
      hint: "Margem abaixo de 10%: negocie custo com fornecedor ou revise preço/comissões.",
    };
  }
  if (contributionMarginPercent <= 20) {
    return {
      status: "ideal",
      hint: "Margem dentro da faixa sugerida para iniciantes (10% a 20%).",
    };
  }
  return {
    status: "acima_ideal",
    hint: "Margem acima de 20%: bom espaço competitivo; confira se o preço continua atrativo.",
  };
}
