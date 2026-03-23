import { z } from "zod";

export type MarketingFornecedor = {
  nome: string;
  url?: string;
  descricao?: string;
};

export type MarketingPromocao = {
  titulo: string;
  url: string;
  descricao?: string;
  plataforma: "Shopee" | "ML";
};

/** Conteúdo exibido em /fornecedores e /promocoes quando o banco está vazio ou indisponível. */
export const DEFAULT_FORNECEDORES: MarketingFornecedor[] = [
  {
    nome: "Multfila",
    url: "https://multfila.com.br/",
    descricao:
      "Loja online — filamentos PLA, PETG, ABS, TPU, resinas e acessórios.",
  },
  {
    nome: "3D Fila",
    url: "https://3dfila.com.br/",
    descricao:
      "Filamentos, resinas, impressoras e ecossistema para impressão 3D no Brasil.",
  },
  {
    nome: "Fusionx",
    url: "https://fusionx3d.com.br/",
    descricao: "Filamentos PLA, PETG, ABS, engenharia, marcas e impressoras 3D.",
  },
  {
    nome: "Loja 3D",
    url: "https://loja3d.com.br/",
    descricao:
      "Impressoras, filamentos, resinas, scanners e acessórios — loja especializada.",
  },
  {
    nome: "National 3D",
    url: "https://www.lojanational3d.com.br/",
    descricao: "Loja de fábrica — PLA Max High Speed, ABS, PETG, TPU e mais.",
  },
  {
    nome: "GTMax3D",
    url: "https://www.gtmax3d.com.br/",
    descricao:
      "Impressoras (incl. Bambu Lab), filamentos ABS/PLA/PETG e linha própria.",
  },
  {
    nome: "Voolt3D",
    url: "https://voolt3d.com.br/",
    descricao:
      "Filamentos e insumos 3D — fabricante nacional, PLA, PETG, ABS, resinas e impressoras.",
  },
];

const optionalHttpUrl = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (typeof val === "string" && val.trim() === "") return undefined;
  return typeof val === "string" ? val.trim() : val;
}, z.string().url().optional());

export const marketingFornecedorSchema = z.object({
  nome: z.string().trim().min(1, "Nome obrigatório"),
  url: optionalHttpUrl,
  descricao: z.string().optional(),
});

export const marketingPromocaoSchema = z.object({
  titulo: z.string().trim().min(1, "Título obrigatório"),
  url: z.string().trim().url("URL inválida"),
  descricao: z.string().optional(),
  plataforma: z.enum(["Shopee", "ML"]),
});

export const marketingPayloadSchema = z.object({
  fornecedores: z.array(marketingFornecedorSchema),
  promocoes: z.array(marketingPromocaoSchema),
});

export type MarketingPayload = z.infer<typeof marketingPayloadSchema>;

export function normalizeMarketingPayload(
  raw: unknown,
): { ok: true; data: MarketingPayload } | { ok: false; error: string } {
  const parsed = marketingPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { ok: false, error: msg || "Dados inválidos." };
  }
  return { ok: true, data: parsed.data };
}

export function resolveFornecedores(
  fromDb: unknown,
): MarketingFornecedor[] {
  const arr = Array.isArray(fromDb) ? fromDb : [];
  if (arr.length === 0) return DEFAULT_FORNECEDORES;
  const out: MarketingFornecedor[] = [];
  for (const item of arr) {
    const r = marketingFornecedorSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out.length > 0 ? out : DEFAULT_FORNECEDORES;
}

export function resolvePromocoes(fromDb: unknown): MarketingPromocao[] {
  const arr = Array.isArray(fromDb) ? fromDb : [];
  const out: MarketingPromocao[] = [];
  for (const item of arr) {
    const r = marketingPromocaoSchema.safeParse(item);
    if (r.success) out.push(r.data);
  }
  return out;
}
