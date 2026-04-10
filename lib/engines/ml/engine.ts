export type MlInputs = {
  valorCompra: number;
  custoEnvioMaterial: number;
  custosFixos: number;
  custosOperacionaisPercent: number;
  notaFiscalPercent: number;
  fullCustoUnidade: number;
  tipoAnuncio: "classico" | "premium";
  comissaoPercent: number;
  formaEnvio:
    | "mercado-envios"
    | "full"
    | "flex-proximo"
    | "flex-medio"
    | "flex-distante";
  categoriaFixa: "geral" | "livros" | "supermercado";
  categoriaEspecial: boolean;
  alimentosAnimais: boolean;
  reputacao: "verde" | "amarelo" | "vermelho" | "sem";
  peso: number;
  comprimento: number;
  largura: number;
  altura: number;
  modo: "margem" | "lucroRS" | "precoTravado";
  metaLucroPercent: number;
  precoTravado: number;
  metaLucroRS: number;
  modoAds: "roas" | "tacos";
  roasAlvo: number;
  acosPercent: number;
  tacosPercent: number;
  proporcaoOrganica: number;
  promocaoPercent: number;
  cupomLojaPercent: number;
  ofertaRelampago: boolean;
  estimativaVendas: number;
};

export type MlResult = {
  precoFinal: number;
  precoCliente: number;
  lucro: number;
  margem: number;
  margemContribuicao: number;
  margemContribuicaoPct: number;
  roasMinimo: number | null;
  acosAtual: number | null;
  tacosEstimado: number | null;
  roasBreakeven: number | null;
  acosBreakeven: number;
  roasTarget: number | null;
  acosTarget: number;
  tacosEscala: number | null;
  projecaoMensal: {
    faturamento: number;
    lucroLiquido: number;
    investimentoAds: number;
    comissoes: number;
    impostos: number;
    promocoes: number;
  } | null;
  custoBase: number;
  custos: {
    taxaFixa: number;
    comissao: number;
    frete: number;
    pesoCobrado: number;
    nf: number;
    opsPercent: number;
    ads: number;
    promo: number;
    cupom: number;
    oferta: number;
  };
  distribuicao: Array<{ label: string; valor: number; cor: string }>;
  pesoConsiderado: number;
  estimativaVendas: number;
};

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    v ?? 0,
  );

export const formatPct = (v: number) => `${(v ?? 0).toFixed(1)}%`;

export function calcularTaxaML(
  preco: number,
  tipoAnuncio: MlInputs["tipoAnuncio"],
  categoriaFixa: MlInputs["categoriaFixa"],
  categoriaEspecial: boolean,
) {
  let taxaFixa = 0;

  if (preco < 79) {
    if (!categoriaEspecial) {
      switch (categoriaFixa) {
        case "livros":
          taxaFixa = preco * 0.5;
          break;
        case "supermercado":
          taxaFixa = preco * 0.12;
          break;
        default:
          taxaFixa = 6.75;
          break;
      }
    } else {
      taxaFixa = 6.75;
    }
    if (tipoAnuncio === "premium") taxaFixa = 0;
  }

  return { taxaFixa };
}

const FRETE_TABLE = [
  [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95],
  [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55],
  [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65],
  [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65],
  [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65],
  [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25],
  [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35],
  [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75],
  [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75],
  [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05],
  [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05],
  [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35],
  [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65],
  [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25],
  [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95],
  [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65],
  [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15],
  [7.65, 10.95, 12.15, 64.05, 75.05, 84.75, 95.35, 105.95],
  [7.75, 11.15, 12.35, 65.95, 75.45, 85.55, 96.25, 106.95],
  [7.85, 11.35, 12.55, 67.75, 78.95, 88.95, 99.15, 107.05],
  [7.95, 11.55, 12.75, 70.25, 81.05, 92.05, 102.55, 110.75],
  [8.05, 11.75, 12.95, 74.95, 86.45, 98.15, 109.35, 118.15],
  [8.15, 11.95, 13.15, 80.25, 92.95, 105.05, 117.15, 126.55],
  [8.25, 12.15, 13.35, 83.95, 97.05, 109.85, 122.45, 132.25],
  [8.35, 12.35, 13.55, 93.25, 107.45, 122.05, 136.05, 146.95],
  [8.45, 12.55, 13.75, 106.55, 123.95, 139.55, 155.55, 167.95],
  [8.55, 12.75, 13.95, 119.25, 138.05, 156.05, 173.95, 187.95],
  [8.65, 12.75, 14.15, 126.55, 146.15, 165.65, 184.65, 199.45],
  [8.75, 12.95, 14.35, 166.15, 192.45, 217.55, 242.55, 261.95],
];

function freteCol(preco: number) {
  if (preco < 19) return 0;
  if (preco < 49) return 1;
  if (preco < 79) return 2;
  if (preco < 100) return 3;
  if (preco < 120) return 4;
  if (preco < 150) return 5;
  if (preco < 200) return 6;
  return 7;
}

function freteRow(kg: number) {
  if (kg <= 0.3) return 0;
  if (kg <= 0.5) return 1;
  if (kg <= 1.0) return 2;
  if (kg <= 1.5) return 3;
  if (kg <= 2.0) return 4;
  if (kg <= 3.0) return 5;
  if (kg <= 4.0) return 6;
  if (kg <= 5.0) return 7;
  if (kg <= 6.0) return 8;
  if (kg <= 7.0) return 9;
  if (kg <= 8.0) return 10;
  if (kg <= 9.0) return 11;
  if (kg <= 11.0) return 12;
  if (kg <= 13.0) return 13;
  if (kg <= 15.0) return 14;
  if (kg <= 17.0) return 15;
  if (kg <= 20.0) return 16;
  if (kg <= 25.0) return 17;
  if (kg <= 30.0) return 18;
  if (kg <= 40.0) return 19;
  if (kg <= 50.0) return 20;
  if (kg <= 60.0) return 21;
  if (kg <= 70.0) return 22;
  if (kg <= 80.0) return 23;
  if (kg <= 90.0) return 24;
  if (kg <= 100.0) return 25;
  if (kg <= 125.0) return 26;
  if (kg <= 150.0) return 27;
  return 28;
}

export function calcularFreteML(
  preco: number,
  pesoReal: number,
  c: number,
  l: number,
  a: number,
  formaEnvio: MlInputs["formaEnvio"],
  fullCusto: number,
) {
  if (formaEnvio === "flex-proximo") return { frete: 6.0, pesoCobrado: pesoReal };
  if (formaEnvio === "flex-medio") return { frete: 9.0, pesoCobrado: pesoReal };
  if (formaEnvio === "flex-distante") return { frete: 12.0, pesoCobrado: pesoReal };

  const peso = pesoReal || 0;
  const comp = c || 0;
  const larg = l || 0;
  const alt = a || 0;

  const fatorCubagem = fullCusto > 0 ? 5000 : 6000;
  const pesoCubado = (comp * larg * alt) / fatorCubagem;
  const pesoCobrado = Math.max(peso, pesoCubado);

  let frete = FRETE_TABLE[freteRow(pesoCobrado)][freteCol(preco)];
  if (preco < 19) frete = Math.min(frete, preco * 0.5);

  return { frete: Math.max(0, frete), pesoCobrado };
}

export function calcularPrecoML(inputs: MlInputs): MlResult {
  const {
    modo,
    valorCompra,
    custoEnvioMaterial,
    custosFixos,
    custosOperacionaisPercent,
    notaFiscalPercent,
    comissaoPercent,
    tipoAnuncio,
    categoriaFixa,
    categoriaEspecial,
    formaEnvio,
    peso,
    comprimento,
    largura,
    altura,
    modoAds,
    roasAlvo,
    tacosPercent,
    promocaoPercent,
    cupomLojaPercent,
    ofertaRelampago,
    fullCustoUnidade,
    metaLucroPercent,
    precoTravado,
    metaLucroRS,
  } = inputs;

  const custoBase =
    (valorCompra || 0) +
    (custoEnvioMaterial || 0) +
    (custosFixos || 0) +
    (fullCustoUnidade || 0);

  function calcularCustos(p: number) {
    const { taxaFixa } = calcularTaxaML(p, tipoAnuncio, categoriaFixa, categoriaEspecial);
    const comissao = p * ((comissaoPercent || 0) / 100);
    const precoParaFrete = p * (1 - (promocaoPercent || 0) / 100);
    const { frete, pesoCobrado } = calcularFreteML(
      precoParaFrete,
      peso,
      comprimento,
      largura,
      altura,
      formaEnvio,
      fullCustoUnidade,
    );
    const nf = p * ((notaFiscalPercent || 0) / 100);
    const opsPercent = p * ((custosOperacionaisPercent || 0) / 100);
    const ads =
      modoAds === "tacos"
        ? p * ((tacosPercent || 0) / 100)
        : roasAlvo > 0
          ? p / roasAlvo
          : 0;
    const promo = p * ((promocaoPercent || 0) / 100);
    const cupom = p * ((cupomLojaPercent || 0) / 100);
    const oferta = ofertaRelampago ? p * 0.05 : 0;
    return { taxaFixa, comissao, frete, pesoCobrado, nf, opsPercent, ads, promo, cupom, oferta };
  }

  let precoFinal = 0;
  if (modo === "precoTravado") {
    const promo = (promocaoPercent || 0) / 100;
    precoFinal = promo > 0 ? (precoTravado || 0) / (1 - promo) : precoTravado || 0;
  } else if (modo === "margem") {
    let p = custoBase * 3;
    const meta = (metaLucroPercent || 20) / 100;
    for (let i = 0; i < 200; i++) {
      const c = calcularCustos(p);
      const totalCustos =
        custoBase +
        c.taxaFixa +
        c.comissao +
        c.frete +
        c.nf +
        c.opsPercent +
        c.ads +
        c.promo +
        c.cupom +
        c.oferta;
      const lucroAlvo = p * meta;
      const n = totalCustos + lucroAlvo;
      if (Math.abs(n - p) < 0.005) break;
      p = n;
    }
    precoFinal = Math.ceil(p) - 0.1;
  } else if (modo === "lucroRS") {
    let p = custoBase * 3;
    const lucroAlvo = metaLucroRS || 0;
    for (let i = 0; i < 200; i++) {
      const c = calcularCustos(p);
      const totalCustos =
        custoBase +
        c.taxaFixa +
        c.comissao +
        c.frete +
        c.nf +
        c.opsPercent +
        c.ads +
        c.promo +
        c.cupom +
        c.oferta;
      const n = totalCustos + lucroAlvo;
      if (Math.abs(n - p) < 0.005) break;
      p = n;
    }
    precoFinal = Math.ceil(p) - 0.1;
  }

  const custos = calcularCustos(precoFinal);
  const totalCustos =
    custoBase +
    custos.taxaFixa +
    custos.comissao +
    custos.frete +
    custos.nf +
    custos.opsPercent +
    custos.ads +
    custos.promo +
    custos.cupom +
    custos.oferta;
  const lucro = precoFinal - totalCustos;
  const margem = precoFinal > 0 ? (lucro / precoFinal) * 100 : 0;
  const margemContribuicao =
    precoFinal - custoBase - custos.comissao - custos.taxaFixa - custos.frete;
  const margemContribuicaoPct =
    precoFinal > 0 ? (margemContribuicao / precoFinal) * 100 : 0;

  const precoCliente = precoFinal * (1 - (promocaoPercent || 0) / 100);

  // ROAS mínimo (breakeven) para o setup atual
  const custosSemAds =
    custoBase +
    custos.comissao +
    custos.taxaFixa +
    custos.frete +
    custos.nf +
    custos.opsPercent +
    custos.promo +
    custos.cupom +
    custos.oferta;
  const denomRoas = precoFinal - custosSemAds;
  const roasMinimo = denomRoas > 0 ? precoFinal / denomRoas : null;

  const acosAtual = custos.ads > 0 && precoFinal > 0 ? (custos.ads / precoFinal) * 100 : null;
  const tacosEstimado =
    acosAtual != null ? acosAtual * (1 - (inputs.proporcaoOrganica || 50) / 100) : null;

  // Níveis ROAS/ACOS (portando a lógica explicativa do produto externo)
  const margemBrutaPct = precoFinal > 0 ? (margemContribuicao / precoFinal) * 100 : 0;
  const acosBreakeven = margemBrutaPct;
  const roasBreakeven = acosBreakeven > 0 ? 1 / (acosBreakeven / 100) : null;
  const metaMargem = inputs.metaLucroPercent || 20;
  const acosTarget = Math.max(0, acosBreakeven - metaMargem);
  const roasTarget = acosTarget > 0 ? 1 / (acosTarget / 100) : null;
  const tacosEscala =
    acosTarget > 0
      ? acosTarget * (1 - (inputs.proporcaoOrganica || 50) / 100)
      : null;

  const projecaoMensal =
    (inputs.estimativaVendas || 0) > 0
      ? {
          faturamento: precoCliente * (inputs.estimativaVendas || 0),
          lucroLiquido: lucro * (inputs.estimativaVendas || 0),
          investimentoAds: custos.ads * (inputs.estimativaVendas || 0),
          comissoes: (custos.comissao + custos.taxaFixa) * (inputs.estimativaVendas || 0),
          impostos: (custos.nf + custos.opsPercent) * (inputs.estimativaVendas || 0),
          promocoes: (custos.promo + custos.cupom + custos.oferta) * (inputs.estimativaVendas || 0),
        }
      : null;

  const distribuicao = [
    { label: "Custo do produto", valor: custoBase, cor: "#6b7280" },
    {
      label: "Comissão ML",
      valor: custos.comissao + custos.taxaFixa,
      cor: "#f59e0b",
    },
    { label: "Frete", valor: custos.frete, cor: "#3b82f6" },
    { label: "Impostos", valor: custos.nf + custos.opsPercent, cor: "#ef4444" },
    { label: "Mercado Ads", valor: custos.ads, cor: "#8b5cf6" },
    {
      label: "Promoções",
      valor: custos.promo + custos.cupom + custos.oferta,
      cor: "#ec4899",
    },
    { label: "Lucro", valor: Math.max(0, lucro), cor: "#10b981" },
  ].filter((d) => d.valor > 0.01);

  return {
    precoFinal,
    precoCliente,
    lucro,
    margem,
    margemContribuicao,
    margemContribuicaoPct,
    roasMinimo,
    acosAtual,
    tacosEstimado,
    roasBreakeven,
    acosBreakeven,
    roasTarget,
    acosTarget,
    tacosEscala,
    projecaoMensal,
    custoBase,
    custos,
    distribuicao,
    pesoConsiderado: custos.pesoCobrado,
    estimativaVendas: inputs.estimativaVendas || 100,
  };
}

