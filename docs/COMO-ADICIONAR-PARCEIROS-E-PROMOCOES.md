# Como adicionar parceiros e promoções (passo a passo)

Guia para editar manualmente a lista de **Fornecedores** e de **Promoções** no app.

---

## Parte 1: Adicionar parceiros (Fornecedores)

### 1. Abrir o arquivo
- No Cursor/VS Code, abra a pasta do projeto.
- Vá em **app** → **fornecedores** → **page.tsx**.
- Ou use a busca (**Ctrl+P**) e digite: `fornecedores/page.tsx`.

### 2. Achar o array `parceiros`
- No arquivo, procure por: **`const parceiros`**.
- Você verá uma lista entre colchetes `[ ... ]`, com um ou mais objetos no formato:
  `{ nome: "...", url: "...", descricao: "..." }`.

### 3. Incluir um novo parceiro
- Dentro dos colchetes `[ ]`, **antes do último `},`** (ou depois do último item), adicione uma **vírgula** e um novo objeto no mesmo formato.

**Exemplo:** já existe a Voolt3D e você quer adicionar "Filamentos Brasil":

**Antes:**
```ts
const parceiros = [
  {
    nome: "Voolt3D",
    url: "https://voolt3d.com.br/",
    descricao: "Filamentos e insumos 3D – maior fabricante nacional...",
  },
];
```

**Depois:**
```ts
const parceiros = [
  {
    nome: "Voolt3D",
    url: "https://voolt3d.com.br/",
    descricao: "Filamentos e insumos 3D – maior fabricante nacional...",
  },
  {
    nome: "Filamentos Brasil",
    url: "https://exemplo.com.br",
    descricao: "Filamentos e insumos 3D",
  },
];
```

### 4. Campos de cada parceiro

| Campo       | Obrigatório? | O que colocar |
|------------|---------------|----------------|
| **nome**   | Sim           | Nome que aparece no card (ex.: `"Voolt3D"`). |
| **url**    | Não           | Link do site. Sem `url`, o botão "Acessar" não aparece. |
| **descricao** | Não        | Texto curto abaixo do nome (ex.: `"Filamentos e insumos 3D"`). |

- Textos devem estar entre **aspas** (`"..."`).
- Depois de cada propriedade use **vírgula**, exceto na última do objeto.
- Depois de cada objeto `{ ... }` use **vírgula**, exceto no último antes de `];`.

### 5. Conferir e salvar
- Confira vírgulas e aspas para não quebrar o código.
- Salve o arquivo (**Ctrl+S**).
- Se o app estiver rodando (`npm run dev`), a página **Fornecedores** atualiza ao recarregar; em produção, faça deploy de novo.

---

## Parte 2: Adicionar promoções (ML e Shopee)

### 1. Abrir o arquivo
- Vá em **app** → **promocoes** → **page.tsx**.
- Ou use **Ctrl+P** e digite: `promocoes/page.tsx`.

### 2. Achar o array `promocoes`
- Procure por: **`const promocoes`**.
- Você verá uma lista entre colchetes `[ ... ]`, com objetos no formato:
  `{ titulo: "...", url: "...", descricao: "...", plataforma: "Shopee" ou "ML" }`.

### 3. Incluir uma nova promoção
- Dentro dos colchetes `[ ]`, adicione uma **vírgula** e um novo objeto.

**Exemplo:**
```ts
const promocoes: Promocao[] = [
  {
    titulo: "Filamento PLA 1kg - oferta",
    url: "https://shopee.com.br/seu-link-da-shopee",
    descricao: "Frete grátis",
    plataforma: "Shopee",
  },
  {
    titulo: "Impressora 3D XYZ",
    url: "https://mercadolivre.com.br/seu-link-do-ml",
    descricao: "12x sem juros",
    plataforma: "ML",
  },
];
```

### 4. Campos de cada promoção

| Campo         | Obrigatório? | O que colocar |
|---------------|---------------|----------------|
| **titulo**    | Sim           | Nome da oferta/produto (ex.: `"Filamento PLA 1kg"`). |
| **url**       | Sim           | Link do produto na Shopee ou no Mercado Livre. |
| **descricao** | Não           | Texto curto (ex.: `"Frete grátis"`, `"50% off"`). |
| **plataforma**| Sim           | Use exatamente `"Shopee"` ou `"ML"` (define o badge na tela). |

- Textos entre **aspas** (`"..."`).
- Vírgula após cada propriedade (exceto a última) e após cada objeto (exceto o último).

### 5. Conferir e salvar
- Salve (**Ctrl+S**). Recarregue a página **Promoções** ou faça deploy em produção.

---

## Resumo rápido

| Aba           | Arquivo                    | Array        | Campos principais                          |
|---------------|----------------------------|--------------|--------------------------------------------|
| Fornecedores  | `app/fornecedores/page.tsx`| `parceiros`  | `nome`, `url`, `descricao`                 |
| Promoções     | `app/promocoes/page.tsx`   | `promocoes`  | `titulo`, `url`, `descricao`, `plataforma` |

Quando quiser gerenciar sem mexer no código (por exemplo pelo Supabase ou CMS), dá para evoluir essas páginas para buscar a lista de um banco ou API.
