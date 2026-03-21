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
- **Fluxo:** Na página **Planos**, o usuário escolhe Pro ou Lifetime e clica em **"Pagar com PIX ou Cartão (AbacatePay)"**. O backend chama a API da AbacatePay para criar uma cobrança e redireciona o cliente para a URL de pagamento.
- **Cliente na cobrança:** (1) Com **email**, **name**, **cellphone** e **taxId** válidos, o body da cobrança envia o objeto **`customer`** (a AbacatePay cria/vincula o cliente no checkout). (2) Sem esses dados, use **`ABACATEPAY_DEFAULT_CUSTOMER_ID`** no `.env.local` com um `cust_...` existente (painel ou `GET /v1/customer/list`). (3) Sem os dois → **400** com instruções. CPF fictício continua inválido (`Invalid taxId`).
- **Metadata para acesso:** cada checkout envia `metadata.app_user_email` com o e-mail do usuário logado (quando disponível), para o backend cruzar com **`GET /v1/billing/list`** e liberar o app no modo só AbacatePay.

### Modo teste: só AbacatePay (mesma lógica do Stripe no paywall)

Para **não usar Stripe** na checagem de assinatura e espelhar a ideia “tem plano pago?”:

1. **Servidor** — no `.env.local`:
   - `APP_PAYMENT_PROVIDER=abacatepay`
   - `ABACATEPAY_TOKEN` (com **`BILLING:READ`** para listar cobranças)
   - Opcional: `ABACATEPAY_ACCESS_PRO_PRODUCT_IDS` e `ABACATEPAY_ACCESS_BUSINESS_PRODUCT_IDS` (lista separada por vírgula de `prod_...`); se vazio, o plano é inferido por `externalId` `precifica3d-pro-*` / `precifica3d-lifetime-*` ou pelos mesmos env `ABACATEPAY_STORE_PRODUCT_ID_*`.

2. **Planos (UI)** — a página chama **`GET /api/app/payment-provider`**, que lê `APP_PAYMENT_PROVIDER` no servidor. **Não é obrigatório** `NEXT_PUBLIC_APP_PAYMENT_PROVIDER`; basta reiniciar o `npm run dev` após mudar o `.env.local`.

3. **Comportamento:**
   - `/api/account/access` usa **`getAbacatePayPaidEntitlement`**: cobranças com **`status: PAID`** e e-mail igual a `metadata.app_user_email` **ou** e-mail no cliente AbacatePay.
   - Planos: **POST `/api/abacatepay/status`** — mesmo formato que o Stripe para o painel.
   - UI **Planos**: só botões AbacatePay; trial do app (`APP_TRIAL_DAYS`) continua igual.

4. **Produção com os dois gateways:** use `APP_PAYMENT_PROVIDER=stripe` (padrão) e mantenha AbacatePay como segunda opção de checkout na UI.

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

---

## Produção

Para sair do Dev Mode e ir para produção: [Produção](https://docs.abacatepay.com/pages/production).
