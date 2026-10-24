import { describe, expect, it } from "vitest";
import { resolverPrecoParaMargem } from "./shopeeMarginSheet";

// Caso de teste real: Bandeja Grande — custo produção 9,00 + embalagem 1,30 + taxa fixa
// 4,50 = numerador 14,80; comissão 20%; transação 2%; imposto 5%; afiliado 2,2%;
// devolução 3%; margem alvo 15%. Faixa de preço não muda nesses cenários (sem tabela de
// faixa em /margem-shopee), então taxa fixa e comissão ficam constantes.
describe("resolverPrecoParaMargem", () => {
  const base = {
    custosFixos: 9.0 + 1.3 + 4.5,
    comissaoPercent: 20,
    taxaTransacaoPercent: 2,
    impostoPercent: 5,
    afiliadoPercent: 2.2,
    devolucaoPercent: 3,
    margemAlvoPercent: 15,
  };

  it("ads% 20,7% -> R$46,11 (denominador 0,3210)", () => {
    const preco = resolverPrecoParaMargem({ ...base, adsPercent: 20.7 });
    expect(preco).not.toBe("inviavel");
    expect(preco as number).toBeCloseTo(46.11, 1);
  });

  it("ads% 16,67% (ROAS 6) -> R$40,96 (denominador 0,3613)", () => {
    const preco = resolverPrecoParaMargem({ ...base, adsPercent: 16.67 });
    expect(preco).not.toBe("inviavel");
    expect(preco as number).toBeCloseTo(40.96, 1);
  });

  it("ads% 0 -> R$28,03 (denominador 0,5280)", () => {
    const preco = resolverPrecoParaMargem({ ...base, adsPercent: 0 });
    expect(preco).not.toBe("inviavel");
    expect(preco as number).toBeCloseTo(28.03, 1);
  });

  it("denominador <= 0 -> inviável", () => {
    // comissão+transação+imposto+afiliado+devolução+margemAlvo já somam 47,2%; com ads%
    // suficiente pra passar de 100% no total, fica matematicamente impossível.
    const preco = resolverPrecoParaMargem({ ...base, adsPercent: 60 });
    expect(preco).toBe("inviavel");
  });
});
