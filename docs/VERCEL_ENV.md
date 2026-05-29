# Variáveis na Vercel (produção / preview)

Siga: **Vercel → seu projeto → Settings → Environment Variables**.

## 1. Marque os ambientes

- **Production**: domínio principal.
- **Preview**: URLs `*.vercel.app` (recomendado repetir as mesmas chaves de **teste** Stripe em Preview, se for só testar).

## 2. Modo gratuito (padrão — nada extra obrigatório)

O app já sai **gratuito** se você **não** definir `APP_PAYWALL_ENABLED=true`.

| Nome | Valor | Observação |
|------|--------|------------|
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio.vercel.app` | URL **exata** do app (sem barra no final). |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Igual ao projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Chave **anon** (pública). |

Opcional: `APP_PAYWALL_DISABLED=true` (redundante com o padrão). Menu **Assinaturas** oculto; `/pricing` redireciona para `/`.

Stripe e AbacatePay **podem ficar configurados** — não cobram até ligar o paywall.

## 3. Modo pago (trial + assinatura)

Quando quiser cobrar: adicione `APP_PAYWALL_ENABLED=true` e redeploy.

| Nome | Valor | Observação |
|------|--------|------------|
| `APP_TRIAL_DAYS` | `7` | Dias de teste **sem cartão** (contados a partir da criação da conta no Supabase). |
| `STRIPE_SECRET_KEY` | `sk_live_...` ou `sk_test_...` | **Secret** (não use `pk_...`). Mesmo modo (test/live) dos preços. |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_...` | Preço mensal Pro. |
| `STRIPE_PRICE_LIFETIME` | `price_...` | Preço Business anual. |
| `APP_PAYMENT_PROVIDER` | `stripe` ou `abacatepay` | Ver `docs/PAGAMENTO_STRIPE_OU_ABACATEPAY.md`. |

## 4. Depois de salvar

1. **Deployments** → nos três pontinhos do último deploy → **Redeploy** (para as variáveis entrarem no runtime).
2. **Modo grátis:** badge “Acesso completo gratuito” no header; `/pricing` sem checkout (“Em breve”).
3. **Modo pago:** selo de trial no header; após `APP_TRIAL_DAYS`, redirect para `/trial-expired` até assinar.

## 5. Usuários antigos (ao ligar o paywall de novo)

Contas criadas há mais de `APP_TRIAL_DAYS` podem ficar **bloqueadas na hora**. Opções:

- Temporário: `APP_PAYWALL_DISABLED=true` na Vercel + redeploy.
- Ou no Supabase: em **Authentication → Users**, editar **User Metadata** e definir `trial_ends_at` (ISO, ex. `2026-04-01T00:00:00.000Z`) para quem você quiser estender.
