import type { CalculatorFormValues, SettingsValues } from "@/types";
import {
  getCalculatorFormDefaults,
  getPrinterSettingsSlice,
} from "@/lib/calculatorFormDefaults";

/** Id fictício para o schema quando não há filamento de /insumos selecionado (margem certa). */
export const LAB_PRINTING_SUPPLY_FALLBACK_ID = "lab-local";

/** Mesmos defaults da Calculadora de markup + id de filamento para esta tela. */
export function buildLabPrintingFormDefaults(settings: SettingsValues): CalculatorFormValues {
  return getCalculatorFormDefaults(settings, getPrinterSettingsSlice(settings), {
    labSupplyFallbackId: LAB_PRINTING_SUPPLY_FALLBACK_ID,
  });
}
