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

## Estrutura principal

- `app/` – rotas (`/dashboard`, `/calculator`, `/products`, `/simulator`, `/settings`)
- `components/` – componentes de UI e seções das páginas
- `store/` – stores do Zustand (calculadora, produtos, configurações)
- `lib/` – engine de cálculo e utilitários
- `types/` – tipos e schemas Zod

