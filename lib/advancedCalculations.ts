export function calcularCustoAjustado(params: {
  custoBase: number;
  taxaFalhaPercent: number;
}): number {
  const custoBase = Number(params.custoBase ?? 0);
  const taxa = Number(params.taxaFalhaPercent ?? 0);
  if (!Number.isFinite(custoBase) || custoBase <= 0) return Math.max(0, custoBase);
  if (!Number.isFinite(taxa) || taxa <= 0) return custoBase;
  const denom = 1 - taxa / 100;
  if (denom <= 0) return custoBase; // evita infinito
  return custoBase / denom;
}

export function calcularMaoDeObra(params: {
  maoDeObraTipo: "fixo" | "hora";
  maoDeObraValor: number;
  tempoManualMin: number;
}): number {
  const valor = Number(params.maoDeObraValor ?? 0);
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  if (params.maoDeObraTipo === "hora") {
    const min = Number(params.tempoManualMin ?? 0);
    if (!Number.isFinite(min) || min <= 0) return 0;
    return (valor / 60) * min;
  }
  return valor;
}

export function aplicarDesconto(params: {
  preco: number;
  descontoPercentual: number;
}): number {
  const preco = Number(params.preco ?? 0);
  const desconto = Number(params.descontoPercentual ?? 0);
  if (!Number.isFinite(preco) || preco <= 0) return Math.max(0, preco);
  if (!Number.isFinite(desconto) || desconto <= 0) return preco;
  const rate = Math.max(0, Math.min(desconto, 99.9)) / 100;
  return preco * (1 - rate);
}

export function calcularLucroReal(params: {
  precoComDesconto: number;
  taxasMarketplace: number;
  imposto: number;
  custoTotalAjustado: number;
}): { lucroLiquidoReal: number; margemReal: number } {
  const venda = Number(params.precoComDesconto ?? 0);
  const taxas = Number(params.taxasMarketplace ?? 0);
  const imposto = Number(params.imposto ?? 0);
  const custo = Number(params.custoTotalAjustado ?? 0);
  const lucro = venda - taxas - imposto - custo;
  const margem = venda > 0 ? (lucro / venda) * 100 : 0;
  return { lucroLiquidoReal: lucro, margemReal: margem };
}

