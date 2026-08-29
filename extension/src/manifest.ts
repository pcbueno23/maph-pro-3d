import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "../package.json";

export default defineManifest({
  manifest_version: 3,
  name: "Maph Pro 3D — Inteligência de Mercado",
  description:
    "Simula sua margem direto em anúncios da Shopee, destaca produtos campeões e sugere palavras-chave — tudo com os dados que você já configurou no Maph Pro 3D.",
  version: pkg.version,
  icons: {
    16: "public/icons/icon16.png",
    48: "public/icons/icon48.png",
    128: "public/icons/icon128.png",
  },
  action: {
    default_popup: "src/popup/index.html",
    default_icon: {
      16: "public/icons/icon16.png",
      48: "public/icons/icon48.png",
      128: "public/icons/icon128.png",
    },
  },
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["storage", "activeTab", "contextMenus"],
  host_permissions: [
    "https://*.shopee.com.br/*",
    "https://*.supabase.co/*",
    // CDN de imagens da Shopee — precisa da permissão de host pra baixar as
    // imagens da galeria sem cair no bloqueio de CORS (baixar tudo num .zip).
    "https://*.susercontent.com/*",
    "https://*.shopeemobile.com/*",
    // Preenche sozinho o campo de busca por imagem do MakerWorld (ver
    // src/content/makerworldInject.ts) quando vem de um recorte da Shopee.
    "https://*.makerworld.com/*",
  ],
  content_scripts: [
    {
      // Roda no "MAIN world" (o mesmo contexto JS da própria página, não o
      // isolado padrão de content script) — precisa ser assim pra poder
      // interceptar o `window.fetch` que o bundle da Shopee usa. A API
      // interna da Shopee (pdp/get_pc, search_items) tem proteção anti-bot
      // (shpsec) que rejeita qualquer fetch que não seja disparado pelo
      // próprio código deles — então em vez de replicar a chamada, a
      // extensão espia a resposta da chamada que a página já faz sozinha.
      matches: ["https://shopee.com.br/*", "https://*.shopee.com.br/*"],
      js: ["src/content/inject.ts"],
      world: "MAIN",
      run_at: "document_start",
    },
    {
      // Um único script cobrindo o domínio inteiro: a Shopee é uma SPA, e
      // content scripts só são (re)injetados em carregamentos de página de
      // verdade — não em navegações internas do JS deles (ex.: clicar num
      // anúncio a partir da busca). Este script detecta sozinho, via URL, se
      // deve mostrar o card de anúncio ou o painel de busca (ver router.tsx).
      matches: ["https://shopee.com.br/*", "https://*.shopee.com.br/*"],
      js: ["src/content/router.tsx"],
      run_at: "document_idle",
    },
    {
      // Preenche sozinho o campo de busca por imagem quando a aba abre com
      // uma imagem pendente de um recorte feito na Shopee (ver
      // src/lib/makerworldHandoff.ts).
      matches: ["https://makerworld.com/*", "https://*.makerworld.com/*"],
      js: ["src/content/makerworldInject.ts"],
      run_at: "document_idle",
    },
  ],
});
