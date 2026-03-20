# Variáveis na Vercel (produção / preview)

Siga: **Vercel → seu projeto → Settings → Environment Variables**.

## 1. Marque os ambientes

- **Production**: domínio principal.
- **Preview**: URLs `*.vercel.app` (recomendado repetir as mesmas chaves de **teste** Stripe em Preview, se for só testar).

## 2. Lista para colar

| Nome | Valor | Observação |
|------|--------|------------|
| `NEXT_PUBLIC_APP_URL` | `https://seu-dominio.vercel.app` | URL **exata** do app (sem barra no final). |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Igual ao projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Chave **anon** (pública). |
| `APP_TRIAL_DAYS` | `7` | Dias de teste **sem cartão** (contados a partir da criação da conta no Supabase). |
| `STRIPE_SECRET_KEY` | `sk_live_...` ou `sk_test_...` | **Secret** (não use `pk_...`). Mesmo modo (test/live) dos preços. |
| `STRIPE_PRICE_PRO_MONTHLY` | `price_...` | Preço mensal Pro. |
| `STRIPE_PRICE_LIFETIME` | `price_...` | Preço Business anual. |

## 3. O que **não** colocar em produção

- **`APP_PAYWALL_DISABLED`**: deixe **ausente** ou **não** defina como `true`, senão todo mundo acessa sem limite de trial.
- Use `APP_PAYWALL_DISABLED=true` só localmente ou em Preview por pouco tempo para migração.

## 4. Depois de salvar

1. **Deployments** → nos três pontinhos do último deploy → **Redeploy** (para as variáveis entrarem no runtime).
2. Teste com **conta nova** (e-mail que nunca usou o app): deve aparecer o selo de trial no header e, após `APP_TRIAL_DAYS`, cair em `/trial-expired` até assinar.

## 5. Usuários antigos (antes do paywall)

Contas criadas há mais de `APP_TRIAL_DAYS` podem ficar **bloqueadas na hora**. Opções:

- Temporário: `APP_PAYWALL_DISABLED=true` na Vercel + redeploy, depois remover.
- Ou no Supabase: em **Authentication → Users**, editar **User Metadata** e definir `trial_ends_at` (ISO, ex. `2026-04-01T00:00:00.000Z`) para quem você quiser estender.
