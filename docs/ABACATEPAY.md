# AbacatePay – Guia de Integração (Precifica3D)

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

- **Variável de ambiente:** `ABACATEPAY_TOKEN` (token JWT no `.env.local`).
- **Fluxo:** Na página **Planos**, o usuário escolhe Pro ou Lifetime e clica em **"Pagar com PIX ou Cartão (AbacatePay)"**. O backend chama a API da AbacatePay para criar uma cobrança e redireciona o cliente para a URL de pagamento.

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
