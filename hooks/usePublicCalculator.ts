"use client";

import { useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculatorSchema, type CalculatorFormValues } from "@/types";
import { DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";
import { computePricingFromFormValues, safeParseCalculatorValues } from "@/lib/pricingEngine";
import { MARKUP_SUPPLY_PLACEHOLDER_ID } from "@/lib/supplyPlaceholders";
import { useDebounce } from "./useDebounce";

/** Defaults neutros para a calculadora pública (sem configurações do usuário). */
const PUBLIC_DEFAULTS: CalculatorFormValues = {
  productName: "",
  material: {
    weight: 25,
    pricePerKg: 120,
    type: "PLA",
    supplyId: MARKUP_SUPPLY_PLACEHOLDER_ID,
    plateWeight: undefined,
  },
  time: {
    hours: 3,
    powerW: 250,
    printerId: undefined,
    unitsPerBatch: 1,
  },
  costs: {
    kwhPrice: 0.8,
    printerCost: 2000,
    lifetimeHours: 5000,
    residualValue: 0,
    annualMaintenance: 200,
    infrastructureYear: 600,
    yearlyPrintHours: 1000,
    packaging: 2,
  },
  pricing: {
    marketplace: "Shopee",
    personType: "CPF",
    marketplaceFee: DEFAULT_MARKETPLACE_FEES["Shopee"].CPF,
    desiredMargin: 30,
    directSaleDesiredMargin: 40,
    shippingEstimate: 0,
    taxPercent: 0,
    taxMode: "net_marketplace",
    mlClassic: false,
    freeShipping: false,
    discountPercent: 0,
    comparePrice: undefined,
    cardFeePercent: 0,
  },
  advanced: {
    taxaFalha: 0,
    maoDeObraTipo: "fixo",
    maoDeObraValor: 0,
    tempoManualMin: 0,
    descontoPercentual: 0,
  },
};

export function usePublicCalculator() {
  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema) as Resolver<CalculatorFormValues>,
    mode: "onChange",
    defaultValues: PUBLIC_DEFAULTS,
  });

  const watched = form.watch();
  const debouncedValues = useDebounce(watched, 300);

  const results = useMemo(() => {
    const parsed = safeParseCalculatorValues(debouncedValues);
    if (!parsed) return null;
    return computePricingFromFormValues(parsed);
  }, [debouncedValues]);

  const isDirty = form.formState.isDirty;

  return { form, results, isDirty };
}
