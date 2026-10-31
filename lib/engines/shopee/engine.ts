/** Uma faixa de "Meus Cupons de Vendedor" da Shopee: pedido mínimo pra desbloquear +
 * desconto (%) + teto em R$. Ex.: "5% OFF, até R$2, pedido mínimo R$39,90". */
export type ShopeeCupomTier = {
  min: number;
  percent: number;
  maxRS: number;
  label?: string;
};

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
  /** Comissão de afiliado como % da venda (afiliado externo que indicou o pedido). 0 = não vende por afiliado. */
  afiliadoPercent: number;
  /** Reserva para devolução/reembolso como % da venda. 0 = não reservar. */
  devolucaoPercent: number;
  promocaoPercent: number;
  /** Usado quando `cupomTiers` está vazio/ausente — cupom único, sem faixa de preço. */
  cupomLojaPercent: number;
  /** Teto do cupom em R$ (opcional). Ex.: "5% de desconto, até R$10". 0/vazio = sem teto. */
  cupomMaxRS?: number;
  /** Cupons por faixa de preço (igual "Meus Cupons de Vendedor" da Shopee: cada faixa tem
   * seu próprio % + teto, e o cupom aplicado é o da maior faixa cujo mínimo o preço atinge).
   * Quando preenchido, SUBSTITUI cupomLojaPercent/cupomMaxRS inteiramente. */
  cupomTiers?: ShopeeCupomTier[];
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
  custoAfiliado: number;
  custoDevolucao: number;
  /** true quando a meta de margem é matematicamente inviável com os custos atuais
   * (comissão+transação+imposto+afiliado%+ads%+devolução%+margem alvo >= 100% do preço) —
   * só detectado no modo "margem" (o único com meta de % fechada). */
  inviavel: boolean;
  inviavelMotivo: string | null;
  /** ROAS de equilíbrio: abaixo disso a venda dá prejuízo (999 = sem dado suficiente). */
  roasMinimo: number;
  /** ROAS que você precisa bater na campanha pra, depois do custo do próprio anúncio, ainda
   * fechar com a margem alvo (Meta de lucro %). Null quando a margem já não fecha nem sem ads. */
  roasAlvoParaMargem: number | null;
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
  /** Rótulo da faixa de cupom que se aplicou de verdade no cenário ativo (quando
   * cupomTiers é usado) — ex.: "R$2 OFF acima de R$39,90". Null fora do modo por faixa. */
  cupomTierAtivoLabel: string | null;
  /** true se o teto do cupom (cupomMaxRS) realmente limitou o valor no cenário ativo. */
  cupomLimitadoPeloTeto: boolean;
  /** Margem mínima de referência (reaproveita "Meta de lucro %"); só gera alerta, não afeta o preço fora do modo "margem". */
  margemMinimaPercent: number;
};

/** Regras de comissão Shopee 2026 (portado da calculadora externa).
 * Taxa fixa por item vendido (faixa < R$80): R$4,50 a partir de 01/10/2026
 * (era R$4,00 — mudança confirmada pelo usuário). */
export function calcularComissaoShopee(
  precoFinal: number,
  tipoVendedor: ShopeeInputs["tipoVendedor"],
  altaVolume: boolean,
) {
  let percentual = 0;
  let fixo = 0;

  if (precoFinal < 80) {
    percentual = 0.2;
    fixo = 4.5;
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

/** LOOKUP: maior faixa (tiers ordenados por `min` crescente) cujo mínimo o preço atinge.
 * Mesmo critério da aba Parametros da planilha de Preço e Margem — o "pedido mínimo"
 * compara com o preço ANTES do cupom reduzir (é o valor que o cliente está prestes a
 * pagar quando o cupom aparece disponível pra ele usar). */
function tierParaPreco(preco: number, tiersOrdenados: ShopeeCupomTier[]): ShopeeCupomTier | null {
  let best: ShopeeCupomTier | null = null;
  for (const t of tiersOrdenados) {
    if (t.min <= preco) best = t;
    else break;
  }
  return best;
}

type CupomResolvido = { percent: number; maxRS: number; label: string | null };

/** Resolve qual cupom usar (faixa por preço OU cupom único) pra um preço de referência. */
function cupomResolverPara(
  preco: number,
  inputs: Pick<ShopeeInputs, "cupomLojaPercent" | "cupomMaxRS" | "cupomTiers">,
): CupomResolvido {
  const tiers = inputs.cupomTiers;
  if (tiers && tiers.length > 0) {
    const ordenados = [...tiers].sort((a, b) => a.min - b.min);
    const tier = tierParaPreco(preco, ordenados);
    if (!tier) return { percent: 0, maxRS: 0, label: null };
    return { percent: tier.percent, maxRS: tier.maxRS, label: tier.label ?? null };
  }
  return { percent: inputs.cupomLojaPercent || 0, maxRS: inputs.cupomMaxRS || 0, label: null };
}

/** Versão de valorCupomEm que já escolhe a faixa certa (ou o cupom único) pro preço dado. */
function cupomValorPara(
  preco: number,
  inputs: Pick<ShopeeInputs, "cupomLojaPercent" | "cupomMaxRS" | "cupomTiers">,
): number {
  const { percent, maxRS } = cupomResolverPara(preco, inputs);
  return valorCupomEm(preco, percent, maxRS);
}

/** Aplica (faixa por preço ou cupom único) a um preço, "pra frente". */
function aplicarCupomGeral(
  preco: number,
  inputs: Pick<ShopeeInputs, "cupomLojaPercent" | "cupomMaxRS" | "cupomTiers">,
) {
  const { percent, maxRS, label } = cupomResolverPara(preco, inputs);
  if (percent <= 0) return { precoFinal: preco, valorCupom: 0, limitadoPeloTeto: false, label: null as string | null };
  const semTeto = preco * (percent / 100);
  const limitadoPeloTeto = maxRS > 0 && semTeto > maxRS;
  const valorCupom = maxRS > 0 ? Math.min(semTeto, maxRS) : semTeto;
  return { precoFinal: Math.max(0.01, preco - valorCupom), valorCupom, limitadoPeloTeto, label };
}

/** Inverte o cupom (faixa por preço ou único): dado o preço final desejado, qual preço
 * era necessário antes do cupom. Faz uma 1ª passada usando o preço final como referência
 * pra achar a faixa provável, depois confirma a faixa com o preço antes-do-cupom
 * resultante (mesmo "double lookup" já usado na planilha de Preço e Margem — faixas
 * ficam longe o bastante uma da outra pra isso convergir sempre em 1-2 passadas). */
function resolverPrecoAntesCupomGeral(
  precoFinalDesejado: number,
  inputs: Pick<ShopeeInputs, "cupomLojaPercent" | "cupomMaxRS" | "cupomTiers">,
) {
  const primeiraPassada = cupomResolverPara(precoFinalDesejado, inputs);
  if (primeiraPassada.percent <= 0) {
    return { precoAntesCupom: precoFinalDesejado, limitadoPeloTeto: false, label: null as string | null };
  }
  const estimativaAntes = precoFinalDesejado / (1 - primeiraPassada.percent / 100);
  const { percent, maxRS, label } = cupomResolverPara(estimativaAntes, inputs);
  if (percent <= 0) return { precoAntesCupom: precoFinalDesejado, limitadoPeloTeto: false, label: null as string | null };

  const semTeto = precoFinalDesejado / (1 - percent / 100);
  const valorSemTeto = semTeto - precoFinalDesejado;
  const limitadoPeloTeto = maxRS > 0 && valorSemTeto > maxRS;
  const precoAntesCupom = limitadoPeloTeto ? precoFinalDesejado + maxRS : semTeto;
  return { precoAntesCupom, limitadoPeloTeto, label };
}

function derivar(precoFinal: number, inputs: ShopeeInputs) {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    roasAlvo,
    afiliadoPercent,
    devolucaoPercent,
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
  // precoFinal já é o preço líquido do cupom da loja (ver chamada abaixo) — não
  // subtrair o cupom de novo aqui, senão a taxa de transação fica subavaliada.
  const custoTaxaTransacao = precoFinal * (TAXA_TRANSACAO_PERCENT / 100);
  const custoAfiliado = precoFinal * ((afiliadoPercent || 0) / 100);
  const custoDevolucao = precoFinal * ((devolucaoPercent || 0) / 100);
  const valorAReceber = precoFinal - valorComissao;
  const custoAcelera = valorAReceber * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);

  const totalCustos =
    custoBase +
    valorComissao +
    custoAds +
    valorTributacao +
    custoCampanhas +
    custoAcelera +
    custoTaxaTransacao +
    custoAfiliado +
    custoDevolucao;
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
    custoAfiliado,
    custoDevolucao,
    totalCustos,
    lucroLiquido,
    margemReal,
  };
}

function resolverPorMargem(inputs: ShopeeInputs): { preco: number; inviavel: boolean } {
  const {
    fullCustoUnidade,
    valorCompra,
    custoEnvio,
    isKit,
    kitQtd,
    tributacaoPercent,
    metaLucroPercent,
    roasAlvo,
    afiliadoPercent,
    devolucaoPercent,
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
  let percentualComissaoFinal = 0;
  for (let i = 0; i < 150; i++) {
    const { percentual, valorComissao } = calcularComissaoShopee(pF, tipoVendedor, altaVolume);
    percentualComissaoFinal = percentual;
    const ads = roasAlvo > 0 ? pF / roasAlvo : 0;
    const trib = pF * (tributacaoPercent / 100);
    const camp = campanhasDestaque ? pF * 0.035 : 0;
    const afiliado = pF * ((afiliadoPercent || 0) / 100);
    const devolucao = pF * ((devolucaoPercent || 0) / 100);
    // pF aqui já é o preço final alvo (líquido de cupom — ver `resolverPrecoAntesCupomGeral`
    // mais abaixo, que resolve o cadastro a partir desse valor), então não subtrair o
    // cupom de novo na taxa de transação.
    const taxaTransacao = pF * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const lucroAlvo = pF * (metaLucroPercent / 100);
    const necessario =
      custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel + afiliado + devolucao + lucroAlvo;
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }

  // Inviável quando os custos percentuais (incl. margem alvo) já somam >= 100% do preço —
  // nenhum preço fecha a meta nesse caso, não importa o quanto ele suba.
  const percentTotal =
    percentualComissaoFinal * 100 +
    TAXA_TRANSACAO_PERCENT +
    tributacaoPercent +
    (afiliadoPercent || 0) +
    (roasAlvo > 0 ? 100 / roasAlvo : 0) +
    (devolucaoPercent || 0) +
    metaLucroPercent;
  const inviavel = !Number.isFinite(pF) || pF <= 0 || percentTotal >= 100;
  const preco = Number.isFinite(pF) && pF > 0 ? Math.ceil(pF) - 0.1 : 0.01;
  return { preco, inviavel };
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
    afiliadoPercent,
    devolucaoPercent,
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

  let pF = custoBase * (1 + (markupPercent || 0) / 100) * 1.4;
  for (let i = 0; i < 150; i++) {
    const { valorComissao } = calcularComissaoShopee(pF, tipoVendedor, altaVolume);
    const ads = roasAlvo > 0 ? pF / roasAlvo : 0;
    const trib = pF * (tributacaoPercent / 100);
    const camp = campanhasDestaque ? pF * 0.035 : 0;
    const afiliado = pF * ((afiliadoPercent || 0) / 100);
    const devolucao = pF * ((devolucaoPercent || 0) / 100);
    const cupom = cupomValorPara(pF, inputs);
    const taxaTransacao = Math.max(0, pF - cupom) * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const custoOperacao = custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel + afiliado + devolucao;
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
    afiliadoPercent,
    devolucaoPercent,
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
    const afiliado = pF * ((afiliadoPercent || 0) / 100);
    const devolucao = pF * ((devolucaoPercent || 0) / 100);
    const cupom = cupomValorPara(pF, inputs);
    const taxaTransacao = Math.max(0, pF - cupom) * (TAXA_TRANSACAO_PERCENT / 100);
    const rec = pF - valorComissao;
    const acel = rec * (SHOPEE_ACELERA_RATES[shopeeAcelera] || 0);
    const necessario =
      custoBase + valorComissao + ads + trib + camp + taxaTransacao + acel + afiliado + devolucao + (metaLucroRS || 0);
    if (Math.abs(necessario - pF) < 0.005) break;
    pF = necessario;
  }
  return Math.ceil(pF) - 0.1;
}

export function calcularPrecoShopee(inputs: ShopeeInputs): ShopeeResult {
  const {
    modo,
    promocaoPercent,
    estimativaVendas,
    referenciaPrecoMercado,
    roasAlvo,
  } = inputs;

  const ofertaRelampagoPercent = inputs.ofertaRelampagoPercent || 0;

  // Desconto "ativo": oferta relâmpago NÃO acumula com a Promoção — ela substitui
  // esse desconto (só faz sentido usá-la se for mais agressiva que o desconto normal).
  // Cupom (faixa por preço, ou único — %, com teto opcional em R$) sempre acumula por
  // cima do que estiver ativo.
  const descontoAtivoPercent = ofertaRelampagoPercent > 0 ? ofertaRelampagoPercent : (promocaoPercent || 0);
  // Nunca deixa a % de desconto (antes do cupom) chegar a 100% — quebraria a divisão no modo margem.
  const descontoAtivoFracao = Math.min(0.999, descontoAtivoPercent / 100);

  let precoCadastroSugerido: number;
  let precoFinalSugerido: number;
  let cupomLimitadoPeloTeto = false;
  let cupomTierAtivoLabel: string | null = null;
  /** Cupom da loja em R$, no cenário de preço ativo — usado na taxa de transação. */
  let valorCupomRS = 0;
  let inviavel = false;

  if (modo === "margem" || modo === "precoTravado") {
    // Margem: o preço final (e a margem) ficam garantidos na meta — o preço de
    // cadastro sobe pra compensar qualquer desconto dado. Preço travado: o MESMO
    // raciocínio, mas o alvo não vem de uma meta de margem calculada, vem direto do
    // que o usuário digitou — "preço travado" é o preço final ao cliente (depois de
    // oferta relâmpago/desconto/cupom), não o preço de cadastro. O cadastro sobe pra
    // compensar os descontos e entregar esse preço final exato.
    let precoFinalTarget: number;
    if (modo === "margem") {
      const resolvido = resolverPorMargem(inputs);
      precoFinalTarget = resolvido.preco;
      inviavel = resolvido.inviavel;
    } else {
      precoFinalTarget = inputs.precoTravado;
    }
    if (!precoFinalTarget || precoFinalTarget <= 0) precoFinalTarget = 0.01;

    const { precoAntesCupom } = resolverPrecoAntesCupomGeral(precoFinalTarget, inputs);
    precoCadastroSugerido =
      descontoAtivoFracao > 0
        ? Math.ceil(precoAntesCupom / (1 - descontoAtivoFracao)) - 0.1
        : precoAntesCupom;

    // precoCadastroSugerido arredonda pra CIMA (termina em ",90") — o preço que o
    // cliente paga de verdade, calculado pra frente a partir desse cadastro já
    // arredondado, fica um pouco ACIMA do precoFinalTarget usado só pra resolver
    // o cadastro. Usa sempre esse preço real daqui em diante (nunca o target),
    // senão o "ativo agora" e o Detalhamento de Custos mostram um valor que a
    // Shopee nunca vai cobrar de fato (bug real, não só estético — pego numa
    // revisão: cadastro R$111,90 + oferta 48% + cupom 5% até R$2 resulta em
    // R$56,19 de verdade, não nos R$55,90 do target pré-arredondamento).
    const precoAntesCupomReal = precoCadastroSugerido * (1 - descontoAtivoFracao);
    const cupomReal = aplicarCupomGeral(precoAntesCupomReal, inputs);
    precoFinalSugerido = cupomReal.precoFinal;
    cupomLimitadoPeloTeto = cupomReal.limitadoPeloTeto;
    valorCupomRS = cupomReal.valorCupom;
    cupomTierAtivoLabel = cupomReal.label;
  } else {
    // markup / lucroRS: cadastro fixo (independe do desconto), e o desconto reduz de
    // verdade o preço final — lucro/margem exibidos são o resultado real (podem cair
    // ou até ficar negativos). É o comportamento certo pra simular estratégias de
    // ranqueamento (ver o quanto o desconto consome da margem).
    if (modo === "lucroRS") {
      precoCadastroSugerido = resolverPorLucroRS(inputs);
    } else {
      precoCadastroSugerido = resolverPorMarkup(inputs);
    }
    if (!precoCadastroSugerido || precoCadastroSugerido <= 0) precoCadastroSugerido = 0.01;

    const precoAntesCupom = precoCadastroSugerido * (1 - descontoAtivoFracao);
    const cupomAplicado = aplicarCupomGeral(precoAntesCupom, inputs);
    precoFinalSugerido = cupomAplicado.precoFinal;
    cupomLimitadoPeloTeto = cupomAplicado.limitadoPeloTeto;
    valorCupomRS = cupomAplicado.valorCupom;
    cupomTierAtivoLabel = cupomAplicado.label;
  }

  const descTotal =
    precoCadastroSugerido > 0 ? Math.max(0, (1 - precoFinalSugerido / precoCadastroSugerido) * 100) : 0;

  // Os dois cenários de preço que o cliente pode ver: com o desconto normal (fora
  // do período de oferta relâmpago) ou com a oferta relâmpago (durante a campanha) —
  // cupom (com teto, por faixa ou único) acumula nos dois. Um deles é sempre igual ao precoFinalSugerido (o ativo).
  let precoComDescontoECupom = aplicarCupomGeral(
    precoCadastroSugerido * (1 - (promocaoPercent || 0) / 100),
    inputs,
  ).precoFinal;
  let precoComOfertaECupom =
    ofertaRelampagoPercent > 0
      ? aplicarCupomGeral(precoCadastroSugerido * (1 - ofertaRelampagoPercent / 100), inputs).precoFinal
      : null;

  // Percent/teto "ativos" pra exibição (coluna Cupom do Detalhamento) — resolvidos pro
  // preço antes-do-cupom real do cenário ativo, não os valores crus do cupom único
  // (que nem fazem sentido quando cupomTiers está em uso).
  const cupomAtivoResolvido = cupomResolverPara(
    precoFinalSugerido + valorCupomRS,
    inputs,
  );

  // No modo margem, precoFinalSugerido agora É o preço real calculado pra frente a
  // partir do precoCadastroSugerido (ver acima) com a mesma fórmula usada aqui embaixo
  // — então o que estiver "ativo agora" (oferta ou desconto normal) já bate sozinho,
  // sem precisar forçar/sobrescrever nada.

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
    custoTaxaTransacao,
    custoAfiliado,
    custoDevolucao,
    lucroLiquido,
    margemReal,
  } = custos;

  // Base de custo completa pro ROAS: nunca inclui custoAds (é justamente o que está
  // sendo resolvido), mas já desconta afiliado% e devolução% junto com o resto.
  const denominador =
    precoFinalSugerido -
    valorComissao -
    valorTributacao -
    custoBase -
    custoCampanhas -
    custoAcelera -
    custoTaxaTransacao -
    custoAfiliado -
    custoDevolucao;
  const roasMinimo = denominador > 0 ? precoFinalSugerido / denominador : 999;

  // ROAS que você precisa bater na campanha (Shopee Ads) pra, além de cobrir o próprio
  // anúncio, ainda fechar com a margem alvo (mesma base de custo do roasMinimo acima —
  // nunca uma versão simplificada, senão os dois números divergem e confundem).
  const margemAntesDosAdsPercent = precoFinalSugerido > 0 ? (denominador / precoFinalSugerido) * 100 : 0;
  const roasAlvoParaMargem =
    denominador > 0 && margemAntesDosAdsPercent > (inputs.metaLucroPercent || 0)
      ? 100 / (margemAntesDosAdsPercent - (inputs.metaLucroPercent || 0))
      : null;

  const distribuicao = [
    { label: "Custo de compra", valor: custoBase, cor: "#6366f1" },
    { label: "Comissão Shopee", valor: valorComissao, cor: "#ee4d2d" },
    { label: "Taxa de transação", valor: custoTaxaTransacao, cor: "#eab308" },
    { label: "Tributação", valor: valorTributacao, cor: "#f97316" },
    { label: "Anúncios (Ads)", valor: custoAds, cor: "#3b82f6" },
    { label: "Camp. Destaque", valor: custoCampanhas, cor: "#ec4899" },
    { label: "Shopee Acelera", valor: custoAcelera, cor: "#8b5cf6" },
    { label: "Afiliados", valor: custoAfiliado, cor: "#14b8a6" },
    { label: "Reserva p/ devolução", valor: custoDevolucao, cor: "#64748b" },
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
    custoAfiliado,
    custoDevolucao,
    inviavel,
    inviavelMotivo: inviavel ? "Inviável com esses custos" : null,
    roasMinimo,
    roasAlvoParaMargem,
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
    cupomLojaPercent: cupomAtivoResolvido.percent,
    ofertaRelampagoPercent,
    cupomMaxRS: cupomAtivoResolvido.maxRS,
    cupomTierAtivoLabel,
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

