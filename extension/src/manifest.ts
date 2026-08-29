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
  host_permissions: ["https://*.shopee.com.br/*", "https://*.supabase.co/*"],
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
      matches: ["https://shopee.com.br/*-i.*", "https://*.shopee.com.br/*-i.*"],
      js: ["src/content/shopeeProduct/index.tsx"],
      run_at: "document_idle",
    },
    {
      matches: [
        "https://shopee.com.br/search*",
        "https://shopee.com.br/*/search*",
        "https://shopee.com.br/Todos-os-Produtos*",
        "https://shopee.com.br/*-cat.*",
      ],
      js: ["src/content/shopeeSearch/index.tsx"],
      run_at: "document_idle",
    },
  ],
});
