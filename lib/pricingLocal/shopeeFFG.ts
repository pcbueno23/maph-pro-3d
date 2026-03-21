/**
 * Shopee — Programa Frete Grátis (modelo do laboratório).
 * Faixas conforme especificação do produto (valores fixos por item + % sobre o preço).
 * Subsídios Pix (5–8%) não entram no custo do vendedor — ignorados aqui.
 */

export interface ShopeeFFGBand {
  minInclusive: number;
  maxInclusive: number | null;
  percentDecimal: number;
  fixed: number;
  label: string;
}

export const SHOPEE_FFG_BANDS: ShopeeFFGBand[] = [
  {
    minInclusive: 0,
    maxInclusive: 79.99,
    percentDecimal: 0.2,
    fixed: 4,
    label: "Até R$ 79,99",
  },
  {
    minInclusive: 80,
    maxInclusive: 99.99,
    percentDecimal: 0.14,
    fixed: 16,
    label: "R$ 80,00 a R$ 99,99",
  },
  {
    minInclusive: 100,
    maxInclusive: 199.99,
    percentDecimal: 0.14,
    fixed: 20,
    label: "R$ 100,00 a R$ 199,99",
  },
  {
    minInclusive: 200,
    maxInclusive: 499.99,
    percentDecimal: 0.14,
    fixed: 26,
    label: "R$ 200,00 a R$ 499,99",
  },
  {
    minInclusive: 500,
    maxInclusive: null,
    percentDecimal: 0.14,
    fixed: 26,
    label: "A partir de R$ 500,00",
  },
];

export function getShopeeBandForPrice(price: number): ShopeeFFGBand {
  const p = Math.max(0, price);
  for (const b of SHOPEE_FFG_BANDS) {
    const withinMax = b.maxInclusive === null || p <= b.maxInclusive;
    if (p >= b.minInclusive && withinMax) return b;
  }
  return SHOPEE_FFG_BANDS[SHOPEE_FFG_BANDS.length - 1];
}

export function getShopeeFFGFees(
  price: number,
  options: { cpfHighVolume90d?: boolean } = {}
): {
  percentDecimal: number;
  fixedFee: number;
  band: ShopeeFFGBand;
} {
  const band = getShopeeBandForPrice(price);
  let fixedFee = band.fixed;
  if (options.cpfHighVolume90d) fixedFee += 3;
  return {
    percentDecimal: band.percentDecimal,
    fixedFee,
    band,
  };
}
