# Stripe ou AbacatePay — como alternar (salvo no projeto)

O app decide **qual provedor libera o acesso pago** e **o que a página Planos mostra** com a variável de ambiente no **servidor**:

| Valor | Comportamento |
|--------|----------------|
| `stripe` ou **vazio / não definido** | Paywall e painel usam **Stripe**. Na página Planos aparecem checkout **Stripe** + opção **AbacatePay** como alternativa. |
| `abacatepay` | Paywall e painel usam só **AbacatePay** (modo teste/espelho da lógica do Stripe). Na página Planos aparecem **apenas** botões AbacatePay. |

## Onde configurar

Arquivo **`.env.local`** na raiz do projeto (não commitar):

```env
# Padrão: stripe (ou omita a linha)
APP_PAYMENT_PROVIDER=stripe

# Só AbacatePay no paywall + Planos
# APP_PAYMENT_PROVIDER=abacatepay
```

Depois de alterar: **reinicie** o servidor (`npm run dev` ou o processo em produção).

A página Planos consulta **`GET /api/app/payment-provider`**, que lê `APP_PAYMENT_PROVIDER` — **não** é obrigatório usar `NEXT_PUBLIC_*` para isso.

## Variáveis relacionadas

- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, `STRIPE_PRICE_LIFETIME` — ver `.env.example`.
- **AbacatePay:** `ABACATEPAY_TOKEN`, `ABACATEPAY_DEFAULT_CUSTOMER_ID`, etc. — ver **`docs/ABACATEPAY.md`**.

## Documentação extra

- AbacatePay (checkout, produto da loja, acesso pago): **`docs/ABACATEPAY.md`**

---

## Frases para pedir ao assistente (Cursor / IA)

**Ativar Stripe como meio de pagamento principal**

1. *“Configure o projeto para usar **Stripe** como provedor de pagamento: `APP_PAYMENT_PROVIDER=stripe` no `.env.local` e confirme o que mais preciso no env.”*
2. *“Quero o **modo padrão com Stripe** no paywall e na página Planos — ajuste documentação/env se necessário.”*

**Ativar AbacatePay como meio de pagamento principal**

1. *“Configure o projeto para usar só **AbacatePay**: `APP_PAYMENT_PROVIDER=abacatepay` no `.env.local` e revise `docs/ABACATEPAY.md` para o que falta.”*
2. *“Ative o **modo teste só AbacatePay** (mesma lógica de acesso do Stripe) e diga quais variáveis obrigatórias estão faltando.”*
