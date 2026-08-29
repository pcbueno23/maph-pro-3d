/**
 * Único content script injetado em toda a shopee.com.br — decide o que
 * montar (card de anúncio, painel de busca ou nada) e reage a navegações
 * internas da Shopee (SPA: troca de página sem reload, ex. clicar num
 * anúncio a partir da busca), quando os outros dois scripts nunca chegam a
 * ser (re)injetados pela extensão porque não houve carregamento de página
 * de verdade.
 *
 * Não usamos monkey-patch de `history.pushState` pra detectar isso — esse
 * script roda em ISOLATED world, e um override de um built-in mutável ali
 * não se propaga pro código da própria página (MAIN world), que é quem de
 * fato chama `pushState`. Por isso: observar a URL via `MutationObserver` no
 * `<body>` + polling de reforço, igual ao padrão já usado nos scripts que
 * este arquivo substitui.
 */
import { mountProductOverlay } from "./shopeeProduct";
import { mountSearchPanel } from "./shopeeSearch";

type PageKind = "product" | "search" | null;

function detectKind(href: string): PageKind {
  if (/-i\.\d+\.\d+/.test(href)) return "product";
  if (
    /\/search/.test(href) ||
    /\/Todos-os-Produtos/i.test(href) ||
    /-cat\.\d+/.test(href)
  ) {
    return "search";
  }
  return null;
}

let currentKind: PageKind = null;
let cleanup: (() => void) | null = null;

function applyKind(kind: PageKind) {
  if (kind === currentKind) return;
  cleanup?.();
  cleanup = null;
  currentKind = kind;
  if (kind === "product") cleanup = mountProductOverlay();
  else if (kind === "search") cleanup = mountSearchPanel();
}

function checkUrl() {
  applyKind(detectKind(location.href));
}

checkUrl();

new MutationObserver(checkUrl).observe(document.body, { childList: true, subtree: true });
// Reforço: cobre o caso raro de uma troca de URL sem nenhuma mutação de DOM observável a tempo.
window.setInterval(checkUrl, 1000);
