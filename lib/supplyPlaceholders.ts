/** Id fictício na calculadora margem certa até o usuário escolher filamento em /insumos. */
export const LAB_PRINTING_SUPPLY_FALLBACK_ID = "lab-local";

/** Placeholder da calculadora de markup até o usuário escolher filamento. */
export const MARKUP_SUPPLY_PLACEHOLDER_ID = "_";

/** True quando o formulário ainda não tem um insumo real (não grava BOM no Supabase). */
export function isPlaceholderSupplyId(id: string | undefined | null): boolean {
  if (id == null || String(id).trim() === "") return true;
  const s = String(id).trim();
  return s === LAB_PRINTING_SUPPLY_FALLBACK_ID || s === MARKUP_SUPPLY_PLACEHOLDER_ID;
}
