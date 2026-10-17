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
import { mountShopPanel } from "./shopeeShop";
import { mountAuthModal } from "./authModalMount";

// Modal de login — independente de a página ser anúncio ou busca, então
// fica montado uma vez só, fora do liga/desliga de `applyKind` abaixo.
mountAuthModal();

type PageKind = "product" | "search" | "shop" | null;

/**
 * Rotas de 1 segmento que a Shopee reserva pra outras coisas (carrinho,
 * notificação, conta etc.) e que por isso NÃO são a página-vitrine de uma
 * loja, mesmo tendo o mesmo formato de URL (`shopee.com.br/<slug>`).
 * Confirmado real: página de loja é `shopee.com.br/storeffmaker?page=0&sortBy=sales&tab=0`
 * — um slug qualquer, sem outro segmento de path depois.
 */
const RESERVED_ROOT_PATHS = new Set([
  "cart", "checkout", "payment", "notification", "notifications", "wishlist",
  "flash_sale", "flashsale", "daily_discover", "live", "lives", "lucky_draw",
  "shopee_premium", "shopeepay", "lelong", "voucher", "vouchers", "coin", "coins",
  "m", "app_redirect", "download", "about-us", "legal", "terms", "privacy-policy",
  "help", "feedback", "verify", "buyer", "seller", "user", "sellercenter",
  "shop_collection", "campaign", "offline", "cancel", "return-refund", "chat",
  "inbox", "me", "settings", "address", "bank-account", "my-purchase", "product",
  "search", "cat", "void", "universal-link", "mall",
]);

function isShopPath(href: string): boolean {
  try {
    const path = new URL(href).pathname;
    const match = /^\/([^/]+)\/?$/.exec(path);
    if (!match) return false;
    const slug = match[1].toLowerCase();
    return slug.length > 0 && !RESERVED_ROOT_PATHS.has(slug);
  } catch {
    return false;
  }
}

/**
 * Link de afiliado (ex.: encurtador s.shopee.com.br) redireciona pra um
 * formato sem o "-i." do link canônico de produto — confirmado com um link
 * real do usuário: `https://shopee.com.br/opaanlp/921138965/58250528502`.
 * A Shopee não reescreve a URL sozinha pra o formato canônico depois de
 * carregar, então precisa reconhecer esse formato também.
 */
function isAffiliateProductPath(href: string): boolean {
  try {
    return /^\/[^/]+\/\d+\/\d+\/?$/.test(new URL(href).pathname);
  } catch {
    return false;
  }
}

function detectKind(href: string): PageKind {
  if (/-i\.\d+\.\d+/.test(href) || isAffiliateProductPath(href)) return "product";
  if (
    /\/search/.test(href) ||
    /\/Todos-os-Produtos/i.test(href) ||
    /-cat\.\d+/.test(href)
  ) {
    return "search";
  }
  if (isShopPath(href)) return "shop";
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
  else if (kind === "shop") cleanup = mountShopPanel();
}

function checkUrl() {
  applyKind(detectKind(location.href));
}

checkUrl();

new MutationObserver(checkUrl).observe(document.body, { childList: true, subtree: true });
// Reforço: cobre o caso raro de uma troca de URL sem nenhuma mutação de DOM observável a tempo.
window.setInterval(checkUrl, 1000);
