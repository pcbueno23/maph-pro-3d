import { describe, expect, it } from "vitest";
import { calcularComissaoTikTok, calcularPrecoTikTok, type TikTokInputs } from "./engine";

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
