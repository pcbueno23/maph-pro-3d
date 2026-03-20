# Stripe — segurança e testes

## Chave secreta vazou?

1. Acesse [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API keys**.
2. Ative **Modo de teste** se for uma `sk_test_...`.
3. Na chave exposta, use **Roll key** ou **Delete** e crie uma nova.
4. Atualize **somente** no `.env.local` (local) ou nas **Environment Variables** do Vercel/host — **nunca** commite a chave no Git.

## Onde configurar

- **Desenvolvimento:** crie `.env.local` na raiz (já está no `.gitignore`) copiando de `.env.example`.
- **Produção:** variáveis no painel do provedor (ex.: Vercel → Settings → Environment Variables).

## Variáveis necessárias

| Variável | Descrição |
|----------|-----------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (teste) ou `sk_live_...` (produção) |
| `STRIPE_PRICE_PRO_MONTHLY` | ID `price_...` do plano Pro (mensal) |
| `STRIPE_PRICE_LIFETIME` | ID `price_...` do plano Business (assinatura configurada no código) |
| `NEXT_PUBLIC_APP_URL` | URL absoluta do site (ex.: `https://seu-app.vercel.app`). Evita falha do Checkout quando o navegador não manda `Origin`. |

Use sempre **Price ID** (`price_...`), não Product ID (`prod_...`).

## Teste de checkout

Cartão de teste: `4242 4242 4242 4242`, validade futura, CVC qualquer.

Após pagamento, retorno em `/pricing?success=1`.
