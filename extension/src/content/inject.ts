/**
 * Roda no MAIN world (o mesmo contexto JS da página da Shopee, não o mundo
 * isolado padrão de content script) — só assim dá pra sobrescrever o
 * `window.fetch` ANTES do bundle da Shopee inicializar e fazer suas próprias
 * chamadas de API. A extensão não faz a chamada por conta própria (a Shopee
 * bloqueia com erro de anti-bot, `error: 90309999` — a API interna deles
 * exige um token de fingerprint gerado pelo próprio bundle deles, ver
 * `lib/shopeeCapturePatterns.ts`); em vez disso, ela lê a resposta da
 * chamada que a própria página já faz sozinha.
 */

import { CAPTURE_PATTERNS, type CapturePatternKey } from "../lib/shopeeCapturePatterns";

type Capture = { url: string; json: unknown; capturedAt: number };

const cache: Partial<Record<CapturePatternKey, Capture>> = {};

function matchedKey(url: string): CapturePatternKey | null {
  for (const key of Object.keys(CAPTURE_PATTERNS) as CapturePatternKey[]) {
    if (CAPTURE_PATTERNS[key].test(url)) return key;
  }
  return null;
}

function record(url: string, json: unknown) {
  const key = matchedKey(url);
  if (!key) return;
  const capture: Capture = { url, json, capturedAt: Date.now() };
  cache[key] = capture;
  window.dispatchEvent(new CustomEvent("mp3d:shopee-api", { detail: { key, capture } }));
}

// Isolated world (Overlay/Panel) não enxerga `cache` diretamente — pede um
// "replay" por evento pra cobrir o caso da resposta ter chegado antes do
// listener isolado montar.
window.addEventListener("mp3d:request-cache", ((e: CustomEvent<{ key: CapturePatternKey }>) => {
  const capture = cache[e.detail.key];
  if (capture) {
    window.dispatchEvent(new CustomEvent("mp3d:shopee-api", { detail: { key: e.detail.key, capture } }));
  }
}) as EventListener);

const originalFetch = window.fetch;
window.fetch = async function patchedFetch(...args: Parameters<typeof fetch>) {
  const response = await originalFetch.apply(this, args);
  try {
    const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
    if (matchedKey(url)) {
      response
        .clone()
        .json()
        .then((json) => record(url, json))
        .catch(() => {
          /* corpo não é JSON — ignora */
        });
    }
  } catch {
    /* nunca deixa o interceptor quebrar a página */
  }
  return response;
};

// Um patch de XMLHttpRequest chegou a existir aqui (pro caso da Shopee usar
// XHR em vez de fetch pra alguma dessas chamadas), mas foi removido: um
// construtor substituto "na mão" perde as constantes estáticas da classe
// original (`XMLHttpRequest.DONE` etc.), e qualquer código da própria Shopee
// que compare `xhr.readyState === XMLHttpRequest.DONE` quebra silenciosamente
// (foi exatamente isso que causou o "Cannot read properties of null" na
// própria página ao testar). A Shopee é uma SPA moderna e usa fetch pras
// chamadas de API observadas aqui, então isso não deveria fazer falta — se um
// dia precisar cobrir XHR de novo, copiar TODAS as propriedades estáticas
// (`UNSENT/OPENED/HEADERS_RECEIVED/LOADING/DONE`) pro substituto.
