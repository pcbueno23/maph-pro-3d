import { describe, expect, it } from "vitest";
import type { CalculatorFormValues } from "@/types";
import { calculateAll } from "@/lib/calculations";

function buildInput(overrides: Partial<CalculatorFormValues> = {}): CalculatorFormValues {
  return {
    productName: "Teste",
    material: {
      weight: 50,
      supplyId: "preset-pla-velvet-preto",
      pricePerKg: 139,
      type: "PLA",
      ...(overrides.material ?? {}),
    },
    time: {
      hours: 3,
      powerW: 95,
      printerId: "printer-1",
      unitsPerBatch: 1,
      ...(overrides.time ?? {}),
    },
    costs: {
      kwhPrice: 0.9,
      printerCost: 4810,
      lifetimeHours: 6000,
      residualValue: 0,
      annualMaintenance: 0,
      infrastructureYear: 0,
      yearlyPrintHours: 1000,
      packaging: 1.5,
      ...(overrides.costs ?? {}),
    },
    pricing: {
      marketplace: "Shopee",
      personType: "CPF",
      marketplaceFee: 14,
      desiredMargin: 30,
      shippingEstimate: 0,
      taxPercent: 6,
      taxMode: "gross",
      mlClassic: false,
      freeShipping: false,
      discountPercent: 0,
      cardFeePercent: 4.99,
      ...(overrides.pricing ?? {}),
    },
    advanced: {
      taxaFalha: 10,
      maoDeObraTipo: "hora",
      maoDeObraValor: 10,
      tempoManualMin: 30,
      descontoPercentual: 0,
      ...(overrides.advanced ?? {}),
    },
    ...overrides,
  };
}

describe("calculateAll", () => {
  it("usa custo real ajustado como base nas cascatas", () => {
    const results = calculateAll(buildInput());

    expect(results.cascataShopee.totalCost).toBeCloseTo(results.custoTotalAjustado, 6);
    expect(results.cascataML.totalCost).toBeCloseTo(results.custoTotalAjustado, 6);
    expect(results.custoTotalAjustado).toBeGreaterThan(results.totalCost);
  });

  it("aplica taxa de falha apenas sobre filamento+energia+depreciação", () => {
    const results = calculateAll(buildInput());
    const miolo = results.filamentCost + results.energyCost + results.depreciationCost;
    const expectedAdjusted = miolo / (1 - 0.1) + results.packagingCost + results.maoDeObraCusto;

    expect(results.custoTotalAjustado).toBeCloseTo(expectedAdjusted, 6);
  });

  it("muda custo quando preço de filamento do preset muda (override extremo)", () => {
    const low = calculateAll(buildInput({ material: { weight: 169, pricePerKg: 1, supplyId: "a", type: "PLA" } }));
    const mid = calculateAll(buildInput({ material: { weight: 169, pricePerKg: 80, supplyId: "b", type: "PLA" } }));
    const high = calculateAll(buildInput({ material: { weight: 169, pricePerKg: 139, supplyId: "c", type: "PLA" } }));

    expect(low.filamentCost).toBeLessThan(mid.filamentCost);
    expect(mid.filamentCost).toBeLessThan(high.filamentCost);
    expect(low.totalCost).toBeLessThan(high.totalCost);
  });

  it("recalcula taxas após desconto real", () => {
    const withoutDiscount = calculateAll(buildInput({ advanced: { descontoPercentual: 0, taxaFalha: 10, maoDeObraTipo: "hora", maoDeObraValor: 10, tempoManualMin: 30 } }));
    const withDiscount = calculateAll(buildInput({ advanced: { descontoPercentual: 10, taxaFalha: 10, maoDeObraTipo: "hora", maoDeObraValor: 10, tempoManualMin: 30 } }));

    expect(withDiscount.precoComDesconto).toBeLessThan(withoutDiscount.suggestedPrice);
    expect(withDiscount.lucroLiquidoReal).toBeLessThan(withoutDiscount.lucroLiquidoReal);
  });

  it("considera margem real abaixo da meta no alerta", () => {
    const results = calculateAll(
      buildInput({
        pricing: { desiredMargin: 45, marketplace: "Shopee", personType: "CPF", marketplaceFee: 14, shippingEstimate: 0, taxPercent: 6, taxMode: "gross", mlClassic: false, freeShipping: false, discountPercent: 0, cardFeePercent: 4.99 },
      }),
    );

    expect(results.alertaLucroAbaixoDaMeta).toBe(results.margemReal < 45);
  });
});
