import { getMercadoLivreFees } from "./mercadolivre";
import { getShopeeFFGFees } from "./shopeeFFG";
import type {
  ContributionBreakdown,
  LabMarketplace,
  MLListingType,
  ScenarioCompare,
} from "./types";

export type FeeResolver = (price: number) => {
  percentDecimal: number;
  fixedFee: number;
};

/**
 * Margem de contribuição (sobre o preço de venda):
 * MC = P − (custo produto + embalagem + frete vendedor + comissões + imposto sobre P).
 */
export function contributionBreakdown(params: {
  price: number;
  productCost: number;
  packaging: number;
  freightSeller: number;
  taxRateDecimal: number;
  feeResolver: FeeResolver;
}): ContributionBreakdown {
  const P = Math.max(0, params.price);
  const { percentDecimal, fixedFee } = params.feeResolver(P);
  const commissionAmount = P * percentDecimal;
  const taxAmount = P * params.taxRateDecimal;
  const productCost = params.productCost;
  const packaging = params.packaging;
  const freightSeller = params.freightSeller;

  const totalDeductions =
    productCost +
    packaging +
    freightSeller +
    commissionAmount +
    fixedFee +
    taxAmount;

  const contributionMargin = P - totalDeductions;
  const contributionMarginPercent = P > 0 ? (contributionMargin / P) * 100 : 0;

  return {
    price: P,
    productCost,
    packaging,
    freightSeller,
    commissionPercentDecimal: percentDecimal,
    commissionAmount,
    fixedMarketplaceFee: fixedFee,
    taxRateDecimal: params.taxRateDecimal,
    taxAmount,
    totalDeductions,
    contributionMargin,
    contributionMarginPercent,
  };
}

/** Resolve taxas Shopee (FFG + opcional CPF alto volume). */
export function shopeeFeeResolver(options: {
  cpfHighVolume90d?: boolean;
}): FeeResolver {
  return (price: number) => {
    const f = getShopeeFFGFees(price, options);
    return { percentDecimal: f.percentDecimal, fixedFee: f.fixedFee };
  };
}

/** Resolve taxas ML com % configurável por tipo de anúncio. */
export function mercadoLivreFeeResolver(
  listing: MLListingType,
  commissionPercent: number
): FeeResolver {
  return (price: number) => getMercadoLivreFees(price, listing, commissionPercent);
}

export type SolvePriceResult =
  | { ok: true; price: number; iterations: number }
  | { ok: false; error: string };

/**
 * Preço alvo dado margem de contribuição desejada sobre o preço (ex.: 0,15 = 15%).
 * Quando taxas fixas dependem da faixa de preço (Shopee), usa iteração.
 */
export function solvePriceForTargetContributionMargin(params: {
  productCost: number;
  packaging: number;
  freightSeller: number;
  targetMarginOnPriceDecimal: number;
  taxRateDecimal: number;
  feeResolver: FeeResolver;
}): SolvePriceResult {
  const base = params.productCost + params.packaging + params.freightSeller;
  const m = params.targetMarginOnPriceDecimal;
  if (m <= 0 || m >= 1) {
    return { ok: false, error: "Margem alvo deve estar entre 0% e 100% (exclusivo)." };
  }

  let P = Math.max(10, base * 1.25);
  for (let i = 0; i < 50; i++) {
    const { percentDecimal, fixedFee } = params.feeResolver(P);
    const denom = 1 - percentDecimal - params.taxRateDecimal - m;
    if (denom <= 0.0001) {
      return {
        ok: false,
        error:
          "Combinação impossível: comissão + imposto + margem alvo ≥ 100% do preço.",
      };
    }
    const Pnext = (base + fixedFee) / denom;
    if (!Number.isFinite(Pnext) || Pnext <= 0) {
      return { ok: false, error: "Não foi possível convergir para um preço válido." };
    }
    if (Math.abs(Pnext - P) < 0.01) {
      return { ok: true, price: Math.round(Pnext * 100) / 100, iterations: i + 1 };
    }
    P = Pnext;
  }
  return {
    ok: true,
    price: Math.round(P * 100) / 100,
    iterations: 50,
  };
}

/** Simulação rápida: Clássico vs Premium no ML (mesmo preço e custos). */
export function scenarioMercadoLivreClassicVsPremium(params: {
  price: number;
  productCost: number;
  packaging: number;
  freightSeller: number;
  taxRateDecimal: number;
  classicCommissionPercent: number;
  premiumCommissionPercent: number;
}): { classico: ScenarioCompare; premium: ScenarioCompare } {
  const common = {
    price: params.price,
    productCost: params.productCost,
    packaging: params.packaging,
    freightSeller: params.freightSeller,
    taxRateDecimal: params.taxRateDecimal,
  };
  return {
    classico: {
      label: "Mercado Livre — Clássico",
      breakdown: contributionBreakdown({
        ...common,
        feeResolver: mercadoLivreFeeResolver(
          "classico",
          params.classicCommissionPercent
        ),
      }),
    },
    premium: {
      label: "Mercado Livre — Premium",
      breakdown: contributionBreakdown({
        ...common,
        feeResolver: mercadoLivreFeeResolver(
          "premium",
          params.premiumCommissionPercent
        ),
      }),
    },
  };
}

/** Helper: monta feeResolver conforme marketplace do lab. */
export function feeResolverForLab(
  marketplace: LabMarketplace,
  options: {
    shopeeCpfHighVolume?: boolean;
    mlListing?: MLListingType;
    mlCommissionPercent?: number;
  }
): FeeResolver {
  if (marketplace === "shopee") {
    return shopeeFeeResolver({ cpfHighVolume90d: options.shopeeCpfHighVolume });
  }
  return mercadoLivreFeeResolver(
    options.mlListing ?? "classico",
    options.mlCommissionPercent ?? 12
  );
}
