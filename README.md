# Precifica3D

Precifica3D é uma aplicação SaaS focada em empreendedores de impressão 3D que precisam calcular custos, simular margens e definir preços competitivos para marketplaces como Shopee, Mercado Livre e Amazon.

## Tecnologias

- Next.js (App Router)
- React + TypeScript (strict)
- Tailwind CSS (tema dark)
- Zustand para estado global
- React Hook Form + Zod para formulários
- Recharts para visualização de custos

## Scripts

- `npm run dev` – ambiente de desenvolvimento
- `npm run build` – build de produção
- `npm run start` – servidor de produção

## Variáveis de ambiente

1. Copie `.env.example` para **`.env.local`** (não versionado).
2. Preencha Supabase, Stripe (`sk_test_...` + `price_...`), etc.
3. **Nunca** commite `.env.local` nem cole **secret keys** em issues/chat.

Stripe: se uma chave vazou, **revogue no Dashboard** e gere outra. Ver `docs/STRIPE_SEGURANCA.md`.

### Acesso ao app

**Modo gratuito (padrão):** todo usuário logado usa o app completo; o menu **Assinaturas** some e `/pricing` redireciona para o dashboard.

**Modo pago (trial + assinatura):** no painel **Admin → Site e acesso**, marque **Ativar modo pago** e salve. Alternativa: `APP_PAYWALL_ENABLED=true` na Vercel (o admin no banco tem prioridade quando `paywall_enabled` está definido).

- Cada conta tem **teste grátis** por **`APP_TRIAL_DAYS`** (padrão 7), a partir de `user.created_at`.
- Após o trial, o app **bloqueia** até **assinatura ativa** (Pro ou Business via Stripe ou AbacatePay).
- Rotas liberadas com trial expirado: **`/pricing`** e **`/trial-expired`**.
- Opcional: `user.user_metadata.trial_ends_at` (ISO) **sobrescreve** o fim do teste (extensões via admin/Supabase).
- Com paywall desligado, o cron de e-mail de trial (`/api/cron/trial-expiry`) não envia avisos.

Checklist de deploy na Vercel (variáveis `APP_TRIAL_DAYS`, Stripe, etc.): **`docs/VERCEL_ENV.md`**.

## Estrutura principal

- `app/` – rotas (`/dashboard`, `/calculator`, `/products`, `/simulator`, `/settings`)
- `components/` – componentes de UI e seções das páginas
- `store/` – stores do Zustand (calculadora, produtos, configurações)
- `lib/` – engine de cálculo e utilitários
- `types/` – tipos e schemas Zod

