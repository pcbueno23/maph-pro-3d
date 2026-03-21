import type { TaxRegime } from "./types";

/**
 * Alíquota efetiva sobre o preço de venda (modelo simplificado).
 * CPF/MEI: 0% no cálculo (taxas fixas/DAS ficam fora deste motor).
 */
export function taxRateDecimalFromRegime(
  regime: TaxRegime,
  simplesPercent: number,
  lucroPercent: number
): number {
  switch (regime) {
    case "CPF_MEI":
      return 0;
    case "SIMPLES":
      return Math.max(0, simplesPercent) / 100;
    case "LUCRO":
      return Math.max(0, lucroPercent) / 100;
    default:
      return 0;
  }
}
