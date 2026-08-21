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
  /** % de margem de contribuição dos 3 preços-alvo de referência (mín. costuma ser 0, fixo). */
  alvo1Percent: number;
  alvo2Percent: number;
  alvo3Percent: number;
  /** Desconto normal de vitrine (%). No modo margem só sobe o preço de cadastro; nos demais reduz o preço real. */
  promocaoPercent: number;
  /** Cupom de loja (%, com teto opcional em R$), acumula por cima do desconto/oferta ativos. */
  cupomLojaPercent: number;
  /** Teto do cupom em R$ (opcional). Ex.: "5% de desconto, até R$10". 0/vazio = sem teto. */
  cupomMaxRS?: number;
  /** Desconto extra de oferta relâmpago (%); substitui a Promoção (não acumula com ela). */
  ofertaRelampagoPercent?: number;
};

export type TikTokResult = {
  precoFinalSugerido: number;
  /** Preço a digitar no cadastro do TikTok Shop (antes de desconto/oferta/cupom). */
  precoCadastroSugerido: number;
  /** Preço ao cliente com o desconto normal + cupom (fora da janela de oferta relâmpago). */
  precoComDescontoECupom: number;
  /** Preço ao cliente com a oferta relâmpago + cupom; null se oferta relâmpago não estiver definida. */
  precoComOfertaECupom: number | null;
  /** % de desconto total (cadastro → preço ativo). */
  descTotal: number;
  promocaoPercent: number;
  cupomLojaPercent: number;
  ofertaRelampagoPercent: number;
  cupomMaxRS: number;
  /** true se o teto do cupom (cupomMaxRS) realmente limitou o valor no cenário ativo. */
  cupomLimitadoPeloTeto: boolean;
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
  /** Os 3 preços de referência da estratégia: mínimo (breakeven), alvos de margem e o comercial (o que o cliente paga). */
  precosReferencia: TikTokPrecosReferencia;
};

export type TikTokPrecosReferencia = {
  /** Abaixo dele a margem de contribuição vira zero/negativa — não vender. */
  minimo: number;
  alvo1: { percent: number; preco: number };
  alvo2: { percent: number; preco: number };
  alvo3: { percent: number; preco: number };
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

export function getFaixaLabel(preco: number, novoVendedorIsento = false) {
  if (novoVendedorIsento) return "Comissão isenta (missão novo vendedor ativa, até R$17k em vendas)";
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

/** Resolve o preço final que entrega exatamente `metaLucroPercentAlvo` de margem, com os demais custos do inputs. */
function resolverPrecoPorMargemAlvo(inputs: TikTokInputs, metaLucroPercentAlvo: number) {
  const custoBase = custoBaseDe(inputs);

  let pF = custoBase * 2.5;
  for (let i = 0; i < 150; i++) {
    const d = derivar(pF, inputs);
    const lucroAlvo = pF * ((metaLucroPercentAlvo || 0) / 100);
    const necessario = d.custoBase + d.valorComissao + d.valorSFP + d.valorAfiliado + d.custoAds + d.valorTributacao + lucroAlvo;
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.max(0.01, Math.ceil(pF) - 0.1);
}

function resolverPorMargem(inputs: TikTokInputs) {
  return resolverPrecoPorMargemAlvo(inputs, inputs.metaLucroPercent);
}

/**
 * Os 3 preços de referência da estratégia (mesma lógica pra qualquer SKU):
 * mínimo = breakeven (margem de contribuição 0%, abaixo disso não vender);
 * alvos = 10%/15%/20% de margem de contribuição, com o resto dos custos (comissão,
 * SFP, afiliado, ads, tributação) do `inputs` mantidos fixos.
 */
export function calcularPrecosReferenciaTikTok(inputs: TikTokInputs): TikTokPrecosReferencia {
  const p1 = inputs.alvo1Percent ?? 10;
  const p2 = inputs.alvo2Percent ?? 15;
  const p3 = inputs.alvo3Percent ?? 20;
  return {
    minimo: resolverPrecoPorMargemAlvo(inputs, 0),
    alvo1: { percent: p1, preco: resolverPrecoPorMargemAlvo(inputs, p1) },
    alvo2: { percent: p2, preco: resolverPrecoPorMargemAlvo(inputs, p2) },
    alvo3: { percent: p3, preco: resolverPrecoPorMargemAlvo(inputs, p3) },
  };
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

/** Aplica o cupom (%, com teto opcional em R$) a um preço, "pra frente". */
function aplicarCupom(preco: number, cupomPercent: number, cupomMaxRS: number) {
  if (cupomPercent <= 0) return { precoFinal: preco, valorCupom: 0, limitadoPeloTeto: false };
  const semTeto = preco * (cupomPercent / 100);
  const limitadoPeloTeto = cupomMaxRS > 0 && semTeto > cupomMaxRS;
  const valorCupom = limitadoPeloTeto ? cupomMaxRS : semTeto;
  return { precoFinal: Math.max(0.01, preco - valorCupom), valorCupom, limitadoPeloTeto };
}

/** Inverte o cupom (%, com teto opcional em R$): dado o preço final desejado, qual preço era necessário antes do cupom. */
function resolverPrecoAntesCupom(precoFinalDesejado: number, cupomPercent: number, cupomMaxRS: number) {
  if (cupomPercent <= 0) return { precoAntesCupom: precoFinalDesejado, limitadoPeloTeto: false };
  const semTeto = precoFinalDesejado / (1 - cupomPercent / 100);
  const naoLimitadoBate = cupomMaxRS <= 0 || semTeto * (cupomPercent / 100) <= cupomMaxRS;
  if (naoLimitadoBate) return { precoAntesCupom: semTeto, limitadoPeloTeto: false };
  return { precoAntesCupom: precoFinalDesejado + cupomMaxRS, limitadoPeloTeto: true };
}

export function calcularPrecoTikTok(inputs: TikTokInputs): TikTokResult {
  const { modo, roasAlvo, estimativaVendas, referenciaPrecoMercado, promocaoPercent, cupomLojaPercent } = inputs;

  const ofertaRelampagoPercent = inputs.ofertaRelampagoPercent || 0;
  const cupomPercent = cupomLojaPercent || 0;
  const cupomMaxRS = inputs.cupomMaxRS || 0;

  // Desconto "ativo": oferta relâmpago NÃO acumula com a Promoção — ela substitui
  // esse desconto. Cupom (%, com teto opcional em R$) sempre acumula por cima do que
  // estiver ativo. Base das taxas do TikTok = preço após esse desconto do vendedor.
  const descontoAtivoPercent = ofertaRelampagoPercent > 0 ? ofertaRelampagoPercent : (promocaoPercent || 0);
  const descontoAtivoFracao = Math.min(0.999, descontoAtivoPercent / 100);

  let precoCadastroSugerido: number;
  let precoFinalSugerido: number;
  let cupomLimitadoPeloTeto = false;

  if (modo === "margem") {
    // O preço final (e a margem) ficam garantidos na meta; o preço de cadastro sobe
    // pra compensar qualquer desconto/cupom dado — igual ao modo margem da Shopee.
    let precoFinalTarget = resolverPorMargem(inputs);
    if (!precoFinalTarget || precoFinalTarget <= 0) precoFinalTarget = 0.01;
    precoFinalSugerido = precoFinalTarget;

    const { precoAntesCupom, limitadoPeloTeto } = resolverPrecoAntesCupom(
      precoFinalTarget,
      cupomPercent,
      cupomMaxRS,
    );
    cupomLimitadoPeloTeto = limitadoPeloTeto;
    precoCadastroSugerido =
      descontoAtivoFracao > 0
        ? Math.ceil(precoAntesCupom / (1 - descontoAtivoFracao)) - 0.1
        : precoAntesCupom;
  } else {
    // lucroRS / precoTravado: cadastro fixo (independe do desconto), e o desconto
    // reduz de verdade o preço final — lucro/margem exibidos são o resultado real.
    if (modo === "precoTravado") {
      precoCadastroSugerido = inputs.precoTravado;
    } else {
      precoCadastroSugerido = resolverPorLucroRS(inputs);
    }
    if (!precoCadastroSugerido || precoCadastroSugerido <= 0) precoCadastroSugerido = 0.01;

    const precoAntesCupom = precoCadastroSugerido * (1 - descontoAtivoFracao);
    const cupomAplicado = aplicarCupom(precoAntesCupom, cupomPercent, cupomMaxRS);
    precoFinalSugerido = cupomAplicado.precoFinal;
    cupomLimitadoPeloTeto = cupomAplicado.limitadoPeloTeto;
  }

  const descTotal =
    precoCadastroSugerido > 0 ? Math.max(0, (1 - precoFinalSugerido / precoCadastroSugerido) * 100) : 0;

  // Os dois cenários que o cliente pode ver: com o desconto normal (fora da oferta
  // relâmpago) ou com a oferta relâmpago — cupom (com teto) acumula nos dois. Um dos
  // dois é sempre igual ao precoFinalSugerido (o cenário ativo).
  const precoComDescontoECupom = aplicarCupom(
    precoCadastroSugerido * (1 - (promocaoPercent || 0) / 100),
    cupomPercent,
    cupomMaxRS,
  ).precoFinal;
  const precoComOfertaECupom =
    ofertaRelampagoPercent > 0
      ? aplicarCupom(precoCadastroSugerido * (1 - ofertaRelampagoPercent / 100), cupomPercent, cupomMaxRS)
          .precoFinal
      : null;

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
    precoCadastroSugerido,
    precoComDescontoECupom,
    precoComOfertaECupom,
    descTotal,
    promocaoPercent: promocaoPercent || 0,
    cupomLojaPercent: cupomPercent,
    ofertaRelampagoPercent,
    cupomMaxRS,
    cupomLimitadoPeloTeto,
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
    faixaLabel: getFaixaLabel(precoFinalSugerido, inputs.novoVendedorIsento),
    distribuicao,
    projecaoMensal,
    competitividade,
    percentualAds: roasAlvo > 0 ? 100 / roasAlvo : 0,
    precosReferencia: calcularPrecosReferenciaTikTok(inputs),
  };
}
