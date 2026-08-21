import { describe, expect, it } from "vitest";
import {
  calcularComissaoTikTok,
  calcularPrecoTikTok,
  calcularPrecosReferenciaTikTok,
  type TikTokInputs,
} from "./engine";

const BASE_INPUTS: TikTokInputs = {
  fullCustoUnidade: 20,
  valorCompra: 0,
  custoEnvio: 0,
  isKit: false,
  kitQtd: 1,
  modo: "precoTravado",
  metaLucroPercent: 20,
  precoTravado: 0,
  metaLucroRS: 10,
  tributacaoPercent: 0,
  participaSFP: false,
  comissaoAfiliadoPercent: 0,
  roasAlvo: 0,
  novoVendedorIsento: false,
  estimativaVendas: 0,
  referenciaPrecoMercado: 0,
  alvo1Percent: 10,
  alvo2Percent: 15,
  alvo3Percent: 20,
  promocaoPercent: 0,
  cupomLojaPercent: 0,
  cupomMaxRS: 0,
  ofertaRelampagoPercent: 0,
};

describe("calcularComissaoTikTok", () => {
  it("cobra 10% + R$4 fixo abaixo de R$50", () => {
    const c = calcularComissaoTikTok(40, false);
    expect(c.percentual).toBe(0.1);
    expect(c.fixo).toBe(4);
    expect(c.valorComissao).toBeCloseTo(40 * 0.1 + 4, 6);
  });

  it("cobra 6% + R$6 fixo a partir de R$50", () => {
    const c = calcularComissaoTikTok(120, false);
    expect(c.percentual).toBe(0.06);
    expect(c.fixo).toBe(6);
    expect(c.valorComissao).toBeCloseTo(120 * 0.06 + 6, 6);
  });

  it("é isenta com novoVendedorIsento", () => {
    const c = calcularComissaoTikTok(200, true);
    expect(c.valorComissao).toBe(0);
  });
});

describe("calcularPrecoTikTok (modo precoTravado, sem solver)", () => {
  it("aplica comissão + SFP (6% capado em R$50) no preço travado", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 120,
      participaSFP: true,
    });
    const comissaoEsperada = 120 * 0.06 + 6;
    const sfpEsperado = Math.min(120 * 0.06, 50);
    expect(result.valorComissao).toBeCloseTo(comissaoEsperada, 6);
    expect(result.valorSFP).toBeCloseTo(sfpEsperado, 6);
    expect(result.lucroLiquido).toBeCloseTo(
      120 - result.custoBase - comissaoEsperada - sfpEsperado,
      6,
    );
  });

  it("teto do SFP em R$50 para itens de alto valor", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 2000,
      participaSFP: true,
    });
    expect(result.valorSFP).toBe(50);
  });

  it("comissão de afiliado e tributação entram como % do preço", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 100,
      comissaoAfiliadoPercent: 10,
      tributacaoPercent: 5,
    });
    expect(result.valorAfiliado).toBeCloseTo(10, 6);
    expect(result.valorTributacao).toBeCloseTo(5, 6);
  });
});

describe("calcularPrecoTikTok (modo margem, com solver)", () => {
  it("converge para a margem real alvo", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      modo: "margem",
      metaLucroPercent: 25,
      participaSFP: true,
    });
    expect(result.margemReal).toBeCloseTo(25, 0);
  });
});

describe("calcularPrecoTikTok (cadastro + desconto/oferta/cupom)", () => {
  it("no modo precoTravado, o cadastro é fixo e o desconto reduz o preço final de verdade", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 100,
      promocaoPercent: 20,
    });
    expect(result.precoCadastroSugerido).toBeCloseTo(100, 6);
    expect(result.precoFinalSugerido).toBeCloseTo(80, 6);
    // Comissão/SFP/etc. são cobrados sobre o preço final (pós-desconto), não sobre o cadastro.
    expect(result.valorComissao).toBeCloseTo(80 * 0.06 + 6, 6);
  });

  it("oferta relâmpago substitui a promoção (não acumula) e cupom acumula por cima", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 100,
      promocaoPercent: 10,
      ofertaRelampagoPercent: 30,
      cupomLojaPercent: 5,
    });
    // Ativo = oferta (30%) -> 70, depois cupom 5% -> 66.5 (não 100*0.9*0.95).
    expect(result.precoFinalSugerido).toBeCloseTo(70 * 0.95, 6);
  });

  it("teto do cupom em R$ limita o desconto e sinaliza cupomLimitadoPeloTeto", () => {
    const result = calcularPrecoTikTok({
      ...BASE_INPUTS,
      precoTravado: 100,
      cupomLojaPercent: 20,
      cupomMaxRS: 5,
    });
    expect(result.precoFinalSugerido).toBeCloseTo(95, 6);
    expect(result.cupomLimitadoPeloTeto).toBe(true);
  });

  it("no modo margem, o preço final fica travado na meta e o cadastro sobe pra compensar o desconto", () => {
    const semDesconto = calcularPrecoTikTok({ ...BASE_INPUTS, modo: "margem", metaLucroPercent: 25 });
    const comDesconto = calcularPrecoTikTok({
      ...BASE_INPUTS,
      modo: "margem",
      metaLucroPercent: 25,
      promocaoPercent: 30,
    });
    expect(comDesconto.precoFinalSugerido).toBeCloseTo(semDesconto.precoFinalSugerido, 0);
    expect(comDesconto.margemReal).toBeCloseTo(semDesconto.margemReal, 0);
    expect(comDesconto.precoCadastroSugerido).toBeGreaterThan(semDesconto.precoCadastroSugerido);
  });
});

describe("calcularPrecosReferenciaTikTok", () => {
  it("mínimo é breakeven (margem ~0%) e os alvos crescem em ordem", () => {
    const inputs: TikTokInputs = { ...BASE_INPUTS, participaSFP: true, comissaoAfiliadoPercent: 10 };
    const ref = calcularPrecosReferenciaTikTok(inputs);

    const noMinimo = calcularPrecoTikTok({ ...inputs, modo: "precoTravado", precoTravado: ref.minimo });
    expect(noMinimo.margemReal).toBeGreaterThanOrEqual(0);
    expect(noMinimo.margemReal).toBeLessThan(2);

    expect(ref.minimo).toBeLessThan(ref.alvo1.preco);
    expect(ref.alvo1.preco).toBeLessThan(ref.alvo2.preco);
    expect(ref.alvo2.preco).toBeLessThan(ref.alvo3.preco);
  });

  it("preço-alvo 3 entrega ~a margem real configurada quando travado nesse valor", () => {
    const inputs: TikTokInputs = { ...BASE_INPUTS, participaSFP: true };
    const ref = calcularPrecosReferenciaTikTok(inputs);
    const noAlvo3 = calcularPrecoTikTok({ ...inputs, modo: "precoTravado", precoTravado: ref.alvo3.preco });
    expect(noAlvo3.margemReal).toBeGreaterThanOrEqual(20);
    expect(noAlvo3.margemReal).toBeLessThan(22);
  });

  it("usa as % alvo configuradas em vez de valores fixos", () => {
    const inputs: TikTokInputs = { ...BASE_INPUTS, participaSFP: true, alvo1Percent: 5, alvo2Percent: 12, alvo3Percent: 30 };
    const ref = calcularPrecosReferenciaTikTok(inputs);
    expect(ref.alvo1.percent).toBe(5);
    expect(ref.alvo2.percent).toBe(12);
    expect(ref.alvo3.percent).toBe(30);
    expect(ref.alvo1.preco).toBeLessThan(ref.alvo2.preco);
    expect(ref.alvo2.preco).toBeLessThan(ref.alvo3.preco);
  });

  it("calcularPrecoTikTok expõe precosReferencia no resultado", () => {
    const result = calcularPrecoTikTok({ ...BASE_INPUTS, precoTravado: 120, participaSFP: true });
    expect(result.precosReferencia.minimo).toBeGreaterThan(0);
    expect(result.precosReferencia.alvo3.preco).toBeGreaterThan(result.precosReferencia.minimo);
  });
});
