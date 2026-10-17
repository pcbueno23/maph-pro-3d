/**
 * Fonte única dos padrões de URL observados — importado tanto por
 * `content/inject.ts` (MAIN world, faz o match) quanto por
 * `lib/shopeeCapture.ts` (ISOLATED world, pede o replay pela mesma chave).
 * Isso é compartilhamento em tempo de build (o bundler resolve o import
 * normalmente); em runtime os dois mundos continuam isolados e só se falam
 * por evento — é por isso que a CHAVE (string) precisa ser idêntica dos dois
 * lados, não a regex em si.
 */
export const CAPTURE_PATTERNS = {
  pdpGetPc: /\/api\/v4\/pdp\/get_pc/,
  searchItems: /\/api\/v4\/search\/search_items/,
  itemGet: /\/api\/v4\/item\/get/, // fallback caso a Shopee use esse endpoint em algum fluxo
  // Página da LOJA (ex.: shopee.com.br/<nome-da-loja>) — confirmado ao vivo com captura real
  // em 17/10/2026: NÃO usa search_items, usa esse endpoint à parte (item_cards em
  // data.centralize_item_card.item_cards, ver lib/shopeeParse.ts#parseShopRcmdItems).
  shopRcmdItems: /\/api\/v4\/shop\/rcmd_items/,
} as const;

export type CapturePatternKey = keyof typeof CAPTURE_PATTERNS;
