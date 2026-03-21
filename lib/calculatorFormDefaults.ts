import type { CalculatorFormValues, SettingsValues } from "@/types";
import { CALCULATOR_ADVANCED_DEFAULTS } from "@/types";
import { DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";

/** Recorte de `settings.printer` usado para potência “preset” (sem impressora do Supabase). */
export type PrinterSettingsSlice = {
  presetId?: string;
  customPowerW?: number;
  customPresets?: { id: string; averagePowerW: number }[];
};

export function getPrinterSettingsSlice(settings: SettingsValues): PrinterSettingsSlice {
  return settings.printer ?? {
    presetId: undefined,
    customPowerW: undefined,
    customPresets: [],
  };
}

/**
 * Valores iniciais do formulário da calculadora — alinhados à Calculadora de markup.
 * @param labSupplyFallbackId — se definido (calculadora margem certa), preenche `material.supplyId` para o schema.
 */
export function getCalculatorFormDefaults(
  settings: SettingsValues,
  printerSettings: PrinterSettingsSlice,
  options?: { labSupplyFallbackId?: string },
): CalculatorFormValues {
  const customPresets = printerSettings.customPresets ?? [];
  const fromCustom =
    typeof printerSettings.presetId === "string" && printerSettings.presetId.startsWith("custom:")
      ? customPresets.find((p) => p.id === printerSettings.presetId!.slice("custom:".length))
          ?.averagePowerW
      : undefined;
  const powerW = printerSettings.customPowerW ?? fromCustom ?? 250;

  return {
    productName: "",
    material: {
      weight: 50,
      pricePerKg: 120,
      type: "PLA",
      // Schema exige string não vazia; margem certa usa id fictício, calculadora principal usa placeholder até o usuário escolher filamento.
      supplyId: options?.labSupplyFallbackId ?? "_",
      plateWeight: undefined,
    },
    time: {
      hours: 3,
      powerW,
      printerId: settings.printer?.defaultPrinterId || undefined,
      unitsPerBatch: 1,
    },
    costs: {
      kwhPrice: settings.defaults.kwhPrice,
      printerCost: settings.defaults.printerCost,
      lifetimeHours: settings.defaults.lifetimeHours,
      residualValue: settings.defaults.residualValue ?? 0,
      annualMaintenance: settings.defaults.annualMaintenance ?? 0,
      infrastructureYear: settings.defaults.infrastructureYear ?? 0,
      yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
      packaging: settings.defaults.packaging,
    },
    pricing: {
      marketplace: "Shopee",
      personType: "CPF",
      marketplaceFee: DEFAULT_MARKETPLACE_FEES["Shopee"].CPF,
      desiredMargin: settings.defaults.desiredMargin,
      shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
      taxPercent: 0,
      taxMode: settings.defaults.taxMode ?? "net_marketplace",
      mlClassic: settings.defaults.mlClassic ?? false,
      freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
      discountPercent: 0,
      comparePrice: undefined,
      cardFeePercent: settings.defaults.cardFeePercent ?? 0,
    },
    advanced: {
      ...CALCULATOR_ADVANCED_DEFAULTS,
      ...settings.advanced,
    },
  };
}

/**
 * Reaplica padrões salvos em Configurações (ajustes avançados, custos padrão, preset de potência)
 * sem apagar a simulação atual — igual ao efeito `[settings]` da `useCalculator`.
 * Quando há impressora selecionada (cadastro Supabase), mantém potência/tarifa/custo vindos dela.
 */
export function applySettingsToCalculatorForm(
  current: CalculatorFormValues,
  settings: SettingsValues,
  printerSettings: PrinterSettingsSlice,
): CalculatorFormValues {
  const customPresets = printerSettings.customPresets ?? [];
  const selectedPrinterId = current.time?.printerId ?? "";
  const resolvedPowerW = (() => {
    if (printerSettings.customPowerW) return printerSettings.customPowerW;
    if (
      typeof printerSettings.presetId === "string" &&
      printerSettings.presetId.startsWith("custom:")
    ) {
      const id = printerSettings.presetId.slice("custom:".length);
      const preset = customPresets.find((p) => p.id === id);
      if (preset) return preset.averagePowerW;
    }
    return current.time?.powerW ?? 250;
  })();

  return {
    ...current,
    costs: {
      ...current.costs,
      kwhPrice: selectedPrinterId ? current.costs.kwhPrice : settings.defaults.kwhPrice,
      printerCost: selectedPrinterId ? current.costs.printerCost : settings.defaults.printerCost,
      lifetimeHours: selectedPrinterId ? current.costs.lifetimeHours : settings.defaults.lifetimeHours,
      residualValue: settings.defaults.residualValue ?? 0,
      annualMaintenance: settings.defaults.annualMaintenance ?? 0,
      infrastructureYear: settings.defaults.infrastructureYear ?? 0,
      yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
      packaging: settings.defaults.packaging,
    },
    time: {
      ...current.time,
      powerW: selectedPrinterId ? current.time.powerW : resolvedPowerW,
    },
    pricing: {
      ...current.pricing,
      desiredMargin: settings.defaults.desiredMargin,
      shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
      taxMode: settings.defaults.taxMode ?? "net_marketplace",
      mlClassic: settings.defaults.mlClassic ?? false,
      freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
    },
    advanced: {
      ...CALCULATOR_ADVANCED_DEFAULTS,
      ...settings.advanced,
    },
  };
}
