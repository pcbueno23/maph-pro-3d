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

### Trial e acesso ao app (sem cartão)

- Cada conta tem **teste grátis** por **`APP_TRIAL_DAYS`** (padrão 7), contado a partir da **data de criação do usuário no Supabase** (`user.created_at`).
- Durante o teste **não é obrigatório** cartão. Depois do prazo, o app **bloqueia** o uso até existir **assinatura Stripe ativa** (Pro ou Business).
- Rotas liberadas com trial expirado: **`/pricing`** e **`/trial-expired`**.
- **`APP_PAYWALL_DISABLED=true`**: desliga o bloqueio (útil só para migração ou debug).
- Opcional: `user.user_metadata.trial_ends_at` (ISO) **sobrescreve** o fim do teste (para extensões manuais via Supabase).
- **Contas infinitas** com e-mails diferentes ainda geram trials separados; para reduzir abuso, use **confirmação de e-mail** no Supabase e políticas de uso aceitável.

Checklist de deploy na Vercel (variáveis `APP_TRIAL_DAYS`, Stripe, etc.): **`docs/VERCEL_ENV.md`**.

## Estrutura principal

- `app/` – rotas (`/dashboard`, `/calculator`, `/products`, `/simulator`, `/settings`)
- `components/` – componentes de UI e seções das páginas
- `store/` – stores do Zustand (calculadora, produtos, configurações)
- `lib/` – engine de cálculo e utilitários
- `types/` – tipos e schemas Zod

