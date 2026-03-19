import type { CalculatorFormValues } from "@/types";
import {
  aplicarDesconto,
  calcularLucroReal,
  calcularMaoDeObra,
} from "@/lib/advancedCalculations";
import {
  calcFilamentCost,
  calcEnergyCost,
  calcDepreciation,
  calcTotalCost,
} from "@/lib/calculations";
import {
  getEffectiveMarketplaceFeePercent,
  getShopeeFeeBreakdown,
  getMLFeeBreakdown,
  getShopeeSuggestedPrice,
  getMLSuggestedPrice,
} from "@/lib/marketplaceFees";

export function calcularCustoBase(input: CalculatorFormValues) {
  const units =
    typeof input.time.unitsPerBatch === "number" && input.time.unitsPerBatch > 0
      ? input.time.unitsPerBatch
      : 1;
  const horasPorUn = units > 0 ? input.time.hours / units : input.time.hours;

  const pesoPorUn =
    typeof input.material.plateWeight === "number" &&
    input.material.plateWeight > 0 &&
    units > 0
      ? input.material.plateWeight / units
      : input.material.weight;

  const filamentCost = calcFilamentCost(pesoPorUn, input.material.pricePerKg);
  const energyCost = calcEnergyCost(input.time.powerW, horasPorUn, input.costs.kwhPrice);
  const depreciationCost = calcDepreciation({
    printerCost: input.costs.printerCost,
    residualValue: input.costs.residualValue ?? 0,
    lifetimeHours: input.costs.lifetimeHours,
    annualMaintenance: input.costs.annualMaintenance ?? 0,
    infrastructureYear: input.costs.infrastructureYear ?? 0,
    yearlyPrintHours: input.costs.yearlyPrintHours ?? 0,
    printHours: horasPorUn,
  });
  const packagingCost = input.costs.packaging;
  const totalCost = calcTotalCost({ filamentCost, energyCost, depreciationCost, packagingCost });

  return {
    unitsPerBatch: units,
    printHoursPerUnit: horasPorUn,
    weightPerUnit: pesoPorUn,
    filamentCost,
    energyCost,
    depreciationCost,
    packagingCost,
    totalCost,
  };
}

export function aplicarTaxaFalha(custoBase: number, taxaFalhaPercent: number) {
  const base = Number(custoBase ?? 0);
  const t = Number(taxaFalhaPercent ?? 0);
  if (!Number.isFinite(base) || base <= 0) return Math.max(0, base);
  if (!Number.isFinite(t) || t <= 0) return base;
  const denom = 1 - t / 100;
  if (denom <= 0) return base;
  return base / denom;
}

export function calcularPrecoComMargem(params: {
  totalCost: number;
  input: CalculatorFormValues;
}) {
  const { input, totalCost } = params;
  const shippingAmount = input.pricing.shippingEstimate ?? 0;
  const taxPercent = input.pricing.taxPercent ?? 0;

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
  return { suggestedPrice, suggestedPriceShopee, suggestedPriceML };
}

export function calcularTaxas(params: {
  marketplace: "Shopee" | "Mercado Livre";
  input: CalculatorFormValues;
  sellingPrice: number;
}) {
  const { marketplace, input, sellingPrice } = params;

  const feePercent = getEffectiveMarketplaceFeePercent(
    marketplace,
    input.pricing.personType,
    sellingPrice,
    marketplace === "Shopee"
      ? { freeShipping: input.pricing.freeShipping ?? false }
      : { classicML: input.pricing.mlClassic ?? false },
  );

  const breakdown =
    marketplace === "Shopee"
      ? getShopeeFeeBreakdown(
          sellingPrice,
          input.pricing.personType,
          input.pricing.freeShipping ?? false,
        )
      : getMLFeeBreakdown(
          sellingPrice,
          input.pricing.personType,
          input.pricing.mlClassic ?? false,
        );

  const marketplaceFeeAmount = (sellingPrice * feePercent) / 100;
  return { feePercent, breakdown, marketplaceFeeAmount };
}

export function calcularImpostos(params: {
  input: CalculatorFormValues;
  sellingPrice: number;
  commissionRateDecimal: number;
}) {
  const { input, sellingPrice, commissionRateDecimal } = params;
  const taxPercent = input.pricing.taxPercent ?? 0;
  const taxMode = input.pricing.taxMode ?? "net_marketplace";
  const rate = (taxPercent ?? 0) / 100;
  if (rate <= 0 || sellingPrice <= 0) return 0;
  if (taxMode === "net_marketplace") {
    const netBase = sellingPrice * (1 - commissionRateDecimal);
    return netBase * rate;
  }
  return sellingPrice * rate;
}

export function calcularPrecoCompleto(input: CalculatorFormValues) {
  // 1) custo base
  const base = calcularCustoBase(input);

  // 2) taxa de falha
  const taxaFalha = input.advanced?.taxaFalha ?? 10;
  const custoComFalha = aplicarTaxaFalha(base.totalCost, taxaFalha);

  // 3) mão de obra (somada depois da falha, conforme especificação)
  const maoDeObraTipo = input.advanced?.maoDeObraTipo ?? "fixo";
  const maoDeObraValor = input.advanced?.maoDeObraValor ?? 0;
  const tempoManualMin = input.advanced?.tempoManualMin ?? 0;
  const maoDeObraCusto = calcularMaoDeObra({ maoDeObraTipo, maoDeObraValor, tempoManualMin });
  const custoTotalAjustado = custoComFalha + maoDeObraCusto;

  // 4) preço sugerido (com margem) usando custo ajustado
  const margemRes = calcularPrecoComMargem({ totalCost: custoTotalAjustado, input });

  // 5) desconto real sobre preço sugerido
  const desconto = input.advanced?.descontoPercentual ?? 0;
  const precoShopeeComDesconto = aplicarDesconto({
    preco: margemRes.suggestedPriceShopee,
    descontoPercentual: desconto,
  });
  const precoMLComDesconto = aplicarDesconto({
    preco: margemRes.suggestedPriceML,
    descontoPercentual: desconto,
  });

  // 6) taxas após desconto
  const taxasShopee = calcularTaxas({
    marketplace: "Shopee",
    input,
    sellingPrice: precoShopeeComDesconto,
  });
  const taxasML = calcularTaxas({
    marketplace: "Mercado Livre",
    input,
    sellingPrice: precoMLComDesconto,
  });

  // 7) imposto após desconto (base real)
  const impostoShopee = calcularImpostos({
    input,
    sellingPrice: precoShopeeComDesconto,
    commissionRateDecimal: taxasShopee.breakdown.commissionRateDecimal,
  });
  const impostoML = calcularImpostos({
    input,
    sellingPrice: precoMLComDesconto,
    commissionRateDecimal: taxasML.breakdown.commissionRateDecimal,
  });

  // 8) lucro real
  const shippingAmount = input.pricing.shippingEstimate ?? 0;
  const lucroShopee = calcularLucroReal({
    precoComDesconto: precoShopeeComDesconto,
    taxasMarketplace: taxasShopee.marketplaceFeeAmount,
    imposto: impostoShopee,
    custoTotalAjustado: custoTotalAjustado + shippingAmount,
  });
  const lucroML = calcularLucroReal({
    precoComDesconto: precoMLComDesconto,
    taxasMarketplace: taxasML.marketplaceFeeAmount,
    imposto: impostoML,
    custoTotalAjustado: custoTotalAjustado + shippingAmount,
  });

  const worst =
    lucroShopee.lucroLiquidoReal <= lucroML.lucroLiquidoReal
      ? {
          channel: "Shopee" as const,
          precoComDesconto: precoShopeeComDesconto,
          taxas: taxasShopee,
          imposto: impostoShopee,
          lucro: lucroShopee,
        }
      : {
          channel: "Mercado Livre" as const,
          precoComDesconto: precoMLComDesconto,
          taxas: taxasML,
          imposto: impostoML,
          lucro: lucroML,
        };

  // ===== testes internos (dev) =====
  if (process.env.NODE_ENV !== "production") {
    if (worst.precoComDesconto > margemRes.suggestedPrice + 1e-9) {
      // eslint-disable-next-line no-console
      console.error("[calc] Desconto inconsistente: preço com desconto > preço sugerido.");
    }
    if (desconto > 0) {
      const feeNoDiscount = calcularTaxas({
        marketplace: worst.channel === "Shopee" ? "Shopee" : "Mercado Livre",
        input,
        sellingPrice: worst.channel === "Shopee" ? margemRes.suggestedPriceShopee : margemRes.suggestedPriceML,
      }).marketplaceFeeAmount;
      if (Math.abs(feeNoDiscount - worst.taxas.marketplaceFeeAmount) < 1e-9) {
        // eslint-disable-next-line no-console
        console.error("[calc] Taxas não mudaram com desconto (provável bug).");
      }
    }
  }

  return {
    base,
    taxaFalhaPercent: taxaFalha,
    maoDeObra: { tipo: maoDeObraTipo, valor: maoDeObraValor, tempoManualMin, custo: maoDeObraCusto },
    custoTotalAjustado,
    suggested: margemRes,
    descontoPercentual: desconto,
    worstChannel: worst.channel,
    precoComDesconto: worst.precoComDesconto,
    taxasMarketplace: worst.taxas.marketplaceFeeAmount,
    imposto: worst.imposto,
    lucroLiquidoReal: worst.lucro.lucroLiquidoReal,
    margemReal: worst.lucro.margemReal,
  };
}

