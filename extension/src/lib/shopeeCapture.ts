/**
 * Lado "isolated world" da ponte com `content/inject.ts` (que roda no MAIN
 * world). Comunicação só por evento em `window` — os dois mundos não
 * compartilham variáveis/propriedades diretamente, só o DOM/eventos. Ver
 * `lib/shopeeCapturePatterns.ts` pra fonte única das chaves observadas.
 */
import type { CapturePatternKey } from "./shopeeCapturePatterns";

export type Capture = { url: string; json: unknown; capturedAt: number };

/**
 * Espera a próxima captura de `patternKey` — ou a que já estiver em cache no
 * MAIN world (pede um "replay" via evento, cobre a corrida de a página já
 * ter feito a chamada antes deste listener existir). Resolve `null` se nada
 * chegar dentro de `timeoutMs`.
 */
export function waitForCapture(
  patternKey: CapturePatternKey,
  opts: { timeoutMs?: number } = {},
): Promise<Capture | null> {
  const { timeoutMs = 8000 } = opts;

  return new Promise((resolve) => {
    // Declarado (mesmo que ainda sem valor) ANTES de registrar o listener e
    // disparar "request-cache": se já existir uma captura em cache, o
    // replay chega de volta SÍNCRONO (dispatchEvent chama listeners na
    // hora), e `finish` roda antes da linha `window.setTimeout(...)` mais
    // abaixo — sem isso, `timer` ainda estaria na "zona morta" (TDZ) nesse
    // caminho, e limpar o timeout explodia com ReferenceError.
    let timer: number | undefined;
    let done = false;
    const finish = (value: Capture | null) => {
      if (done) return;
      done = true;
      window.removeEventListener("mp3d:shopee-api", handler as EventListener);
      window.clearTimeout(timer);
      resolve(value);
    };

    const handler = (e: CustomEvent<{ key: CapturePatternKey; capture: Capture }>) => {
      if (e.detail.key !== patternKey) return;
      finish(e.detail.capture);
    };

    window.addEventListener("mp3d:shopee-api", handler as EventListener);
    window.dispatchEvent(new CustomEvent("mp3d:request-cache", { detail: { key: patternKey } }));

    timer = window.setTimeout(() => {
      // Nível "warn", não "error": é comum e esperado — acontece sempre que a
      // Shopee mostra uma tela de captcha/verificação (nesse caso ela nunca
      // chega a fazer a chamada de dados do anúncio) e não é uma falha da
      // extensão. Um "error" real aqui poluía a aba "Erros" do
      // chrome://extensions com algo que não precisa de ação nenhuma.
      console.warn(
        `[Maph Pro 3D] não capturei nenhuma chamada "${patternKey}" da própria Shopee em ${timeoutMs}ms — a página pode não ter feito essa chamada nesse período (comum quando a Shopee mostra captcha/verificação), ou mudou de endpoint.`,
      );
      finish(null);
    }, timeoutMs);
  });
}

/** Ouve TODAS as capturas futuras de `patternKey` (sem parar no primeiro resultado) — usado na busca, onde a Shopee pode paginar/refazer a chamada. */
export function onCapture(
  patternKey: CapturePatternKey,
  onEach: (capture: Capture) => void,
): () => void {
  const handler = (e: CustomEvent<{ key: CapturePatternKey; capture: Capture }>) => {
    if (e.detail.key === patternKey) onEach(e.detail.capture);
  };
  window.addEventListener("mp3d:shopee-api", handler as EventListener);
  window.dispatchEvent(new CustomEvent("mp3d:request-cache", { detail: { key: patternKey } }));
  return () => window.removeEventListener("mp3d:shopee-api", handler as EventListener);
}

export type Diagnostic = {
  loadedAt: number;
  fetchesSeen: number;
  lastUrl: string | null;
  matchedCounts: Partial<Record<CapturePatternKey, number>>;
};

/**
 * Estado ao vivo do interceptor (MAIN world) — pra mostrar direto na tela
 * que ele está de fato ativo, sem precisar abrir o console. `onUpdate`
 * dispara de novo a cada fetch que a página faz.
 */
export function onDiagnostic(onUpdate: (d: Diagnostic) => void): () => void {
  const handler = (e: CustomEvent<Diagnostic>) => onUpdate(e.detail);
  window.addEventListener("mp3d:diagnostic", handler as EventListener);
  window.dispatchEvent(new CustomEvent("mp3d:request-diagnostic"));
  return () => window.removeEventListener("mp3d:diagnostic", handler as EventListener);
}
