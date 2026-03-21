# Stripe em modo produção (pagamentos reais)

O app usa **Stripe Checkout** e o **Customer Portal** com variáveis de ambiente. Em **teste** você usa `sk_test_...` e preços `price_...` criados com o modo **Teste** ligado no Dashboard. Para **cobrar de verdade**:

## 1. Ative o modo Live no Stripe

1. Acesse [Dashboard Stripe](https://dashboard.stripe.com).
2. No canto superior, desative **“Modo de teste”** (ou use o atalho para alternar para **dados reais**).
3. Tudo o que criar agora (produtos, preços, chaves) será de **produção**.

## 2. Chave secreta Live

1. **Developers → API keys**.
2. Copie a **Secret key** que começa com `sk_live_...` (nunca commite nem compartilhe).
3. Na **Vercel** (ou servidor): **Settings → Environment Variables** do projeto **Production**:
   - `STRIPE_SECRET_KEY` = `sk_live_...`

Mantenha `sk_test_...` só em **Preview / Development** se quiser testar sem cobrar.

## 3. Preços (price IDs) no modo Live

Os IDs de **teste** (`price_...` criados em modo teste) **não** funcionam com `sk_live_...` e vice-versa.

1. **Products →** crie ou duplique os produtos (Pro mensal, Business anual) **com o modo Live ativo**.
2. Em cada produto, use **Preços** recorrentes ou únicos conforme seu modelo.
3. Copie o ID que começa com `price_...` (não use `prod_...` no código deste app).

Variáveis no ambiente de **produção**:

| Variável | Exemplo |
|----------|---------|
| `STRIPE_PRICE_PRO_MONTHLY` | `price_xxxxxxxx` (assinatura mensal Pro) |
| `STRIPE_PRICE_LIFETIME` | `price_yyyyyyyy` (plano anual Business, conforme modelagem no Stripe) |

Confira em `app/api/stripe/checkout/route.ts` como cada `plan` mapeia para esses preços.

## 4. Portal do cliente (cancelar / atualizar cartão)

1. **Settings → Billing → Customer portal**.
2. Ative e configure o que o cliente pode fazer (cancelar, trocar plano, etc.).
3. O app já chama `/api/stripe/portal` com o e-mail do usuário.

## 5. URL do app (checkout)

- Defina `NEXT_PUBLIC_APP_URL=https://seu-dominio.com` na Vercel (Production) para o Stripe redirecionar corretamente após o pagamento.

## 6. Webhooks (opcional)

O fluxo atual consulta assinaturas via API (`/api/stripe/status`). Para automações extras (e-mails, logs), você pode configurar webhooks no Stripe apontando para uma rota sua; não é obrigatório para o paywall básico funcionar.

## 7. Checklist rápido

- [ ] Modo **Live** no Stripe  
- [ ] `STRIPE_SECRET_KEY` = `sk_live_...` em produção  
- [ ] `STRIPE_PRICE_*` = IDs `price_...` criados em **Live**  
- [ ] `NEXT_PUBLIC_APP_URL` = URL pública do app  
- [ ] `APP_PAYMENT_PROVIDER=stripe` (padrão) — ver `.env.example`  
- [ ] Testar um pagamento pequeno com cartão real e conferir se o app libera o acesso  

## AbacatePay

Integração opcional (PIX/cartão BR). A UI da aba **Planos** foi simplificada para **só Stripe**; a API AbacatePay pode permanecer no projeto para uso futuro. Para paywall só AbacatePay, veja `docs/PAGAMENTO_STRIPE_OU_ABACATEPAY.md`.
