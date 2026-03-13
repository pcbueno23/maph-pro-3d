import type { CalculatorFormValues } from "@/types";
import { calculatorSchema } from "@/types";
import { calculateAll } from "@/lib/calculations";

export function safeParseCalculatorValues(raw: unknown): CalculatorFormValues | null {
  try {
    return calculatorSchema.parse(raw);
  } catch {
    return null;
  }
}

export function computePricingFromFormValues(
  values: CalculatorFormValues,
) {
  return calculateAll(values);
}

