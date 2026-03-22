import type { ProductionOrder } from "@/types";

/**
 * Ao entrar em "Em impressão", grava o instante atual.
 * Enquanto permanece em impressão, mantém o mesmo instante (não reinicia ao editar).
 * Ao sair de impressão, limpa (null).
 */
export function computePrintingStartedAtForSave(
  previous: ProductionOrder | null,
  newStatus: ProductionOrder["status"],
): string | null {
  const wasPrinting = previous?.status === "printing";
  const isPrinting = newStatus === "printing";
  if (!isPrinting) return null;
  if (!wasPrinting) return new Date().toISOString();
  return previous?.printingStartedAt ?? new Date().toISOString();
}
