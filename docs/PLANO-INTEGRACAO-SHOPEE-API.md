# Plano futuro: Integração real com a API da Shopee (aplicar preço/desconto/cupom/oferta relâmpago automaticamente)

> **Status: NÃO implementar ainda.** Este é um plano guardado para quando o usuário pedir explicitamente para avançar essa etapa. A entrega atual (v0) é só a aba "Promoções Shopee" com os campos salvos por produto, servindo de cola manual — sem nenhuma conexão real com a Shopee. Este documento descreve a automação completa (fase futura), pra não perder o desenho já pesquisado quando chegar a hora.
>
> Quando o usuário pedir pra retomar isso, ler este arquivo inteiro antes de planejar/implementar — ele já contém a pesquisa da API da Shopee e o mapeamento pros padrões já usados no projeto.

## Contexto

A aba "Promoções Shopee" (v0, já implementada) deixa o usuário definir por produto: preço de cadastro desejado, desconto normal (%), cupom (% + teto R$) e oferta relâmpago (%) — hoje servindo só de cola pra digitação manual no painel da Shopee. Esta fase futura conecta a loja Shopee real do usuário via API oficial e aplica esses valores automaticamente, eliminando a digitação manual.

Isso é uma integração externa real (side effect visível numa loja em produção, mexendo em preços que compradores veem) — **a automação nunca deve aplicar nada sozinha/silenciosamente**. O usuário já confirmou que quer sempre revisar e confirmar explicitamente antes de qualquer chamada real ir pra Shopee (nunca sincronização automática em background). Também já confirmou que o v1 dessa automação deve cobrir **preço de cadastro + desconto normal + cupom** primeiro — **oferta relâmpago fica para depois**, por ser o módulo mais restrito da API da Shopee.

## Como cada campo mapeia pra API real da Shopee (Open Platform / Partner API)

Modelo "ISV multi-tenant": o SaaS se registra como Partner App (`partner_id`+`partner_key`, via open.shopee.com — usuário já tem ou já solicitou esse cadastro). Cada usuário final autoriza o app a acessar a loja dele via OAuth ("shop authorization"), gerando `shop_id`+`access_token`(~4h)+`refresh_token`(~30 dias) por loja. Toda chamada exige assinatura HMAC-SHA256 com o `partner_key` + timestamp.

| Campo do usuário | Módulo da API Shopee | Observações |
|---|---|---|
| Preço de cadastro | **Product API** (`update_price`) | Direto, sem restrição de horário. |
| Desconto normal | **Discount module** (`addDiscount` + `addDiscountItem`) | `start_time` precisa ser ≥1h no futuro, duração máxima <180 dias, máx. 1000 descontos ativos/futuros por loja, preço arbitrário — o mais simples dos três a implementar. |
| Cupom loja | **Voucher module** (`addVoucher`) | Suporta tipo fixo (R$) OU percentual **com teto em R$** nativamente — bate exatamente com os campos `shopeePromoCupomPercent`/`shopeePromoCupomMaxRS` já salvos no produto (v0). Exige período de validade, valor mínimo de pedido, quantidade de usos. |
| *(fase separada, depois)* Oferta relâmpago | **Shop Flash Sale** (self-service — diferente da "Shopee Flash Sale" curada pela própria Shopee, por convite) | Fluxo: `getTimeSlotId()` (só os horários que a Shopee oferece, não é livre) → `createShopFlashSale(timeslot_id)` → `addShopFlashSaleItems(item_id, input_promo_price, stock, purchase_limit)`. Limitações: máx. 50 itens habilitados por flash sale, não dá pra editar preço/estoque de item já habilitado (precisa remover+readicionar), checagem de elegibilidade por item via `getItemCriteria` (nem todo produto qualifica), loja não pode estar em "modo férias". |

Rate limit estimado (não oficial — **confirmar na doc atualizada da Shopee antes de implementar**): ~20 req/s.

## Padrões do projeto a reaproveitar (pesquisados em 2026-08-16)

- **OAuth de referência** (adaptar o *padrão*, não o mecanismo): `app/login/page.tsx` (`handleGoogle()` → `supabase.auth.signInWithOAuth`) + `app/auth/callback/route.ts` (troca `code` por sessão via `exchangeCodeForSession`, com sanitização do parâmetro `next` contra open redirect). Para Shopee, o callback é **diferente**: não deve tocar a sessão Supabase (usuário já logado no SaaS, isso é só autorizar um terceiro) — precisa de `state` assinado (contendo `user_id`+nonce+expiração curta) pra saber com segurança qual usuário autorizou, já que não há cookie de sessão confiável no redirect da Shopee.
- **Client HTTP genérico por provedor**: `lib/abacatepay.ts` (funções `request()`/`requestResolved()`, headers padrão, parse de erro) — replicar como `lib/shopee/client.ts`, com a camada extra de assinatura HMAC.
- **Guarda de rota de API autenticada**: `lib/adminApiAuth.ts` → `requireUserSession(req)` (valida Bearer token do header `Authorization` contra Supabase — **não** é cookie-based, o client precisa mandar o token explicitamente) e `getSupabaseServiceRole()` (retorna `null` se `SUPABASE_SERVICE_ROLE_KEY` não configurado — nunca lança erro).
- **Rate limiting**: `lib/rateLimit.ts` — `checkRateLimit(key, limit, windowMs)`, via Upstash Redis, fallback "permite tudo" se Redis não configurado.
- **Padrão de webhook**: `app/api/abacatepay/webhook/route.ts` re-verifica o evento direto na API do provedor em vez de confiar cegamente na assinatura — considerar o mesmo, ou usar a assinatura real da Shopee (`push_partner_key`) se confiável.
- **Cron**: único mecanismo é Vercel Cron (`vercel.json` + rota protegida por `CRON_SECRET`, ex. `app/api/cron/trial-expiry/route.ts`). Necessário pra refresh de token Shopee antes de expirar.
- **Migrations Supabase**: `supabase/migrations/YYYYMMDD_descricao.sql`, RLS sempre ligado. Dois padrões: (a) policy `auth.uid() = user_id` pra tabelas de leitura direta do client (ex. `supabase/migrations/20260323_catalog.sql`), OU (b) RLS ligado **sem nenhuma policy** pra dados sensíveis tipo tokens — só `service_role` acessa via rotas server-side (ex. `supabase/migrations/20260329_affiliates.sql`, tabela `affiliates`). Tokens Shopee devem usar o padrão (b).
- **Env vars**: `NEXT_PUBLIC_*` = exposto ao browser; sem prefixo = só servidor/secret. `SHOPEE_PARTNER_ID`/`SHOPEE_PARTNER_KEY` devem ser secrets server-only, documentados em `.env.example` + `docs/VERCEL_ENV.md`.
- **Engine já existente**: `lib/engines/shopee/engine.ts` (`calcularPrecoShopee`) — reaproveitar pra pré-calcular sugestões, não duplicar a lógica de negócio.

## Fases

### Fase 0 — Credenciais
Obter `partner_id`/`partner_key` de produção (e sandbox, se a Shopee oferecer) junto ao cadastro Partner do usuário. Configurar como env vars server-only (`SHOPEE_PARTNER_ID`, `SHOPEE_PARTNER_KEY`, `SHOPEE_API_BASE`). Código deve falhar de forma limpa e visível na UI quando não configurado (mesmo espírito de `lib/rateLimit.ts` sem Upstash).

### Fase 1 — Conectar loja (OAuth) + listar produtos reais
- `GET /api/integrations/shopee/connect` (`requireUserSession` + `checkRateLimit`): gera `state` assinado + URL de autorização Shopee (HMAC), redireciona.
- `GET /api/integrations/shopee/callback`: recebe `code`+`state`, valida `state`, troca `code` por tokens (Auth API), persiste em `shopee_shop_connections` via `getSupabaseServiceRole()`.
- `GET /api/integrations/shopee/items`: lista itens reais da loja (paginado, ao vivo).
- UI: estado "conectar" vs. "conectado" na aba "Promoções Shopee" existente, ou uma sub-aba nova.

### Fase 2 — Vincular produto interno ↔ item real da Shopee
- Os campos já salvos no `Product` (v0: `shopeePromoPrecoCadastro`, `shopeePromoDescontoPercent`, `shopeePromoCupomPercent`, `shopeePromoCupomMaxRS`, `shopeePromoOfertaRelampagoPercent`) passam a ser a "intenção" que essa fase lê.
- Nova tabela `shopee_product_targets` faz o vínculo `(connection_id, shopee_item_id)` ↔ `linked_product_id` (nullable, `ON DELETE SET NULL`) — não sobrecarrega `products` com IDs de marketplace.

### Fase 3 — Aplicar na Shopee (preço, desconto, cupom) com revisão obrigatória
- Usuário seleciona produtos com alvo definido → **"Revisar e aplicar"** → modal mostra diff (atual → novo) por produto/campo → confirmação explícita ("Aplicar N produtos na Shopee agora") → só então dispara as chamadas reais.
- Rotas: `POST /api/integrations/shopee/apply/price`, `.../apply/discount`, `.../apply/voucher` — cada uma independente (erro parcial é o caso comum, não exceção: resposta sempre `{itemId, ok, error?}[]`, nunca tudo-ou-nada).
- Desconto exige seletor de data/hora (≥1h no futuro) — não existe "aplicar imediatamente" nesse módulo.

### Fase 4 — Refresh automático de token + reconciliação manual
- Lazy (obrigatório): `lib/shopee/tokenStore.ts` → `getValidAccessToken(connectionId)` refresca antes de expirar, a cada chamada.
- Cron de segurança (opcional): `app/api/cron/shopee-token-refresh/route.ts` + `vercel.json`, protegido por `CRON_SECRET`, refresca em lote conexões perto de vencer (reduz risco do `refresh_token` de 30 dias expirar em loja pouco usada).
- Refresh falhou → `status: 'needs_reauth'` → banner "Reconectar loja Shopee".
- Botão manual "Verificar status atual" — **sem** reaplicação automática periódica.

### Fase 5 (ainda mais depois) — Oferta relâmpago via Shop Flash Sale
Só depois das Fases 1-4 validadas com a loja real: `getTimeSlotId` → checagem de elegibilidade (`getItemCriteria`) → `createShopFlashSale` → `addShopFlashSaleItems`, tratando internamente o remover+readicionar necessário pra editar item já habilitado.

## Modelo de dados (Supabase) — quando essa fase for implementada

```sql
CREATE TABLE shopee_shop_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id bigint NOT NULL,
  shop_name text,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  access_token_expires_at timestamptz NOT NULL,
  refresh_token_expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs_reauth','revoked')),
  last_refresh_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_shopee_conn_user_shop ON shopee_shop_connections (user_id, shop_id);
ALTER TABLE shopee_shop_connections ENABLE ROW LEVEL SECURITY;
-- sem policy: contém tokens, só service_role via rotas server-side

CREATE TABLE shopee_product_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES shopee_shop_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shopee_item_id bigint NOT NULL,
  shopee_item_name text,
  linked_product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  target_list_price numeric,
  target_coupon_percent numeric,
  target_coupon_cap_brl numeric,
  target_discount_percent numeric,
  target_discount_start timestamptz,
  target_discount_end timestamptz,
  applied_status text NOT NULL DEFAULT 'draft' CHECK (applied_status IN ('draft','pending','applied','partial','failed')),
  last_applied_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_shopee_targets_item ON shopee_product_targets (connection_id, shopee_item_id);
ALTER TABLE shopee_product_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY shopee_targets_select ON shopee_product_targets FOR SELECT USING (auth.uid() = user_id);
-- insert/update só via service_role (rotas de API)

CREATE TABLE shopee_apply_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES shopee_product_targets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('price','voucher','discount','flash_sale')),
  request_payload jsonb,
  response_payload jsonb,
  ok boolean NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE shopee_apply_log ENABLE ROW LEVEL SECURITY;
-- sem policy: só service_role
```
(campos de flash sale entram só na Fase 5)

## Rotas de API (quando implementado)

Todas sob `app/api/integrations/shopee/`, Node runtime (não Edge — `crypto.createHmac`):

| Rota | Método | Faz |
|---|---|---|
| `connect/route.ts` | GET | Gera `state` assinado + URL de autorização, redireciona |
| `callback/route.ts` | GET | Troca `code` por tokens, valida `state`, persiste conexão |
| `disconnect/route.ts` | POST | Marca `status: revoked` |
| `items/route.ts` | GET | Lista itens da loja (ao vivo, paginado) |
| `targets/route.ts` | GET/POST | Lê/grava rascunhos de alvo |
| `apply/price/route.ts` | POST | Aplica preço de cadastro |
| `apply/discount/route.ts` | POST | Cria desconto normal |
| `apply/voucher/route.ts` | POST | Cria cupom |
| `apply/status/route.ts` | GET | Consulta status real pra reconciliação manual |
| `cron/shopee-token-refresh/route.ts` | GET | Refresh em lote, protegido por `CRON_SECRET` |

## `lib/shopee/` (estrutura sugerida)

```
lib/shopee/
  client.ts       // request() genérico: assina HMAC-SHA256, injeta partner_id/timestamp/sign — espelha lib/abacatepay.ts
  auth.ts         // getAuthUrl(state), exchangeCodeForTokens(code, shopId), refreshAccessToken(refreshToken, shopId)
  tokenStore.ts   // getValidAccessToken(connectionId) — ponto único que toda rota chama
  products.ts     // listItems(), getItemBaseInfo(itemIds), updateItemPrice(itemId, price)
  discounts.ts    // addDiscount(params), addDiscountItem(discountId, items)
  vouchers.ts     // addVoucher(params)
  signature.ts    // buildSignature(...) — isolado, com teste unitário (Vitest) contra vetor de exemplo da doc oficial
  types.ts
```
(`flashSale.ts` entra na Fase 5)

## Riscos remanescentes (validar na hora de implementar)

1. **Rate limit exato** — confirmar na doc oficial atual antes de fixar `checkRateLimit` (hoje só estimativa ~20 req/s).
2. **Agrupamento de Discount**: cada "aplicar" cria uma campanha (`addDiscount`) nova — começar simples, revisar se virar problema de UX (muitas campanhas acumulando no painel Shopee).
3. **Multi-loja por usuário**: modelo já suporta N lojas, mas v1 de UI provavelmente trata só "a loja ativa".
4. **Sandbox da Shopee**: verificar se existe ambiente de teste antes de homologar contra a loja real.

## Verificação (quando implementado)

- `lib/shopee/signature.test.ts` (Vitest) contra vetor de exemplo oficial — erro de assinatura é o erro mais comum e mais silencioso dessa API.
- Testar fluxo OAuth ponta a ponta contra a loja real (ou sandbox) antes de liberar Fase 3.
- Aplicar em 1 produto de teste primeiro, conferir manualmente no painel da Shopee, antes de aplicar em lote.
- `npx tsc --noEmit`, `npx vitest run`, `npm run build` a cada fase.
