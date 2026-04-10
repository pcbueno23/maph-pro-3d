export type ShopeeInputs = {
  /** Custo final calculado no módulo de custo 3D (opcional). Se preenchido, substitui `valorCompra` no cálculo. */
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
  roasAlvo: number;
  promocaoPercent: number;
  cupomLojaPercent: number;
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

function derivar(precoFinal: number, inputs: ShopeeInputs) {
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
  const valorAReceber = precoFinal - valorComissao;
  const custoAcelera = valorAReceber * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);

  const totalCustos =
    custoBase +
    valorComissao +
    custoAds +
    valorTributacao +
    custoCampanhas +
    custoAcelera;
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
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const lucroAlvo = pF * (metaLucroPercent / 100);
    const necessario = custoBase + valorComissao + ads + trib + camp + acel + lucroAlvo;
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
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const necessario =
      custoBase + valorComissao + ads + trib + camp + acel + (metaLucroRS || 0);
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
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

  let precoFinalSugerido: number;
  if (modo === "precoTravado") {
    precoFinalSugerido = inputs.precoTravado;
  } else if (modo === "lucroRS") {
    precoFinalSugerido = resolverPorLucroRS(inputs);
  } else {
    precoFinalSugerido = resolverPorMargem(inputs);
  }
  if (!precoFinalSugerido || precoFinalSugerido <= 0) precoFinalSugerido = 0.01;

  const custos = derivar(precoFinalSugerido, inputs);
  const {
    custoBase,
    pctComissao,
    fixoComissao,
    valorComissao,
    custoAds,
    valorTributacao,
    custoCampanhas,
    custoAcelera,
    lucroLiquido,
    margemReal,
  } = custos;

  const descTotal =
    1 -
    (1 - (promocaoPercent || 0) / 100) *
      (1 - (cupomLojaPercent || 0) / 100);
  const precoCadastroSugerido =
    descTotal > 0
      ? Math.ceil(precoFinalSugerido / (1 - descTotal)) - 0.1
      : precoFinalSugerido;

  const denominador =
    precoFinalSugerido -
    valorComissao -
    valorTributacao -
    custoBase -
    custoCampanhas -
    custoAcelera;
  const roasMinimo = denominador > 0 ? precoFinalSugerido / denominador : 999;

  const distribuicao = [
    { label: "Custo de compra", valor: custoBase, cor: "#6366f1" },
    { label: "Comissão Shopee", valor: valorComissao, cor: "#ee4d2d" },
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
    cupomLojaPercent: cupomLojaPercent || 0,
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

