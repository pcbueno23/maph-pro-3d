/**
 * Utilidades pequenas em cima dos dados da Shopee. As chamadas diretas à API
 * interna (`fetchItemDetail`/`fetchShopDetail` que existiam aqui antes)
 * foram removidas — a Shopee rejeita qualquer fetch que não seja disparado
 * pelo próprio bundle deles (`error: 90309999`, proteção anti-bot "shpsec").
 * Os dados ricos agora vêm de espiar a resposta que a própria página já
 * busca — ver `content/inject.ts` + `lib/shopeeCapture.ts` + `lib/shopeeParse.ts`.
 */

/** Extrai shopId/itemId de uma URL de anúncio Shopee (padrão "...-i.<shopId>.<itemId>"). */
export function parseItemUrl(url: string): { shopId: string; itemId: string } | null {
  const match = url.match(/-i\.(\d+)\.(\d+)/);
  if (!match) return null;
  return { shopId: match[1], itemId: match[2] };
}

export function daysSince(date: Date | null): number | null {
  if (!date) return null;
  const ms = Date.now() - date.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function salesPerDayEstimate(sold: number | null, createdDaysAgo: number | null): number | null {
  if (sold == null) return null;
  const days = Math.max(1, createdDaysAgo ?? 1);
  return sold / days;
}
