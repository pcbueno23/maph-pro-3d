import type { CalculatorFormValues, SettingsValues } from "@/types";
import {
  getCalculatorFormDefaults,
  getPrinterSettingsSlice,
} from "@/lib/calculatorFormDefaults";
import {
  LAB_PRINTING_SUPPLY_FALLBACK_ID,
  isPlaceholderSupplyId,
  MARKUP_SUPPLY_PLACEHOLDER_ID,
} from "@/lib/supplyPlaceholders";

export { LAB_PRINTING_SUPPLY_FALLBACK_ID, isPlaceholderSupplyId, MARKUP_SUPPLY_PLACEHOLDER_ID };

/** Mesmos defaults da Calculadora de markup + id de filamento para esta tela. */
export function buildLabPrintingFormDefaults(settings: SettingsValues): CalculatorFormValues {
  return getCalculatorFormDefaults(settings, getPrinterSettingsSlice(settings), {
    labSupplyFallbackId: LAB_PRINTING_SUPPLY_FALLBACK_ID,
  });
}
