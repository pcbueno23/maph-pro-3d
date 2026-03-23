# AbacatePay – Guia de Integração (Precifica3D)

> **Alternar Stripe ↔ AbacatePay no projeto:** veja **`docs/PAGAMENTO_STRIPE_OU_ABACATEPAY.md`** (`APP_PAYMENT_PROVIDER`).

## Visão geral

A AbacatePay é um gateway de pagamento que permite criar e gerenciar cobranças.  
Aceita **PIX** e **Cartão**. Todas as requisições usam **Bearer Token** no cabeçalho:

```http
Authorization: Bearer {SEU_TOKEN_AQUI}
```

- **Documentação:** [Authentication](https://docs.abacatepay.com/pages/authentication)
- **Modo dev:** [Dev Mode](https://docs.abacatepay.com/pages/devmode) – operações simuladas.

---

## Uso no Precifica3D

- **Variáveis de ambiente:** `ABACATEPAY_TOKEN`. **`ABACATEPAY_DEFAULT_CUSTOMER_ID`** (`cust_...`) — obrigatório para o fluxo normal no app quando o usuário não envia CPF/celular. Opcional: **`ABACATEPAY_STORE_PRODUCT_ID_PRO`** / **`_LIFETIME`** (`prod_...`) — ativa checkout **v2** (preço do painel); exige chave **API v2** + **`CHECKOUT:CREATE`**. Se a chave for só **v1**, defina **`ABACATEPAY_USE_V1_BILLING_ONLY=true`** para ignorar `prod_` sem apagar a linha, e mantenha **`ABACATEPAY_DEFAULT_CUSTOMER_ID`**. O app também tenta **fallback** v1 após *"API key version mismatch"* se houver `cust_` ou dados completos no body.
- **Fluxo (produção):** Na página **Planos** (modo AbacatePay), o usuário preenche **nome completo, CPF ou CNPJ e celular (DDD)** — dados reais do pagador. O app envia isso no JSON para **`POST /api/abacatepay/billing`** e o backend monta o objeto **`customer`** na AbacatePay (PIX/cartão). O e-mail usado é o da conta logada.
- **Nome e descrição no checkout (billing v1):** O servidor envia **`name`** e **`description`** em cada item (textos **MAPH PRO 3D** no código).
- **Logotipo / imagem do produto:** A documentação OpenAPI da **`/v1/billing/create`** **não lista** campo de imagem no item — muitas vezes o checkout mostra só placeholder. O app envia mesmo assim **`imageUrl`** + **`image_url`** com **`{sua origem https}/logo.png`** (arquivo **`public/logo.png`** no projeto) ou URLs em **`ABACATEPAY_CHECKOUT_PRODUCT_IMAGE_URL`**. Confirme em produção que `https://SEU_DOMÍNIO/logo.png` abre no navegador. Se continuar sem imagem, configure o **logo da loja** no painel **AbacatePay** (conta/loja) ou use **checkout v2** com produtos `prod_...` que tenham imagem cadastrada na loja.
- **Fallback opcional:** **`ABACATEPAY_DEFAULT_CUSTOMER_ID`** (`cust_...`) só é necessário se você **não** coletar CPF/celular no app (ex.: testes automatizados). Em uso real, prefira sempre o formulário de pagador na UI.
- **Sem dados completos e sem `cust_` no env:** a API responde **400** com instruções. CPF fictício continua inválido (`Invalid taxId`).
- **Metadata para acesso:** cada checkout envia `metadata.app_user_email` com o e-mail do usuário logado (quando disponível), para o backend cruzar com **`GET /v1/billing/list`** e liberar o app no modo só AbacatePay.

### Modo teste: só AbacatePay (mesma lógica do Stripe no paywall)

Para **não usar Stripe** na checagem de assinatura e espelhar a ideia “tem plano pago?”:

1. **Servidor** — no `.env.local`:
   - `APP_PAYMENT_PROVIDER=abacatepay`
   - Opcional mas recomendado na **interface** Planos: `NEXT_PUBLIC_APP_PAYMENT_PROVIDER=abacatepay` (mesmo valor; o Next embute no bundle do cliente — **reinicie** `npm run dev` ou faça **novo deploy** após alterar).
   - `ABACATEPAY_TOKEN` (com **`BILLING:READ`** para listar cobranças)
   - Opcional: `ABACATEPAY_ACCESS_PRO_PRODUCT_IDS` e `ABACATEPAY_ACCESS_BUSINESS_PRODUCT_IDS` (lista separada por vírgula de `prod_...`); se vazio, o plano é inferido por `externalId` `precifica3d-pro-*` / `precifica3d-lifetime-*` ou pelos mesmos env `ABACATEPAY_STORE_PRODUCT_ID_*`.

2. **Planos (UI)** — a rota **`/pricing`** é um Server Component com `dynamic = force-dynamic`: o servidor lê **`APP_PAYMENT_PROVIDER`** em cada request e repassa ao cliente. Na **Vercel** basta definir essa variável no painel (Production e Preview, se usar) — **não depende** de `NEXT_PUBLIC_APP_PAYMENT_PROVIDER` para mostrar AbacatePay. `GET /api/app/payment-provider` continua disponível para outros usos.

3. **Comportamento:**
   - `/api/account/access` usa **`getAbacatePayPaidEntitlement`**: cobranças com **`status: PAID`** e e-mail igual a `metadata.app_user_email` **ou** e-mail no cliente AbacatePay.
   - Planos: **POST `/api/abacatepay/status`** — mesmo formato que o Stripe para o painel.
   - UI **Planos**: só botões AbacatePay; trial do app (`APP_TRIAL_DAYS`) continua igual.

4. **Produção só AbacatePay:** `APP_PAYMENT_PROVIDER=abacatepay` + token de **produção** (não `abc_dev_...`). Confirme **`BILLING:READ`** na chave. Defina `NEXT_PUBLIC_APP_URL` com a URL pública do deploy (ajuda `returnUrl` / `completionUrl` quando o header `Origin` não vem). Variáveis **Stripe** podem ficar vazias se você não usar checkout Stripe.

5. **Produção com os dois gateways (Stripe + AbacatePay na mesma UI):** use `APP_PAYMENT_PROVIDER=stripe` (padrão). A página Planos mostra Stripe e pode oferecer AbacatePay conforme o layout atual.

---

## Vercel (produção)

1. **Project → Settings → Environment Variables** — adicione para **Production** (e **Preview** se testar PR/preview: se `APP_PAYMENT_PROVIDER` estiver só em Production, o preview continuará em modo Stripe até você repetir as variáveis para Preview ou “All Environments”):

   | Nome | Exemplo / notas |
   |------|------------------|
   | `APP_PAYMENT_PROVIDER` | `abacatepay` |
   | `ABACATEPAY_TOKEN` | token **live** com `BILLING:READ` (e `CHECKOUT:CREATE` se usar produtos `prod_...`) |
   | `ABACATEPAY_DEFAULT_CUSTOMER_ID` | **Opcional** se os usuários preenchem pagador na página Planos. Use `cust_...` live só como fallback (testes / integrações sem formulário). |
   | `NEXT_PUBLIC_APP_URL` | `https://seu-dominio.vercel.app` ou domínio customizado |
   | Demais `ABACATEPAY_*` | conforme `.env.example` se usar checkout v2 / mapeamento de planos |

2. **Redeploy** depois de salvar as variáveis (**Deployments → … → Redeploy**). Só alterar env não atualiza o build antigo.

3. **Confirme** abrindo `https://SEU_SITE/api/app/payment-provider` — deve retornar `{"provider":"abacatepay"}`.

4. `NEXT_PUBLIC_APP_PAYMENT_PROVIDER` é **opcional** na Vercel; a página `/pricing` já recebe o provedor do servidor.

---

## Checklist rápido (`.env.local`)

| Variável | Obrigatório? | Notas |
|----------|----------------|-------|
| `APP_PAYMENT_PROVIDER=abacatepay` | Sim (modo só AbacatePay) | Reinicie `npm run dev` ou o processo em produção após alterar. |
| `ABACATEPAY_TOKEN` | Sim | Precisa de **`BILLING:READ`** para `/api/account/access` e status. Checkout v2 com produto da loja exige chave **v2** + **`CHECKOUT:CREATE`**. |
| `ABACATEPAY_DEFAULT_CUSTOMER_ID` | Opcional | Só se não usar o formulário de pagador na página Planos. Com nome+CPF/CNPJ+celular no checkout, pode omitir. |
| `ABACATEPAY_STORE_PRODUCT_ID_PRO` / `_LIFETIME` | Opcional | Checkout v2 com preço do painel AbacatePay. |
| `ABACATEPAY_USE_V1_BILLING_ONLY` | Opcional | `true` se a chave for só v1 — ignora `prod_...` sem apagar as linhas. |
| `ABACATEPAY_ACCESS_PRO_PRODUCT_IDS` / `BUSINESS` | Opcional | Mapeia plano ao listar cobranças para acesso pago. |

**Verificar:** abra `/pricing` logado — os botões devem ir para **AbacatePay** (PIX/cartão), não para Stripe. O painel chama **`GET /api/app/payment-provider`** e depois **`POST /api/abacatepay/status`**.

---

## Problemas comuns

- **“Customer not found”** — o `cust_...` em **ABACATEPAY_DEFAULT_CUSTOMER_ID** não existe para **esta** chave API (conta ou modo dev/live diferente). Confira no painel **Clientes** ou `GET /v1/customer/list` com o mesmo token; não reaproveite `cust_` de outra loja ou de dev com token live. Com **prod_** no checkout v2, o mesmo `cust_` válido na conta continua obrigatório quando o app não envia CPF/celular no body.
- **400 na cobrança (“defina ABACATEPAY_DEFAULT_CUSTOMER_ID…”)** — cadastre um cliente no painel (ou API), copie o `cust_...` para o `.env.local`, ou colete **nome, e-mail, celular e CPF/CNPJ válidos** no fluxo (sem CPF fictício).
- **Checkout mostra preço/nome diferente do produto da loja** — o app não está usando checkout v2 com seus `prod_...`. Confira `ABACATEPAY_STORE_PRODUCT_ID_PRO` e `_LIFETIME` no `.env`/Vercel (valores `prod_...` da mesma conta do token) e chave **API v2** com **`CHECKOUT:CREATE`**. Se a chave for só v1, o servidor **não** faz mais fallback silencioso para v1 quando os `prod_` estão definidos (evita cobrar valor errado): ou corrija a chave, ou remova os `prod_` e use `ABACATEPAY_USE_V1_BILLING_ONLY=true` para billing v1 só com preço do código.
- **“API key version mismatch” / checkout v2** — use chave v2 com `CHECKOUT:CREATE`, ou remova os `prod_` e use `ABACATEPAY_USE_V1_BILLING_ONLY=true` + dados do pagador (ou `cust_`).
- **Ainda aparece “Assinar … (Stripe)” na página Planos** — (1) Reinicie o servidor de dev ou redeploy; (2) confira `APP_PAYMENT_PROVIDER=abacatepay` no ambiente que **roda o Node** (Vercel → Environment Variables); (3) adicione `NEXT_PUBLIC_APP_PAYMENT_PROVIDER=abacatepay` e reinicie/rebuild; (4) no navegador, abra `/api/app/payment-provider` — deve retornar `{"provider":"abacatepay"}`.
- **Pagou mas o app ainda mostra sem plano** — o e-mail logado deve bater com `metadata.app_user_email` da cobrança ou com o cliente na AbacatePay; aguarde alguns segundos e **F5**. Confira permissão **`BILLING:READ`**.
- **Trial** — `APP_TRIAL_DAYS` continua valendo; o paywall soma **trial OU** cobrança **PAID** (AbacatePay) quando o provider é `abacatepay`.

---

## Endpoints utilizados

### Criar cobrança

- **POST** `https://api.abacatepay.com/v1/billing/create`
- **Body:**  
  `frequency` (`ONE_TIME` | `MULTIPLE_PAYMENTS`),  
  `methods` (`["PIX","CARD"]`),  
  `products` (array com `externalId`, `name`, `description`, `quantity`, `price` em **centavos**),  
  `returnUrl`, `completionUrl`,  
  opcionalmente `customer` ou `customerId`.
- **Resposta:** `data.url` para redirecionar o cliente.
- **Doc:** [Criar Cobrança](https://docs.abacatepay.com/pages/payment/create)

- **GET** `https://api.abacatepay.com/v1/billing/list` — lista cobranças (modo só AbacatePay / acesso pago). Permissão **`BILLING:READ`**.

### Outros (disponíveis para expansão)

- **Clientes:** `POST /v1/customer/create`, `GET /v1/customer/list`
- **Cupons:** `POST /v1/coupon/create`, `GET /v1/coupon/list`
- **PIX QRCode:** `POST /v1/pixQrCode/create`, `GET /v1/pixQrCode/check`
- **Saques:** `POST /v1/withdraw/create`, `GET /v1/withdraw/get`, `GET /v1/withdraw/list`
- **Loja:** `GET /v1/store/get`

---

## Webhooks

Eventos: `billing.paid`, `pix.paid`, `pix.expired`, `withdraw.paid`.  
Sempre validar assinatura e implementar retries.

O fluxo atual do Precifica3D **não depende de webhook** para liberar o app: o backend consulta **`GET /v1/billing/list`** com o token (`getAbacatePayPaidEntitlement`). Webhooks são recomendáveis para automações, conciliação e reduzir latência.

---

## Produção (AbacatePay)

- Documentação oficial: [Produção](https://docs.abacatepay.com/pages/production) (sair do Dev Mode, chaves live, etc.).
- Garanta `NEXT_PUBLIC_APP_URL` na Vercel/host com `https://` do domínio público.
- Não commite `.env.local`; use apenas variáveis no painel do host.
