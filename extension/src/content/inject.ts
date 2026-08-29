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

// Cobre o caso (menos provável, mas barato de tratar) da Shopee usar XHR em
// vez de fetch pra alguma dessas chamadas.
const OriginalXHR = window.XMLHttpRequest;
function PatchedXHR(this: XMLHttpRequest) {
  const xhr = new OriginalXHR();
  const originalOpen = xhr.open.bind(xhr);
  let requestUrl = "";
  xhr.open = ((method: string, url: string, ...rest: unknown[]) => {
    requestUrl = url;
    // @ts-expect-error — assinatura variádica do XHR.open não tipa bem aqui
    return originalOpen(method, url, ...rest);
  }) as typeof xhr.open;

  xhr.addEventListener("load", () => {
    if (!matchedKey(requestUrl)) return;
    try {
      record(requestUrl, JSON.parse(xhr.responseText));
    } catch {
      /* corpo não é JSON — ignora */
    }
  });

  return xhr;
}
PatchedXHR.prototype = OriginalXHR.prototype;
// @ts-expect-error — substituição intencional do construtor global
window.XMLHttpRequest = PatchedXHR;
