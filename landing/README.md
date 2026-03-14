# Maph Pro 3D – Landing Page

Landing page do SaaS Maph Pro 3D. Deploy separado na Vercel.

## URLs

- **Beta:** [maphpro3d-landing.vercel.app](https://maphpro3d-landing.vercel.app)
- **App:** [maphpro3d-app.vercel.app](https://maphpro3d-app.vercel.app)

## Logo

O header usa o logo do SaaS. Copie o arquivo do app para a pasta `public` da landing:

```bash
# na raiz do repositório
cp public/logo.png landing/public/logo.png
```

Se não existir `landing/public`, crie a pasta antes. Sem o logo, o header continua com o texto "Maph Pro 3D".

## Desenvolvimento

```bash
cd landing
npm install
npm run dev
```

Abre em [http://localhost:3001](http://localhost:3001).

## Build estático

```bash
npm run build
```

Gera a pasta `out/` com HTML/CSS/JS estáticos.

## Deploy na Vercel

1. **New Project** → importe o **mesmo repositório** do app.
2. Em **Configure Project**:
   - **Root Directory:** clique em "Edit" e selecione **`landing`**.
   - **Project Name:** `maphpro3d-landing`.
3. Deploy. A URL será **maphpro3d-landing.vercel.app**.

### Variável de ambiente (opcional)

- `NEXT_PUBLIC_APP_URL`: URL do app (ex.: `https://maphpro3d-app.vercel.app`).  
  Se não definir, o botão "Abrir o app" usa `https://maphpro3d-app.vercel.app`.
