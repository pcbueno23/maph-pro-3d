/**
 * Taxas reais do TikTok Shop Brasil (vigentes desde 15/07/2026), pesquisadas em:
 * - Tarifa de Comissão da Plataforma (oficial): seller-br.tiktok.com/university/essay?knowledge_id=24428156307201
 * - Programa de Taxas de Envio (SFP): advkoyama.com.br/blog/tiktok-shop-programa-taxas-de-envio-cobranca-dupla
 * - Frete: tspbrasil.com/blog/frete-no-tiktok-shop-como-funciona-o-envio-no-brasil
 * - Comissão de afiliados: blog.arcosscale.com.br/como-funciona-programa-afiliados-tiktok-shop-criadores
 *
 * Comissão: <R$50 → 10% + R$4 fixo · ≥R$50 → 6% + R$6 fixo (sobre preço após desconto do vendedor).
 * SFP (frete): 6% do preço por item entregue, teto R$50/item — separado da comissão.
 * Afiliado: definido pelo vendedor por SKU, opcional.
 * Ads/GMV Max: sem fórmula fixa confiável (CPA muito variável) — modelado como ROAS alvo opcional,
 * mesmo tratamento já usado nos engines de Shopee/ML.
 */

export type TikTokInputs = {
  /** Custo final calculado no módulo de custo 3D (opcional). Se preenchido, substitui `valorCompra`. */
  fullCustoUnidade: number;
  valorCompra: number;
  custoEnvio: number;
  isKit: boolean;
  kitQtd: number;
  modo: "margem" | "lucroRS" | "precoTravado";
  metaLucroPercent: number;
  precoTravado: number;
  metaLucroRS: number;
  tributacaoPercent: number;
  /** Participa do Programa de Frete Grátis (SFP): 6% do preço por item, teto R$50. */
  participaSFP: boolean;
  /** Comissão paga a afiliados/criadores (%), 0 se não usa. */
  comissaoAfiliadoPercent: number;
  /** ROAS alvo pra Ads/GMV Max; 0 = sem investimento em ads. */
  roasAlvo: number;
  /** Missão de novo vendedor ativa: comissão 0% (até R$17.000 em vendas). */
  novoVendedorIsento: boolean;
  estimativaVendas: number;
  referenciaPrecoMercado: number;
};

export type TikTokResult = {
  precoFinalSugerido: number;
  lucroLiquido: number;
  margemReal: number;
  custoBase: number;
  valorComissao: number;
  pctComissao: number;
  fixoComissao: number;
  valorSFP: number;
  valorAfiliado: number;
  custoAds: number;
  valorTributacao: number;
  roasMinimo: number;
  roasAlvo: number;
  margemContribuicao: number;
  margemContribuicaoPct: number;
  faixaLabel: string;
  distribuicao: Array<{ label: string; valor: number; cor: string }>;
  projecaoMensal: null | {
    faturamento: number;
    lucroTotal: number;
    gastoAds: number;
    comissaoTotal: number;
    sfpTotal: number;
    afiliadoTotal: number;
    tributacaoTotal: number;
  };
  competitividade: { status: string; statusMsg: string };
  percentualAds: number;
};

export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}

export function formatPct(v: number) {
  return `${(v || 0).toFixed(1)}%`;
}

/** Comissão da plataforma: <R$50 → 10%+R$4 · ≥R$50 → 6%+R$6. Isenta se `novoVendedorIsento`. */
export function calcularComissaoTikTok(precoFinal: number, novoVendedorIsento: boolean) {
  if (novoVendedorIsento) return { percentual: 0, fixo: 0, valorComissao: 0 };
  if (precoFinal < 50) {
    return { percentual: 0.1, fixo: 4.0, valorComissao: precoFinal * 0.1 + 4.0 };
  }
  return { percentual: 0.06, fixo: 6.0, valorComissao: precoFinal * 0.06 + 6.0 };
}

export function getFaixaLabel(preco: number) {
  return preco < 50
    ? "Faixa abaixo de R$50 (comissão 10% + R$4 fixo)"
    : "Faixa a partir de R$50 (comissão 6% + R$6 fixo)";
}

/** Taxa do Programa de Frete Grátis (SFP): 6% do preço por item, teto R$50. */
function calcularSFP(precoFinal: number, participaSFP: boolean) {
  if (!participaSFP) return 0;
  return Math.min(precoFinal * 0.06, 50);
}

function custoBaseDe(inputs: TikTokInputs) {
  const { fullCustoUnidade, valorCompra, custoEnvio, isKit, kitQtd } = inputs;
  const qtd = isKit ? kitQtd || 1 : 1;
  const unitCost =
    typeof fullCustoUnidade === "number" && Number.isFinite(fullCustoUnidade) && fullCustoUnidade > 0
      ? fullCustoUnidade
      : valorCompra;
  return unitCost * qtd + custoEnvio;
}

function derivar(precoFinal: number, inputs: TikTokInputs) {
  const { tributacaoPercent, roasAlvo, comissaoAfiliadoPercent, participaSFP, novoVendedorIsento } = inputs;
  const custoBase = custoBaseDe(inputs);

  const { percentual: pctComissao, fixo: fixoComissao, valorComissao } = calcularComissaoTikTok(
    precoFinal,
    novoVendedorIsento,
  );
  const valorSFP = calcularSFP(precoFinal, participaSFP);
  const valorAfiliado = precoFinal * ((comissaoAfiliadoPercent || 0) / 100);
  const custoAds = roasAlvo > 0 ? precoFinal / roasAlvo : 0;
  const valorTributacao = precoFinal * ((tributacaoPercent || 0) / 100);

  const totalCustos = custoBase + valorComissao + valorSFP + valorAfiliado + custoAds + valorTributacao;
  const lucroLiquido = precoFinal - totalCustos;
  const margemReal = precoFinal > 0 ? (lucroLiquido / precoFinal) * 100 : 0;

  return {
    custoBase,
    pctComissao,
    fixoComissao,
    valorComissao,
    valorSFP,
    valorAfiliado,
    custoAds,
    valorTributacao,
    totalCustos,
    lucroLiquido,
    margemReal,
  };
}

function resolverPorMargem(inputs: TikTokInputs) {
  const custoBase = custoBaseDe(inputs);
  const { metaLucroPercent } = inputs;

  let pF = custoBase * 2.5;
  for (let i = 0; i < 150; i++) {
    const d = derivar(pF, inputs);
    const lucroAlvo = pF * ((metaLucroPercent || 0) / 100);
    const necessario = d.custoBase + d.valorComissao + d.valorSFP + d.valorAfiliado + d.custoAds + d.valorTributacao + lucroAlvo;
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
}

function resolverPorLucroRS(inputs: TikTokInputs) {
  const custoBase = custoBaseDe(inputs);
  const { metaLucroRS } = inputs;

  let pF = custoBase + (metaLucroRS || 0) + 15;
  for (let i = 0; i < 150; i++) {
    const d = derivar(pF, inputs);
    const necessario =
      d.custoBase + d.valorComissao + d.valorSFP + d.valorAfiliado + d.custoAds + d.valorTributacao + (metaLucroRS || 0);
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
}

export function calcularPrecoTikTok(inputs: TikTokInputs): TikTokResult {
  const { modo, roasAlvo, estimativaVendas, referenciaPrecoMercado } = inputs;

  let precoFinalSugerido: number;
  if (modo === "precoTravado") {
    precoFinalSugerido = inputs.precoTravado;
  } else if (modo === "lucroRS") {
    precoFinalSugerido = resolverPorLucroRS(inputs);
  } else {
    precoFinalSugerido = resolverPorMargem(inputs);
  }
  if (!precoFinalSugerido || precoFinalSugerido <= 0) precoFinalSugerido = 0.01;

  const d = derivar(precoFinalSugerido, inputs);
  const {
    custoBase,
    pctComissao,
    fixoComissao,
    valorComissao,
    valorSFP,
    valorAfiliado,
    custoAds,
    valorTributacao,
    lucroLiquido,
    margemReal,
  } = d;

  const custosSemAds = custoBase + valorComissao + valorSFP + valorAfiliado + valorTributacao;
  const denomRoas = precoFinalSugerido - custosSemAds;
  const roasMinimo = denomRoas > 0 ? precoFinalSugerido / denomRoas : 999;

  const margemContribuicao = precoFinalSugerido - custoBase - valorComissao - valorSFP;
  const margemContribuicaoPct =
    precoFinalSugerido > 0 ? (margemContribuicao / precoFinalSugerido) * 100 : 0;

  const distribuicao = [
    { label: "Custo do produto", valor: custoBase, cor: "#6366f1" },
    { label: "Comissão TikTok Shop", valor: valorComissao, cor: "#010101" },
    { label: "Frete (Programa Frete Grátis)", valor: valorSFP, cor: "#25f4ee" },
    { label: "Afiliado/criador", valor: valorAfiliado, cor: "#fe2c55" },
    { label: "Anúncios (Ads/GMV Max)", valor: custoAds, cor: "#3b82f6" },
    { label: "Tributação", valor: valorTributacao, cor: "#f97316" },
    { label: "Lucro líquido", valor: lucroLiquido > 0 ? lucroLiquido : 0, cor: "#10b981" },
  ].filter((it) => it.valor > 0.001);

  const projecaoMensal =
    estimativaVendas > 0
      ? {
          faturamento: precoFinalSugerido * estimativaVendas,
          lucroTotal: lucroLiquido * estimativaVendas,
          gastoAds: custoAds * estimativaVendas,
          comissaoTotal: valorComissao * estimativaVendas,
          sfpTotal: valorSFP * estimativaVendas,
          afiliadoTotal: valorAfiliado * estimativaVendas,
          tributacaoTotal: valorTributacao * estimativaVendas,
        }
      : null;

  let competitividade = { status: "neutro", statusMsg: "" };
  if (referenciaPrecoMercado > 0) {
    const diff = ((precoFinalSugerido - referenciaPrecoMercado) / referenciaPrecoMercado) * 100;
    if (diff <= -10)
      competitividade = {
        status: "otimo",
        statusMsg: `${Math.abs(diff).toFixed(0)}% abaixo do mercado — vantagem competitiva`,
      };
    else if (diff <= 5)
      competitividade = {
        status: "bom",
        statusMsg: `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}% vs. mercado — preço competitivo`,
      };
    else if (diff <= 20)
      competitividade = {
        status: "atencao",
        statusMsg: `+${diff.toFixed(0)}% acima do mercado — monitore`,
      };
    else
      competitividade = {
        status: "ruim",
        statusMsg: `+${diff.toFixed(0)}% acima do mercado — revise os custos`,
      };
  }

  return {
    precoFinalSugerido,
    lucroLiquido,
    margemReal,
    custoBase,
    valorComissao,
    pctComissao,
    fixoComissao,
    valorSFP,
    valorAfiliado,
    custoAds,
    valorTributacao,
    roasMinimo,
    roasAlvo,
    margemContribuicao,
    margemContribuicaoPct,
    faixaLabel: getFaixaLabel(precoFinalSugerido),
    distribuicao,
    projecaoMensal,
    competitividade,
    percentualAds: roasAlvo > 0 ? 100 / roasAlvo : 0,
  };
}
