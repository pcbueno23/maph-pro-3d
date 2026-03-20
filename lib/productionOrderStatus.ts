import type { ProductionOrder } from "@/types";

/**
 * Ordem do fluxo de produção (Kanban em /ordens, botão “avançar” e gráficos do dashboard).
 * Edite **apenas este array** para mudar a sequência em todo o app.
 * Não inclui `cancelled` (estado terminal fora do fluxo).
 *
 * Arquivo: `lib/productionOrderStatus.ts` (não duplique ordem em `page.tsx`).
 * Em dev, após mudar a ordem, dê um refresh na página se o gráfico não atualizar.
 */
export const PRODUCTION_ORDER_PIPELINE: ProductionOrder["status"][] = [
  "new",
  "preparing",
  "queued",
  "printing",
  "post_processing",
  "ready_to_ship",
  "done",
];

/**
 * Ordem no gráfico “Ordens por status” e em telas que listam todos os status (inclui cancelada).
 */
export const PRODUCTION_ORDER_STATUS_DISPLAY_ORDER: ProductionOrder["status"][] = [
  ...PRODUCTION_ORDER_PIPELINE,
  "cancelled",
];

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrder["status"], string> = {
  new: "Recebida",
  preparing: "Em preparação",
  queued: "Aguardando máquina",
  printing: "Em impressão",
  post_processing: "Acabamento",
  ready_to_ship: "Pronto para envio",
  done: "Concluída",
  cancelled: "Cancelada",
};

/** Cores dos gráficos e indicadores (dashboard). */
export const PRODUCTION_ORDER_STATUS_COLORS: Record<ProductionOrder["status"], string> = {
  new: "#60a5fa",
  preparing: "#34d399",
  queued: "#fbbf24",
  printing: "#22c55e",
  post_processing: "#a78bfa",
  ready_to_ship: "#38bdf8",
  done: "#10b981",
  cancelled: "#fb7185",
};

/** Próximo status no fluxo principal (ignora cancelada). */
export function nextProductionOrderStatus(
  current: ProductionOrder["status"],
): ProductionOrder["status"] {
  const idx = PRODUCTION_ORDER_PIPELINE.indexOf(current);
  if (idx === -1 || idx === PRODUCTION_ORDER_PIPELINE.length - 1) return current;
  return PRODUCTION_ORDER_PIPELINE[idx + 1]!;
}
