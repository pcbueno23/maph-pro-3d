# Maph Pro 3D — Extensão de Inteligência de Mercado

Extensão Chrome (Manifest V3) que traz pra dentro da Shopee o que o app já
calcula: simula sua margem direto num anúncio de concorrente, destaca
produtos campeões numa busca e sugere palavras-chave por frequência entre os
títulos que aparecem na página. Login via a mesma conta Supabase do
Maph Pro 3D — puxa o preset ativo da calculadora Shopee pra simular com os
seus números reais (comissão, taxas, margem alvo), sem duplicar configuração.

## O que tem na v1

- **Simulação de preço no anúncio** (`content/shopeeProduct`) — lê o preço e
  o "vendidos" da página e mostra, num card flutuante, quanto você lucraria
  cobrando aquele preço e quanto precisaria cobrar pra bater sua meta de
  margem. Usa `lib/engines/shopee/engine.ts` **direto** (mesmo motor do app,
  sem duplicar lógica).
- **Produtos campeões + palavras-chave** (`content/shopeeSearch`) — varre os
  cards de uma busca/categoria, marca os mais vendidos com um selo e mostra
  as palavras que mais se repetem nos títulos (pista de SEO dos
  concorrentes).
- **Busca por imagem "MakerWorld"** — não existe API pública de busca reversa
  do MakerWorld, então a v1 abre o **Google Lens** apontando pra imagem
  (clique direito → "Buscar modelo 3D semelhante"). Ele já indexa o
  MakerWorld e costuma achar o modelo em poucos cliques. Se um dia surgir uma
  API oficial de busca por imagem do MakerWorld, é só trocar o handler em
  `src/background/index.ts`.

## Como isso se encaixa no projeto principal

Fica em `extension/` como um pacote Node **separado** (`package.json`,
`node_modules` e build próprios) — não interfere no `npm run build`/`dev` do
Next.js na raiz. A única coisa compartilhada de verdade é o import direto de
`../lib/engines/shopee/engine.ts`: qualquer mudança na calculadora Shopee do
app já reflete aqui automaticamente, sem precisar sincronizar nada.

## Rodando localmente

```bash
cd extension
npm install
cp .env.example .env   # ou edite o .env já commitado com as chaves de dev
npm run dev
```

Depois, em `chrome://extensions`:

1. Ative o "Modo do desenvolvedor" (canto superior direito).
2. "Carregar sem compactação" → selecione a pasta `extension/dist`.
3. Abra um anúncio ou uma busca na Shopee (`shopee.com.br`) pra ver os
   overlays.

O CRXJS mantém hot-reload: mudou o código, o `dist/` atualiza sozinho (às
vezes precisa clicar em "recarregar" no card da extensão em
`chrome://extensions` se o Chrome não pegar via HMR).

## Variáveis de ambiente (`.env`)

| Variável | O que é |
|---|---|
| `VITE_SUPABASE_URL` | Mesma URL do projeto Supabase do app principal |
| `VITE_SUPABASE_ANON_KEY` | Mesma anon/publishable key (é pública, sem problema embutir no bundle) |
| `VITE_APP_URL` | Domínio do app pra onde os links do popup apontam ("Abrir calculadora Shopee" etc.) — **ajuste pro domínio de produção antes de publicar**, hoje aponta pro `localhost:3000` porque não achei um `NEXT_PUBLIC_APP_URL` configurado no projeto principal pra copiar |

## Login

O popup autentica com e-mail/senha via `@supabase/supabase-js`, com a sessão
guardada em `chrome.storage.local` (não `localStorage` — o service worker do
Manifest V3 não tem acesso a `window`). Sign-in com Google (que o app
principal também oferece) **não está na v1** — precisaria de OAuth via
`chrome.identity`, fluxo diferente do `signInWithOAuth` normal do Supabase.

## Build de produção

```bash
npm run build
```

Gera `extension/dist/` pronto pra zipar e enviar pra Chrome Web Store. Antes
de publicar de verdade:

- Troque os ícones em `public/icons/` (hoje são placeholders sólidos gerados
  por script, só pra ter um ícone válido durante o desenvolvimento).
- Confirme `VITE_APP_URL` apontando pro domínio de produção.
- Revise `host_permissions`/`content_scripts` no `src/manifest.ts` — a
  Chrome Web Store pede justificativa por permissão pedida.

## Fragilidade conhecida (documentando de propósito)

A Shopee não tem API pública pros dados que a extensão lê — `scrape.ts` em
cada content script faz o parsing do HTML/texto renderizado, priorizando
fontes mais estáveis (meta tags, JSON-LD) e só caindo pra varredura de texto
como último recurso. **Se a Shopee mudar a estrutura da página, é ali que
precisa mexer primeiro.** Isso é esperado — qualquer ferramenta desse tipo
(inclusive a do concorrente que inspirou essa extensão) depende do DOM
público da página.
