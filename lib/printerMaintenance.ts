import type { Product, ProductionOrder } from "@/types";

/**
 * Horas de impressão acumuladas numa impressora desde a última manutenção — não existe
 * coluna de duração na ordem, então é sempre derivado: tempo estimado do produto ×
 * quantidade, só das ordens já concluídas ("done"), usando a impressora explícita da
 * ordem ou a padrão do produto quando a ordem não tiver uma definida.
 */
export function computeHoursSincePrinterMaintenance(
  printerId: string,
  lastMaintenanceAt: string | null,
  orders: ProductionOrder[],
  productById: Map<string, Product>,
): number {
  const cutoff = lastMaintenanceAt ? new Date(lastMaintenanceAt).getTime() : null;
  let minutes = 0;
  for (const o of orders) {
    if (o.status !== "done") continue;
    const product = productById.get(o.productId);
    const effectivePrinterId = o.printerId ?? product?.defaultPrinterId ?? null;
    if (effectivePrinterId !== printerId) continue;
    if (cutoff != null && new Date(o.updatedAt).getTime() < cutoff) continue;
    minutes += (product?.printTimeMinutes ?? 0) * o.quantity;
  }
  return minutes / 60;
}
