# Estrutura de domínios – Maph Pro 3D

## Beta (atual) – subdomínios Vercel

Por enquanto em versão beta, use os três projetos na Vercel com estes nomes para ficar com URLs padronizadas:

| Uso | Nome do projeto na Vercel | URL (beta) |
|-----|---------------------------|------------|
| **Landing** | `maphpro3d-landing` | **https://maphpro3d-landing.vercel.app** |
| **App** (SaaS) | `maphpro3d-app` | **https://maphpro3d-app.vercel.app** |
| **Docs** | `maphpro3d-docs` | **https://maphpro3d-docs.vercel.app** |

### Como configurar na Vercel

1. **Landing**
   - A landing fica na pasta **`landing/`** deste mesmo repositório.
   - **New Project** → importe **este repositório** (o mesmo do app).
   - Em **Configure Project**: em **Root Directory** escolha **`landing`**; em **Project Name** use **maphpro3d-landing**.
   - A URL será: `maphpro3d-landing.vercel.app`.

2. **App (este repositório)**
   - Se o projeto já existe com outro nome (ex.: `maph-pro-3d-3u3s`): **Settings** → **General** → **Project Name** → altere para **maphpro3d-app**.
   - A URL passa a ser: `maphpro3d-app.vercel.app`.

3. **Docs**
   - **New Project** → importe o repositório da documentação (ou crie um repo `maphpro3d-docs`).
   - **Project Name**: **maphpro3d-docs**.
   - URL: `maphpro3d-docs.vercel.app`.

O nome do projeto na Vercel vira o subdomínio: `{project-name}.vercel.app`.

---

## Depois do beta – domínios próprios

Quando quiser usar o domínio **maphpro3d.com**:

| Uso | Domínio | Projeto Vercel (beta) |
|-----|---------|------------------------|
| Landing | **maphpro3d.com** | maphpro3d-landing |
| App | **app.maphpro3d.com** | maphpro3d-app |
| Docs | **docs.maphpro3d.com** | maphpro3d-docs |

Em cada projeto: **Settings** → **Domains** → adicionar o domínio acima. No registro DNS do domínio, criar os CNAME/A conforme a Vercel indicar.

---

## Resumo beta

- **Landing:** projeto `maphpro3d-landing` → **maphpro3d-landing.vercel.app**
- **App:** projeto `maphpro3d-app` → **maphpro3d-app.vercel.app** (este repo)
- **Docs:** projeto `maphpro3d-docs` → **maphpro3d-docs.vercel.app**
