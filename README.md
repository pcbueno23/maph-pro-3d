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

## Estrutura principal

- `app/` – rotas (`/dashboard`, `/calculator`, `/products`, `/simulator`, `/settings`)
- `components/` – componentes de UI e seções das páginas
- `store/` – stores do Zustand (calculadora, produtos, configurações)
- `lib/` – engine de cálculo e utilitários
- `types/` – tipos e schemas Zod

