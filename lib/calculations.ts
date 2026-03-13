import type {
  CalculatorFormValues,
  CalculatorResults,
  ProfitSimulationResult,
} from "@/types";
import {
  getEffectiveMarketplaceFeePercent,
  getShopeeSuggestedPrice,
  getMLSuggestedPrice,
  getShopeeFeeBreakdown,
  getMLFeeBreakdown,
} from "./marketplaceFees";

export function calcFilamentCost(weight: number, pricePerKg: number): number {
  return (weight / 1000) * pricePerKg;
}

export function calcEnergyCost(
  powerW: number,
  hours: number,
  kwhPrice: number,
): number {
  return (powerW / 1000) * hours * kwhPrice;
}

export function calcDepreciation(
  params: {
    printerCost: number;
    residualValue: number;
    lifetimeHours: number;
    annualMaintenance: number;
    infrastructureYear: number;
    yearlyPrintHours: number;
    printHours: number;
  },
): number {
  const {
    printerCost,
    residualValue,
    lifetimeHours,
    annualMaintenance,
    infrastructureYear,
    yearlyPrintHours,
    printHours,
  } = params;
  if (!printHours || printHours <= 0) return 0;
  if (!lifetimeHours || lifetimeHours <= 0) return 0;

  const depreciationPerHour = (printerCost - residualValue) / lifetimeHours;
  const dilutionBase = yearlyPrintHours && yearlyPrintHours > 0 ? yearlyPrintHours : 0;
  const maintenancePerHour = dilutionBase > 0 ? annualMaintenance / dilutionBase : 0;
  const infrastructurePerHour = dilutionBase > 0 ? infrastructureYear / dilutionBase : 0;

  const machineHourCost = depreciationPerHour + maintenancePerHour + infrastructurePerHour;
  return machineHourCost * printHours;
}

export function calcTotalCost(params: {
  filamentCost: number;
  energyCost: number;
  depreciationCost: number;
  packagingCost: number;
}): number {
  const { filamentCost, energyCost, depreciationCost, packagingCost } = params;
  return filamentCost + energyCost + depreciationCost + packagingCost;
}

/**
 * Preço sugerido para manter a margem desejada (taxa fixa em %).
 */
export function calcSuggestedPrice(params: {
  totalCost: number;
  marketplaceFeePercent: number;
  desiredMarginPercent: number;
  shippingAmount?: number;
  taxPercent?: number;
}): number {
  const {
    totalCost,
    marketplaceFeePercent,
    desiredMarginPercent,
    shippingAmount = 0,
    taxPercent = 0,
  } = params;
  const fee = marketplaceFeePercent / 100;
  const margin = desiredMarginPercent / 100;
  const tax = taxPercent / 100;
  const divisor = 1 - fee - tax - margin;
  if (divisor <= 0) return totalCost + shippingAmount;
  return (totalCost + shippingAmount) / divisor;
}

export function calcMinimumPrice(params: {
  totalCost: number;
  marketplaceFeePercent: number;
}): number {
  const { totalCost, marketplaceFeePercent } = params;
  const fee = marketplaceFeePercent / 100;
  const divisor = 1 - fee;
  if (divisor <= 0) return totalCost;
  return totalCost / divisor;
}

export function calcProfit(price: number, cost: number): number {
  return price - cost;
}

export function calcMarginPercentage(
  price: number,
  cost: number,
): number {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
}

export function calcPriceToAnnounceForPromo(
  priceAfterDiscount: number,
  discountPercent: number,
): number {
  if (discountPercent <= 0 || discountPercent >= 100) return priceAfterDiscount;
  return priceAfterDiscount / (1 - discountPercent / 100);
}

function buildCascata(params: {
  sellingPrice: number;
  feePercent: number;
  shippingAmount: number;
  taxPercent: number;
  taxAmount: number;
  energyCost: number;
  filamentCost: number;
  depreciationCost: number;
  packagingCost: number;
  totalCost: number;
  commissionRateDecimal: number;
  commissionAmount: number;
  fixedFeeAmount: number;
}): CalculatorResults["cascataShopee"] {
  const {
    sellingPrice,
    feePercent,
    shippingAmount,
    taxPercent,
    taxAmount,
    energyCost,
    filamentCost,
    depreciationCost,
    packagingCost,
    totalCost,
    commissionRateDecimal,
    commissionAmount,
    fixedFeeAmount,
  } = params;
  const marketplaceFeeAmount = (sellingPrice * feePercent) / 100;
  const netProfit =
    sellingPrice -
    marketplaceFeeAmount -
    shippingAmount -
    taxAmount -
    totalCost;
  const marginPercent =
    sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
  return {
    sellingPrice,
    marketplaceFeePercent: feePercent,
    marketplaceFeeAmount,
    commissionRateDecimal,
    commissionAmount,
    fixedFeeAmount,
    shippingAmount,
    taxPercent,
    taxAmount,
    energyCost,
    filamentCost,
    depreciationCost,
    packagingCost,
    totalCost,
    netProfit,
    marginPercent,
  };
}

export function calculateAll(input: CalculatorFormValues): CalculatorResults {
  const unitsPerBatch =
    typeof input.time.unitsPerBatch === "number" && input.time.unitsPerBatch > 0
      ? input.time.unitsPerBatch
      : 1;
  const effectiveHoursPerUnit =
    unitsPerBatch > 0 ? input.time.hours / unitsPerBatch : input.time.hours;

  const effectiveWeightPerUnit =
    typeof input.material.plateWeight === "number" &&
    input.material.plateWeight > 0 &&
    unitsPerBatch > 0
      ? input.material.plateWeight / unitsPerBatch
      : input.material.weight;

  const filamentCost = calcFilamentCost(
    effectiveWeightPerUnit,
    input.material.pricePerKg,
  );
  const energyCost = calcEnergyCost(
    input.time.powerW,
    effectiveHoursPerUnit,
    input.costs.kwhPrice,
  );
  const depreciationCost = calcDepreciation(
    {
      printerCost: input.costs.printerCost,
      residualValue: input.costs.residualValue ?? 0,
      lifetimeHours: input.costs.lifetimeHours,
      annualMaintenance: input.costs.annualMaintenance ?? 0,
      infrastructureYear: input.costs.infrastructureYear ?? 0,
      yearlyPrintHours: input.costs.yearlyPrintHours ?? 0,
      printHours: effectiveHoursPerUnit,
    },
  );
  const packagingCost = input.costs.packaging;
  const totalCost = calcTotalCost({
    filamentCost,
    energyCost,
    depreciationCost,
    packagingCost,
  });

  const shippingAmount = input.pricing.shippingEstimate ?? 0;
  const taxPercent = input.pricing.taxPercent ?? 0;
  const taxMode = input.pricing.taxMode ?? "net_marketplace";

  const computeTaxAmount = (
    price: number,
    commissionRateDecimal: number,
  ): number => {
    const rate = (taxPercent ?? 0) / 100;
    if (rate <= 0 || price <= 0) return 0;
    if (taxMode === "net_marketplace") {
      const netBase = price * (1 - commissionRateDecimal);
      return netBase * rate;
    }
    // modo bruto (legado)
    return price * rate;
  };

  // Preço sugerido por canal (mesma margem alvo, preços podem ser diferentes)
  const suggestedPriceShopee = getShopeeSuggestedPrice({
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent: input.pricing.desiredMargin,
    freeShipping: input.pricing.freeShipping ?? false,
    personType: input.pricing.personType,
  });
  const suggestedPriceML = getMLSuggestedPrice({
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent: input.pricing.desiredMargin,
    personType: input.pricing.personType,
    classic: input.pricing.mlClassic ?? false,
  });
  const suggestedPrice = Math.max(suggestedPriceShopee, suggestedPriceML);

  // Shopee no preço sugerido dela
  const feePercentShopee = getEffectiveMarketplaceFeePercent(
    "Shopee",
    input.pricing.personType,
    suggestedPriceShopee,
    { freeShipping: input.pricing.freeShipping ?? false },
  );
  const shopeeBreakdown = getShopeeFeeBreakdown(
    suggestedPriceShopee,
    input.pricing.personType,
    input.pricing.freeShipping ?? false,
  );
  const taxAmountShopee = computeTaxAmount(
    suggestedPriceShopee,
    shopeeBreakdown.commissionRateDecimal,
  );
  const cascataShopee = buildCascata({
    sellingPrice: suggestedPriceShopee,
    feePercent: feePercentShopee,
    shippingAmount,
    taxPercent,
    taxAmount: taxAmountShopee,
    energyCost,
    filamentCost,
    depreciationCost,
    packagingCost,
    totalCost,
    commissionRateDecimal: shopeeBreakdown.commissionRateDecimal,
    commissionAmount: shopeeBreakdown.commissionAmount,
    fixedFeeAmount: shopeeBreakdown.fixedFeeAmount,
  });

  // Mercado Livre no preço sugerido dele
  const feePercentML = getEffectiveMarketplaceFeePercent(
    "Mercado Livre",
    input.pricing.personType,
    suggestedPriceML,
    { classicML: input.pricing.mlClassic ?? false },
  );
  const mlBreakdown = getMLFeeBreakdown(
    suggestedPriceML,
    input.pricing.personType,
    input.pricing.mlClassic ?? false,
  );
  const taxAmountML = computeTaxAmount(
    suggestedPriceML,
    mlBreakdown.commissionRateDecimal,
  );
  const cascataML = buildCascata({
    sellingPrice: suggestedPriceML,
    feePercent: feePercentML,
    shippingAmount,
    taxPercent,
    taxAmount: taxAmountML,
    energyCost,
    filamentCost,
    depreciationCost,
    packagingCost,
    totalCost,
    commissionRateDecimal: mlBreakdown.commissionRateDecimal,
    commissionAmount: mlBreakdown.commissionAmount,
    fixedFeeAmount: mlBreakdown.fixedFeeAmount,
  });

  const margin = Math.min(cascataShopee.marginPercent, cascataML.marginPercent);
  const profitPerSale = Math.min(cascataShopee.netProfit, cascataML.netProfit);
  const profitPerHour =
    effectiveHoursPerUnit > 0
      ? Math.min(
          cascataShopee.netProfit / effectiveHoursPerUnit,
          cascataML.netProfit / effectiveHoursPerUnit,
        )
      : 0;

  const discountPercent = input.pricing.discountPercent ?? 0;
  const priceToAnnounceForPromo =
    discountPercent > 0
      ? calcPriceToAnnounceForPromo(suggestedPrice, discountPercent)
      : null;

  // Sugestões adicionais para venda direta
  const cardFeePercent = input.pricing.cardFeePercent ?? 0;
  const suggestedPriceDirectCash = calcSuggestedPrice({
    totalCost,
    marketplaceFeePercent: 0,
    desiredMarginPercent: input.pricing.desiredMargin,
    shippingAmount,
    taxPercent,
  });
  const suggestedPriceDirectCard = calcSuggestedPrice({
    totalCost,
    marketplaceFeePercent: cardFeePercent,
    desiredMarginPercent: input.pricing.desiredMargin,
    shippingAmount,
    taxPercent,
  });

  // Preço mínimo (lucro zero) por canal, usando o mesmo motor das sugestões
  const minimumPriceShopee = getShopeeSuggestedPrice({
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent: 0,
    freeShipping: input.pricing.freeShipping ?? false,
    personType: input.pricing.personType,
  });
  const minimumPriceML = getMLSuggestedPrice({
    totalCost,
    shippingAmount,
    taxPercent,
    desiredMarginPercent: 0,
    personType: input.pricing.personType,
    classic: input.pricing.mlClassic ?? false,
  });
  const minimumPrice = Math.max(minimumPriceShopee, minimumPriceML);

  let compareAtPriceResult: CalculatorResults["compareAtPriceResult"] = null;
  const comparePrice = input.pricing.comparePrice;
  if (comparePrice != null && comparePrice > 0) {
    const feeShopee = getEffectiveMarketplaceFeePercent(
      "Shopee",
      input.pricing.personType,
      comparePrice,
      { freeShipping: input.pricing.freeShipping ?? false },
    );
    const feeML = getEffectiveMarketplaceFeePercent(
      "Mercado Livre",
      input.pricing.personType,
      comparePrice,
      { classicML: input.pricing.mlClassic ?? false },
    );
    const buildCompare = (
      feePercent: number,
      commissionRateDecimal: number,
    ): {
      marketplaceFeePercent: number;
      marketplaceFeeAmount: number;
      netProfit: number;
      marginPercent: number;
      profitPerHour: number;
    } => {
      const feeAmount = (comparePrice * feePercent) / 100;
      const taxAmt = taxMode === "net_marketplace"
        ? computeTaxAmount(comparePrice, commissionRateDecimal)
        : (comparePrice * taxPercent) / 100;
      const net =
        comparePrice - feeAmount - shippingAmount - taxAmt - totalCost;
      const marginPct = comparePrice > 0 ? (net / comparePrice) * 100 : 0;
      const perHour =
        effectiveHoursPerUnit > 0 ? net / effectiveHoursPerUnit : 0;
      return {
        marketplaceFeePercent: feePercent,
        marketplaceFeeAmount: feeAmount,
        netProfit: net,
        marginPercent: marginPct,
        profitPerHour: perHour,
      };
    };
    const shopeeCompare = buildCompare(
      feeShopee,
      shopeeBreakdown.commissionRateDecimal,
    );
    const mlCompare = buildCompare(
      feeML,
      mlBreakdown.commissionRateDecimal,
    );
    // Direto PIX e crédito: imposto calculado sempre sobre o preço cheio,
    // então usamos commissionRateDecimal = 0 no cálculo do imposto.
    const directCashCompare = buildCompare(0, 0);
    const directCardCompare = buildCompare(cardFeePercent, 0);

    compareAtPriceResult = {
      sellingPrice: comparePrice,
      shopee: shopeeCompare,
      ml: mlCompare,
      directCash: directCashCompare,
      directCard: directCardCompare,
    };
  }

  const plateTotalCost = totalCost * unitsPerBatch;

  // Sugestões de preço para KIT (placa inteira)
  let kitSuggestedPriceShopee: number | undefined;
  let kitSuggestedPriceML: number | undefined;
  let kitSuggestedPriceDirectCash: number | undefined;
  let kitSuggestedPriceDirectCard: number | undefined;
  let kitMarginShopee: number | undefined;
  let kitMarginML: number | undefined;
  let kitMarginDirectCash: number | undefined;
  let kitMarginDirectCard: number | undefined;

  if (unitsPerBatch > 1) {
    const kitCost = plateTotalCost;
    kitSuggestedPriceShopee = getShopeeSuggestedPrice({
      totalCost: kitCost,
      shippingAmount,
      taxPercent,
      desiredMarginPercent: input.pricing.desiredMargin,
      freeShipping: input.pricing.freeShipping ?? false,
      personType: input.pricing.personType,
    });
    kitSuggestedPriceML = getMLSuggestedPrice({
      totalCost: kitCost,
      shippingAmount,
      taxPercent,
      desiredMarginPercent: input.pricing.desiredMargin,
      personType: input.pricing.personType,
      classic: input.pricing.mlClassic ?? false,
    });
    kitSuggestedPriceDirectCash = calcSuggestedPrice({
      totalCost: kitCost,
      marketplaceFeePercent: 0,
      desiredMarginPercent: input.pricing.desiredMargin,
      shippingAmount,
      taxPercent,
    });
    kitSuggestedPriceDirectCard = calcSuggestedPrice({
      totalCost: kitCost,
      marketplaceFeePercent: cardFeePercent,
      desiredMarginPercent: input.pricing.desiredMargin,
      shippingAmount,
      taxPercent,
    });

    // Margens reais do kit por canal
    const kitFeePercentShopee = getEffectiveMarketplaceFeePercent(
      "Shopee",
      input.pricing.personType,
      kitSuggestedPriceShopee,
      { freeShipping: input.pricing.freeShipping ?? false },
    );
    const kitShopeeBreakdown = getShopeeFeeBreakdown(
      kitSuggestedPriceShopee,
      input.pricing.personType,
      input.pricing.freeShipping ?? false,
    );
    const kitTaxAmountShopee = computeTaxAmount(
      kitSuggestedPriceShopee,
      kitShopeeBreakdown.commissionRateDecimal,
    );
    const kitMarketplaceFeeAmountShopee =
      (kitSuggestedPriceShopee * kitFeePercentShopee) / 100;
    const kitNetProfitShopee =
      kitSuggestedPriceShopee -
      kitMarketplaceFeeAmountShopee -
      shippingAmount -
      kitTaxAmountShopee -
      kitCost;
    kitMarginShopee =
      kitSuggestedPriceShopee > 0
        ? (kitNetProfitShopee / kitSuggestedPriceShopee) * 100
        : 0;

    const kitFeePercentML = getEffectiveMarketplaceFeePercent(
      "Mercado Livre",
      input.pricing.personType,
      kitSuggestedPriceML,
      { classicML: input.pricing.mlClassic ?? false },
    );
    const kitMLBreakdown = getMLFeeBreakdown(
      kitSuggestedPriceML,
      input.pricing.personType,
      input.pricing.mlClassic ?? false,
    );
    const kitTaxAmountML = computeTaxAmount(
      kitSuggestedPriceML,
      kitMLBreakdown.commissionRateDecimal,
    );
    const kitMarketplaceFeeAmountML =
      (kitSuggestedPriceML * kitFeePercentML) / 100;
    const kitNetProfitML =
      kitSuggestedPriceML -
      kitMarketplaceFeeAmountML -
      shippingAmount -
      kitTaxAmountML -
      kitCost;
    kitMarginML =
      kitSuggestedPriceML > 0
        ? (kitNetProfitML / kitSuggestedPriceML) * 100
        : 0;

    // Direto PIX (sem marketplace)
    const kitTaxAmountDirectCash = computeTaxAmount(
      kitSuggestedPriceDirectCash,
      0,
    );
    const kitNetProfitDirectCash =
      kitSuggestedPriceDirectCash -
      shippingAmount -
      kitTaxAmountDirectCash -
      kitCost;
    kitMarginDirectCash =
      kitSuggestedPriceDirectCash > 0
        ? (kitNetProfitDirectCash / kitSuggestedPriceDirectCash) * 100
        : 0;

    // Direto crédito (taxa cartão)
    const kitFeeAmountDirectCard =
      (kitSuggestedPriceDirectCard * cardFeePercent) / 100;
    // Imposto também sobre o preço cheio (igual PIX e igual calculadora HTML)
    const kitTaxAmountDirectCard = computeTaxAmount(
      kitSuggestedPriceDirectCard,
      0,
    );
    const kitNetProfitDirectCard =
      kitSuggestedPriceDirectCard -
      kitFeeAmountDirectCard -
      shippingAmount -
      kitTaxAmountDirectCard -
      kitCost;
    kitMarginDirectCard =
      kitSuggestedPriceDirectCard > 0
        ? (kitNetProfitDirectCard / kitSuggestedPriceDirectCard) * 100
        : 0;
  }

  return {
    filamentCost,
    energyCost,
    depreciationCost,
    packagingCost,
    totalCost,
    unitsPerBatch,
    plateTotalCost,
    minimumPrice,
    suggestedPrice,
    suggestedPriceShopee,
    suggestedPriceML,
    suggestedPriceDirectCash,
    suggestedPriceDirectCard,
    kitSuggestedPriceShopee,
    kitSuggestedPriceML,
    kitSuggestedPriceDirectCash,
    kitSuggestedPriceDirectCard,
    kitMarginShopee,
    kitMarginML,
    kitMarginDirectCash,
    kitMarginDirectCard,
    profitPerSale,
    margin,
    cascataShopee,
    cascataML,
    priceToAnnounceForPromo,
    profitPerHour,
    compareAtPriceResult,
  };
}

export function simulateProfitFromCompetitor(params: {
  competitorPrice: number;
  yourCost: number;
}): ProfitSimulationResult {
  const { competitorPrice, yourCost } = params;
  const profit = calcProfit(competitorPrice, yourCost);
  const margin = calcMarginPercentage(competitorPrice, yourCost);

  let recommendation: string;

  if (margin < 0) {
    recommendation =
      "A este preço você tem prejuízo. Considere subir o valor ou reduzir custos antes de competir.";
  } else if (margin < 15) {
    recommendation =
      "Margem muito apertada. Só vale competir se for um produto de grande volume ou para ganhar reputação.";
  } else if (margin < 30) {
    recommendation =
      "Margem razoável. Avalie benefícios de ficar um pouco acima ou abaixo do concorrente.";
  } else {
    recommendation =
      "Margem saudável. Você pode competir por valor agregado (kit, combo, prazo, frete) sem sacrificar lucro.";
  }

  return { profit, margin, recommendation };
}
