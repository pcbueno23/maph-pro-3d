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
} as const;

export type CapturePatternKey = keyof typeof CAPTURE_PATTERNS;
