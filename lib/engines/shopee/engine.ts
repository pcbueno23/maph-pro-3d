export type ShopeeInputs = {
  /** Custo final calculado no módulo de custo 3D (opcional). Se preenchido, substitui `valorCompra` no cálculo. */
  fullCustoUnidade: number;
  valorCompra: number;
  custoEnvio: number;
  isKit: boolean;
  kitQtd: number;
  modo: "margem" | "lucroRS" | "precoTravado" | "markup";
  metaLucroPercent: number;
  precoTravado: number;
  metaLucroRS: number;
  /** % de acréscimo sobre custo (produto + envio) para o modo "markup". */
  markupPercent: number;
  tributacaoPercent: number;
  roasAlvo: number;
  promocaoPercent: number;
  cupomLojaPercent: number;
  /** Teto do cupom em R$ (opcional). Ex.: "5% de desconto, até R$10". 0/vazio = sem teto. */
  cupomMaxRS?: number;
  /** Desconto extra de Oferta Relâmpago (%), composto com promoção e cupom. */
  ofertaRelampagoPercent?: number;
  campanhasDestaque: boolean;
  shopeeAcelera: "none" | "loja-oficial" | "vendedor-indicado" | "demais";
  tipoVendedor: "cpf" | "cnpj";
  altaVolume: boolean;
  estimativaVendas: number;
  referenciaPrecoMercado: number;
};

export type ShopeeResult = {
  precoFinalSugerido: number;
  precoCadastroSugerido: number;
  /** Preço ao cliente com o desconto normal + cupom (fora da janela de oferta relâmpago). */
  precoComDescontoECupom: number;
  /** Preço ao cliente com a oferta relâmpago + cupom; null se oferta relâmpago não estiver definida. */
  precoComOfertaECupom: number | null;
  lucroLiquido: number;
  margemReal: number;
  custoBase: number;
  valorComissao: number;
  pctComissao: number;
  fixoComissao: number;
  custoAds: number;
  valorTributacao: number;
  custoCampanhas: number;
  custoAcelera: number;
  /** Taxa de transação Shopee: 2% sobre (preço − cupom da loja pago pelo vendedor). */
  custoTaxaTransacao: number;
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
    tributacaoTotal: number;
    aceleraTotal: number;
  };
  competitividade: { status: string; statusMsg: string };
  percentualAds: number;
  descTotal: number;
  promocaoPercent: number;
  cupomLojaPercent: number;
  ofertaRelampagoPercent: number;
  cupomMaxRS: number;
  /** true se o teto do cupom (cupomMaxRS) realmente limitou o valor no cenário ativo. */
  cupomLimitadoPeloTeto: boolean;
  /** Margem mínima de referência (reaproveita "Meta de lucro %"); só gera alerta, não afeta o preço fora do modo "margem". */
  margemMinimaPercent: number;
};

/** Regras de comissão Shopee 2026 (portado da calculadora externa). */
export function calcularComissaoShopee(
  precoFinal: number,
  tipoVendedor: ShopeeInputs["tipoVendedor"],
  altaVolume: boolean,
) {
  let percentual = 0;
  let fixo = 0;

  if (precoFinal < 80) {
    percentual = 0.2;
    fixo = 4.0;
  } else if (precoFinal < 100) {
    percentual = 0.14;
    fixo = 16.0;
  } else if (precoFinal < 200) {
    percentual = 0.14;
    fixo = 20.0;
  } else if (precoFinal < 500) {
    percentual = 0.14;
    fixo = 26.0;
  } else {
    percentual = 0.14;
    fixo = 26.0;
  }

  if (tipoVendedor === "cpf" && altaVolume) fixo += 3.0;

  return { percentual, fixo, valorComissao: precoFinal * percentual + fixo };
}

export function getFaixaLabel(preco: number) {
  if (preco < 80) return "Faixa até R$79,99";
  if (preco < 100) return "Faixa R$80 – R$99,99";
  if (preco < 200) return "Faixa R$100 – R$199,99";
  if (preco < 500) return "Faixa R$200 – R$499,99";
  return "Faixa acima de R$500";
}

const SHOPEE_ACELERA_RATES: Record<ShopeeInputs["shopeeAcelera"], number> = {
  none: 0,
  "loja-oficial": 0.01,
  "vendedor-indicado": 0.025,
  demais: 0.035,
};

/** Taxa de transação Shopee descoberta pelo usuário: 2% sobre (preço − cupom da loja pago pelo vendedor). */
const TAXA_TRANSACAO_PERCENT = 2;

/** Valor do cupom da loja (%, com teto opcional em R$) sobre um preço de referência — mesma conta usada em aplicarCupom, só que sem aplicar. */
function valorCupomEm(precoRef: number, cupomPercent: number, cupomMaxRS: number): number {
  if (cupomPercent <= 0 || precoRef <= 0) return 0;
  const semTeto = precoRef * (cupomPercent / 100);
  return cupomMaxRS > 0 ? Math.min(semTeto, cupomMaxRS) : semTeto;
}

function derivar(precoFinal: number, inputs: ShopeeInputs, valorCupomRS: number) {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    roasAlvo,
    tipoVendedor,
    altaVolume,
    campanhasDestaque,
    shopeeAcelera,
  } = inputs;

  const qtd = isKit ? kitQtd || 1 : 1;
  const unitCost =
    typeof fullCustoUnidade === "number" && Number.isFinite(fullCustoUnidade) && fullCustoUnidade > 0
      ? fullCustoUnidade
      : valorCompra;
  const custoBase = unitCost * qtd + custoEnvio;

  const { percentual: pctComissao, fixo: fixoComissao, valorComissao } =
    calcularComissaoShopee(precoFinal, tipoVendedor, altaVolume);

  const custoAds = roasAlvo > 0 ? precoFinal / roasAlvo : 0;
  const valorTributacao = precoFinal * (tributacaoPercent / 100);
  const custoCampanhas = campanhasDestaque ? precoFinal * 0.035 : 0;
  const custoTaxaTransacao = Math.max(0, precoFinal - valorCupomRS) * (TAXA_TRANSACAO_PERCENT / 100);
  const valorAReceber = precoFinal - valorComissao;
  const custoAcelera = valorAReceber * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);

  const totalCustos =
    custoBase +
    valorComissao +
    custoAds +
    valorTributacao +
    custoCampanhas +
    custoAcelera +
    custoTaxaTransacao;
  const lucroLiquido = precoFinal - totalCustos;
  const margemReal = precoFinal > 0 ? (lucroLiquido / precoFinal) * 100 : 0;

  return {
    custoBase,
    pctComissao,
    fixoComissao,
    valorComissao,
    custoAds,
    valorTributacao,
    custoCampanhas,
    custoAcelera,
    custoTaxaTransacao,
    totalCustos,
    lucroLiquido,
    margemReal,
  };
}

function resolverPorMargem(inputs: ShopeeInputs) {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    metaLucroPercent,
    roasAlvo,
    tipoVendedor,
    altaVolume,
    campanhasDestaque,
    shopeeAcelera,
    cupomLojaPercent,
    cupomMaxRS,
  } = inputs;
  const qtd = isKit ? kitQtd || 1 : 1;
  const unitCost =
    typeof fullCustoUnidade === "number" && Number.isFinite(fullCustoUnidade) && fullCustoUnidade > 0
      ? fullCustoUnidade
      : valorCompra;
  const custoBase = unitCost * qtd + custoEnvio;

  let pF = custoBase * 2.8;
  for (let i = 0; i < 150; i++) {
    const { valorComissao } = calcularComissaoShopee(pF, tipoVendedor, altaVolume);
    const ads = roasAlvo > 0 ? pF / roasAlvo : 0;
    const trib = pF * (tributacaoPercent / 100);
    const camp = campanhasDestaque ? pF * 0.035 : 0;
    const cupom = valorCupomEm(pF, cupomLojaPercent || 0, cupomMaxRS || 0);
    const taxaTransacao = Math.max(0, pF - cupom) * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const lucroAlvo = pF * (metaLucroPercent / 100);
    const necessario = custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel + lucroAlvo;
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
}

/**
 * Resolve o preço de cadastro somando um markup (%) acima do custo TOTAL da
 * operação (produto + envio + comissão Shopee + ads/tributação/campanhas/acelera,
 * se ativos) — diferente de "margem", que é % sobre o preço final.
 */
function resolverPorMarkup(inputs: ShopeeInputs) {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    markupPercent,
    roasAlvo,
    tipoVendedor,
    altaVolume,
    campanhasDestaque,
    shopeeAcelera,
    cupomLojaPercent,
    cupomMaxRS,
  } = inputs;
  const qtd = isKit ? kitQtd || 1 : 1;
  const unitCost =
    typeof fullCustoUnidade === "number" && Number.isFinite(fullCustoUnidade) && fullCustoUnidade > 0
      ? fullCustoUnidade
      : valorCompra;
  const custoBase = unitCost * qtd + custoEnvio;

  let pF = custoBase * (1 + (markupPercent || 0) / 100) * 1.4;
  for (let i = 0; i < 150; i++) {
    const { valorComissao } = calcularComissaoShopee(pF, tipoVendedor, altaVolume);
    const ads = roasAlvo > 0 ? pF / roasAlvo : 0;
    const trib = pF * (tributacaoPercent / 100);
    const camp = campanhasDestaque ? pF * 0.035 : 0;
    const cupom = valorCupomEm(pF, cupomLojaPercent || 0, cupomMaxRS || 0);
    const taxaTransacao = Math.max(0, pF - cupom) * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const custoOperacao = custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel;
    const necessario = custoOperacao * (1 + (markupPercent || 0) / 100);
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
}

function resolverPorLucroRS(inputs: ShopeeInputs) {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    metaLucroRS,
    roasAlvo,
    tipoVendedor,
    altaVolume,
    campanhasDestaque,
    shopeeAcelera,
    cupomLojaPercent,
    cupomMaxRS,
  } = inputs;
  const qtd = isKit ? kitQtd || 1 : 1;
  const unitCost =
    typeof fullCustoUnidade === "number" && Number.isFinite(fullCustoUnidade) && fullCustoUnidade > 0
      ? fullCustoUnidade
      : valorCompra;
  const custoBase = unitCost * qtd + custoEnvio;

  let pF = custoBase + (metaLucroRS || 0) + 15;
  for (let i = 0; i < 150; i++) {
    const { valorComissao } = calcularComissaoShopee(pF, tipoVendedor, altaVolume);
    const ads = roasAlvo > 0 ? pF / roasAlvo : 0;
    const trib = pF * (tributacaoPercent / 100);
    const camp = campanhasDestaque ? pF * 0.035 : 0;
    const cupom = valorCupomEm(pF, cupomLojaPercent || 0, cupomMaxRS || 0);
    const taxaTransacao = Math.max(0, pF - cupom) * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const necessario =
      custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel + (metaLucroRS || 0);
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
  const valorCupom = valorCupomEm(preco, cupomPercent, cupomMaxRS);
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

export function calcularPrecoShopee(inputs: ShopeeInputs): ShopeeResult {
  const {
    modo,
    promocaoPercent,
    cupomLojaPercent,
    estimativaVendas,
    referenciaPrecoMercado,
    roasAlvo,
  } = inputs;

  const ofertaRelampagoPercent = inputs.ofertaRelampagoPercent || 0;
  const cupomPercent = cupomLojaPercent || 0;
  const cupomMaxRS = inputs.cupomMaxRS || 0;

  // Desconto "ativo": oferta relâmpago NÃO acumula com a Promoção — ela substitui
  // esse desconto (só faz sentido usá-la se for mais agressiva que o desconto normal).
  // Cupom (%, com teto opcional em R$) sempre acumula por cima do que estiver ativo.
  const descontoAtivoPercent = ofertaRelampagoPercent > 0 ? ofertaRelampagoPercent : (promocaoPercent || 0);
  // Nunca deixa a % de desconto (antes do cupom) chegar a 100% — quebraria a divisão no modo margem.
  const descontoAtivoFracao = Math.min(0.999, descontoAtivoPercent / 100);

  let precoCadastroSugerido: number;
  let precoFinalSugerido: number;
  let cupomLimitadoPeloTeto = false;
  /** Cupom da loja em R$, no cenário de preço ativo — usado na taxa de transação. */
  let valorCupomRS = 0;

  if (modo === "margem") {
    // Comportamento original: o preço final (e a margem) ficam garantidos na meta,
    // o preço de cadastro sobe pra compensar qualquer desconto dado.
    let precoFinalTarget = resolverPorMargem(inputs);
    if (!precoFinalTarget || precoFinalTarget <= 0) precoFinalTarget = 0.01;
    precoFinalSugerido = precoFinalTarget;

    const { precoAntesCupom, limitadoPeloTeto } = resolverPrecoAntesCupom(
      precoFinalTarget,
      cupomPercent,
      cupomMaxRS,
    );
    cupomLimitadoPeloTeto = limitadoPeloTeto;
    valorCupomRS = precoAntesCupom - precoFinalTarget;
    precoCadastroSugerido =
      descontoAtivoFracao > 0
        ? Math.ceil(precoAntesCupom / (1 - descontoAtivoFracao)) - 0.1
        : precoAntesCupom;
  } else {
    // markup / lucroRS / precoTravado: cadastro fixo (independe do desconto), e o
    // desconto reduz de verdade o preço final — lucro/margem exibidos são o resultado
    // real (podem cair ou até ficar negativos). É o comportamento certo pra simular
    // estratégias de ranqueamento (ver o quanto o desconto consome da margem).
    if (modo === "precoTravado") {
      precoCadastroSugerido = inputs.precoTravado;
    } else if (modo === "lucroRS") {
      precoCadastroSugerido = resolverPorLucroRS(inputs);
    } else {
      precoCadastroSugerido = resolverPorMarkup(inputs);
    }
    if (!precoCadastroSugerido || precoCadastroSugerido <= 0) precoCadastroSugerido = 0.01;

    const precoAntesCupom = precoCadastroSugerido * (1 - descontoAtivoFracao);
    const cupomAplicado = aplicarCupom(precoAntesCupom, cupomPercent, cupomMaxRS);
    precoFinalSugerido = cupomAplicado.precoFinal;
    cupomLimitadoPeloTeto = cupomAplicado.limitadoPeloTeto;
    valorCupomRS = cupomAplicado.valorCupom;
  }

  const descTotal =
    precoCadastroSugerido > 0 ? Math.max(0, (1 - precoFinalSugerido / precoCadastroSugerido) * 100) : 0;

  // Os dois cenários de preço que o cliente pode ver: com o desconto normal (fora
  // do período de oferta relâmpago) ou com a oferta relâmpago (durante a campanha) —
  // cupom (com teto) acumula nos dois. Um deles é sempre igual ao precoFinalSugerido (o ativo).
  let precoComDescontoECupom = aplicarCupom(
    precoCadastroSugerido * (1 - (promocaoPercent || 0) / 100),
    cupomPercent,
    cupomMaxRS,
  ).precoFinal;
  let precoComOfertaECupom =
    ofertaRelampagoPercent > 0
      ? aplicarCupom(precoCadastroSugerido * (1 - ofertaRelampagoPercent / 100), cupomPercent, cupomMaxRS)
          .precoFinal
      : null;

  // No modo margem, o desconto/cupom "ativo agora" é o que já foi usado pra
  // travar o preço final na meta — usa o mesmo número aqui em vez de recalcular
  // pra frente a partir do preço de cadastro (já arredondado), senão os dois
  // arredondamentos independentes divergem em centavos e o Detalhamento de
  // Custos passa a não bater com o preço mostrado como "ativo agora".
  if (modo === "margem") {
    if (ofertaRelampagoPercent > 0) {
      precoComOfertaECupom = precoFinalSugerido;
    } else {
      precoComDescontoECupom = precoFinalSugerido;
    }
  }

  const custos = derivar(precoFinalSugerido, inputs, valorCupomRS);
  const {
    custoBase,
    pctComissao,
    fixoComissao,
    valorComissao,
    custoAds,
    valorTributacao,
    custoCampanhas,
    custoAcelera,
    custoTaxaTransacao,
    lucroLiquido,
    margemReal,
  } = custos;

  const denominador =
    precoFinalSugerido -
    valorComissao -
    valorTributacao -
    custoBase -
    custoCampanhas -
    custoAcelera -
    custoTaxaTransacao;
  const roasMinimo = denominador > 0 ? precoFinalSugerido / denominador : 999;

  const distribuicao = [
    { label: "Custo de compra", valor: custoBase, cor: "#6366f1" },
    { label: "Comissão Shopee", valor: valorComissao, cor: "#ee4d2d" },
    { label: "Taxa de transação", valor: custoTaxaTransacao, cor: "#eab308" },
    { label: "Tributação", valor: valorTributacao, cor: "#f97316" },
    { label: "Anúncios (Ads)", valor: custoAds, cor: "#3b82f6" },
    { label: "Camp. Destaque", valor: custoCampanhas, cor: "#ec4899" },
    { label: "Shopee Acelera", valor: custoAcelera, cor: "#8b5cf6" },
    {
      label: "Lucro líquido",
      valor: lucroLiquido > 0 ? lucroLiquido : 0,
      cor: "#10b981",
    },
  ].filter((d) => d.valor > 0.001);

  const projecaoMensal =
    estimativaVendas > 0
      ? {
          faturamento: precoFinalSugerido * estimativaVendas,
          lucroTotal: lucroLiquido * estimativaVendas,
          gastoAds: custoAds * estimativaVendas,
          comissaoTotal: valorComissao * estimativaVendas,
          tributacaoTotal: valorTributacao * estimativaVendas,
          aceleraTotal: (custoCampanhas + custoAcelera) * estimativaVendas,
        }
      : null;

  let competitividade = { status: "neutro", statusMsg: "" };
  if (referenciaPrecoMercado > 0) {
    const diff =
      ((precoFinalSugerido - referenciaPrecoMercado) / referenciaPrecoMercado) *
      100;
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

  const margemContribuicao = precoFinalSugerido - custoBase - valorComissao;
  const margemContribuicaoPct =
    precoFinalSugerido > 0
      ? (margemContribuicao / precoFinalSugerido) * 100
      : 0;

  return {
    precoFinalSugerido,
    precoCadastroSugerido,
    precoComDescontoECupom,
    precoComOfertaECupom,
    lucroLiquido,
    margemReal,
    custoBase,
    valorComissao,
    pctComissao,
    fixoComissao,
    custoAds,
    valorTributacao,
    custoCampanhas,
    custoAcelera,
    custoTaxaTransacao,
    roasMinimo,
    roasAlvo,
    margemContribuicao,
    margemContribuicaoPct,
    faixaLabel: getFaixaLabel(precoFinalSugerido),
    distribuicao,
    projecaoMensal,
    competitividade,
    percentualAds: roasAlvo > 0 ? 100 / roasAlvo : 0,
    descTotal,
    promocaoPercent: promocaoPercent || 0,
    cupomLojaPercent: cupomPercent,
    ofertaRelampagoPercent,
    cupomMaxRS,
    cupomLimitadoPeloTeto,
    margemMinimaPercent: inputs.metaLucroPercent || 0,
  };
}

export function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);
}

export function formatPct(v: number) {
  return `${(v || 0).toFixed(1)}%`;
}

