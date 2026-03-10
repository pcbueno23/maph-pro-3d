/**
 * Motor de taxas 2026 – Shopee e Mercado Livre.
 *
 * Shopee:
 * - Padrão: 14% comissão, taxa fixa R$ 4 (CNPJ) / R$ 7 (CPF), teto comissão R$ 100.
 * - Frete Grátis: 20% (14%+6%), mesma taxa fixa.
 * - Produtos < R$ 10: taxa fixa proporcional (até metade do valor) = preço/2.
 *
 * Mercado Livre:
 * - Clássico ~10–14%, Premium ~16–19%. Taxa fixa histórica < R$ 79 (a partir mar/2026 é variável).
 */

import type { Marketplace } from "@/types";
import type { PersonType } from "./constants";

const SHOPEE_COMMISSION_CAP = 100;

// Shopee: taxa fixa sempre R$ 4 (configuração do app).
function getShopeeFixedFee(): number {
  return 4;
}

function getShopeeCommissionPercent(freeShipping: boolean): number {
  return freeShipping ? 20 : 14; // Padrão 14%; Frete Grátis 20%
}

/** Taxa efetiva em % sobre o preço (comissão% + taxa fixa diluída). Teto comissão R$ 100. */
export function getShopeeEffectiveFeePercent(
  personType: PersonType,
  price: number,
  freeShipping: boolean
): number {
  if (price <= 0) return 20;
  const commissionPct = getShopeeCommissionPercent(freeShipping);
  const fixedFee = getShopeeFixedFee();
  const commissionAmount = Math.min(
    (price * commissionPct) / 100,
    SHOPEE_COMMISSION_CAP
  );
  const totalFee = commissionAmount + fixedFee;
  return (totalFee / price) * 100;
}

// Mercado Livre: taxa fixa histórica (até fev/2026). A partir mar/2026 é variável para itens < R$ 79.
const ML_FIXED_FEE_BANDS: { max: number; fee: number }[] = [
  { max: 12.5, fee: 6.25 },   // < R$ 12,50
  { max: 29, fee: 6.25 },    // R$ 12,50 a R$ 29
  { max: 50, fee: 6.5 },     // R$ 29 a R$ 50
  { max: 79, fee: 6.75 },    // R$ 50 a R$ 79
];

function getMLFixedFee(price: number): number {
  if (price >= 79) return 0;
  const band = ML_FIXED_FEE_BANDS.find((b) => price <= b.max);
  return band ? band.fee : price / 2; // < R$ 12,50: 50% do valor
}

/** ML: Clássico ~10–14%, Premium ~16–19%. Taxa fixa histórica por faixa (< R$ 79). */
export function getMercadoLivreEffectiveFeePercent(
  personType: PersonType,
  price: number,
  options: { classic?: boolean } = {}
): number {
  if (price <= 0) return 16;
  const isClassic = options.classic ?? false;
  const basePct = isClassic ? 13 : 16;
  const fixedFee = isClassic ? 6.5 : getMLFixedFee(price);
  const commissionAmount = (price * basePct) / 100;
  const totalFee = commissionAmount + fixedFee;
  return (totalFee / price) * 100;
}

export function getEffectiveMarketplaceFeePercent(
  marketplace: Marketplace,
  personType: PersonType,
  price: number,
  options: { freeShipping?: boolean; classicML?: boolean } = {}
): number {
  if (marketplace === "Shopee") {
    return getShopeeEffectiveFeePercent(
      personType,
      price,
      options.freeShipping ?? false
    );
  }
  if (marketplace === "Mercado Livre") {
    return getMercadoLivreEffectiveFeePercent(
      personType,
      price,
      { classic: options.classicML ?? false }
    );
  }
  return 15;
}

/** Decomposição da taxa Shopee: comissão (decimal) + valor fixo, para exibição no detalhamento. */
export function getShopeeFeeBreakdown(
  price: number,
  personType: PersonType,
  freeShipping: boolean
): { commissionRateDecimal: number; commissionAmount: number; fixedFeeAmount: number } {
  const commissionPct = getShopeeCommissionPercent(freeShipping);
  const commissionAmount = Math.min(
    (price * commissionPct) / 100,
    SHOPEE_COMMISSION_CAP
  );
  const fixedFeeAmount = getShopeeFixedFee();
  return {
    commissionRateDecimal: commissionPct / 100,
    commissionAmount,
    fixedFeeAmount,
  };
}

/** Decomposição da taxa ML: comissão (decimal) + valor fixo, para exibição no detalhamento. */
export function getMLFeeBreakdown(
  price: number,
  personType: PersonType,
  classic: boolean = false
): { commissionRateDecimal: number; commissionAmount: number; fixedFeeAmount: number } {
  const basePct = classic ? 13 : 16;
  const commissionAmount = (price * basePct) / 100;
  const fixedFeeAmount = classic ? 6.5 : getMLFixedFee(price);
  return {
    commissionRateDecimal: basePct / 100,
    commissionAmount,
    fixedFeeAmount,
  };
}

/** Preço sugerido Shopee (taxa fixa: ≥ R$ 10 → R$ 4/7, < R$ 10 → preço/2). */
export function getShopeeSuggestedPrice(params: {
  totalCost: number;
  shippingAmount: number;
  taxPercent: number;
  desiredMarginPercent: number;
  freeShipping: boolean;
  personType: PersonType;
}): number {
  const {
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent,
    freeShipping,
    personType,
  } = params;
  const commissionPct = getShopeeCommissionPercent(freeShipping);
  const fee = commissionPct / 100;
  const tax = taxPercent / 100;
  const margin = desiredMarginPercent / 100;
  const divisor = 1 - fee - tax - margin;
  if (divisor <= 0) return totalCost + shippingAmount;

  const fixedFee = getShopeeFixedFee();
  return (totalCost + shippingAmount + fixedFee) / divisor;
}

/** Preço sugerido ML para atingir margem desejada (itera para convergir taxa efetiva). */
export function getMLSuggestedPrice(params: {
  totalCost: number;
  shippingAmount: number;
  taxPercent: number;
  desiredMarginPercent: number;
  personType: PersonType;
  classic: boolean;
}): number {
  const {
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent,
    personType,
    classic,
  } = params;

  const tax = taxPercent / 100;
  const targetMargin = Math.max(0, Math.min(desiredMarginPercent / 100, 0.9));

  function marginAtPrice(price: number): number {
    if (price <= 0) return 0;
    const feePct = getMercadoLivreEffectiveFeePercent(personType, price, {
      classic,
    });
    const feeRate = feePct / 100;
    const netProfit =
      price * (1 - feeRate - tax) - shippingAmount - totalCost;
    return netProfit / price;
  }

  // Intervalo de busca: de custo+frete até 10x esse valor.
  let low = totalCost + shippingAmount;
  let high = low * 10;

  // Se mesmo em high não atinge a margem desejada, retorna high.
  if (marginAtPrice(high) < targetMargin) {
    return high;
  }

  // Busca binária para encontrar o menor preço que atinge a margem alvo.
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    const m = marginAtPrice(mid);
    if (m >= targetMargin) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}
