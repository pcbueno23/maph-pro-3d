import { describe, expect, it } from "vitest";
import { calcularPrecoShopee, type ShopeeInputs } from "./engine";

const BASE_INPUTS: ShopeeInputs = {
  fullCustoUnidade: 20,
  valorCompra: 0,
  custoEnvio: 0,
  isKit: false,
  kitQtd: 1,
  modo: "margem",
  metaLucroPercent: 20,
  precoTravado: 0,
  metaLucroRS: 10,
  markupPercent: 70,
  tributacaoPercent: 0,
  roasAlvo: 0,
  afiliadoPercent: 0,
  devolucaoPercent: 0,
  promocaoPercent: 0,
  cupomLojaPercent: 0,
  cupomMaxRS: 0,
  cupomTiers: [],
  ofertaRelampagoPercent: 0,
  campanhasDestaque: false,
  shopeeAcelera: "none",
  tipoVendedor: "cnpj",
  altaVolume: false,
  estimativaVendas: 0,
  referenciaPrecoMercado: 0,
};

describe("calcularPrecoShopee — afiliado% e devolução%", () => {
  it("sem afiliado/devolução, custoAfiliado e custoDevolucao ficam zerados", () => {
    const r = calcularPrecoShopee(BASE_INPUTS);
    expect(r.custoAfiliado).toBe(0);
    expect(r.custoDevolucao).toBe(0);
    expect(r.inviavel).toBe(false);
  });

  it("afiliado%/devolução% aumentam o preço de cadastro sugerido (modo margem)", () => {
    const semCustos = calcularPrecoShopee(BASE_INPUTS);
    const comCustos = calcularPrecoShopee({ ...BASE_INPUTS, afiliadoPercent: 5, devolucaoPercent: 5 });
    expect(comCustos.precoCadastroSugerido).toBeGreaterThan(semCustos.precoCadastroSugerido);
    expect(comCustos.custoAfiliado).toBeGreaterThan(0);
    expect(comCustos.custoDevolucao).toBeGreaterThan(0);
  });

  it("marca inviável quando os custos percentuais somados passam de 100%", () => {
    const r = calcularPrecoShopee({
      ...BASE_INPUTS,
      metaLucroPercent: 40,
      afiliadoPercent: 20,
      devolucaoPercent: 20,
      roasAlvo: 2, // 50% de Ads
    });
    expect(r.inviavel).toBe(true);
    expect(r.inviavelMotivo).toBe("Inviável com esses custos");
  });
});
