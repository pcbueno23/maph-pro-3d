/**
 * Diagnóstico de anúncios Shopee Ads, métrica a métrica, pra usuário iniciante.
 *
 * Baseado no framework padrão de diagnóstico de funil de anúncios de marketplace
 * (Amazon PPC / e-commerce ads): olhar as métricas em RELAÇÃO umas às outras, não
 * isoladas, pra achar em qual etapa do funil o anúncio está travando —
 * Impressões → Cliques (CTR) → Carrinho → Conversão (taxa de conversão) → Venda (ROAS).
 *
 * - CTR baixo com conversão ok quando clica = problema é o CRIATIVO (foto/título/preço
 *   exibido), não a página do produto — pouca gente clica, mas quem clica compra.
 * - CTR ok/bom com conversão baixa = "gap de expectativa": a pessoa clicou interessada
 *   mas não comprou — problema é a PÁGINA DO PRODUTO (preço final, fotos, avaliações).
 * - Muito carrinho e pouca conversão = abandono no checkout (frete, prazo, cupom).
 * - ROAS "positivo" (>1x) não significa lucro real — o que importa é comparar com o
 *   ROAS DE EQUILÍBRIO calculado a partir da margem REAL do produto (preço médio de
 *   venda vs custo de produção já cadastrado no SaaS), não um número genérico de mercado.
 *
 * Fontes: benchmarks gerais de e-commerce ads (CTR ~1.5-2%+ é bom, ROAS de equilíbrio
 * = 1 / margem bruta) — usados aqui só como referência de ordem de grandeza, não como
 * regra rígida, já que a Shopee não publica benchmark oficial por categoria.
 */
import type { AdsRowSummary } from "./supabaseShopeeReports";

export type MetricStatus = "boa" | "atencao" | "ruim" | "neutro";

export type MetricFeedback = {
  key: string;
  label: string;
  value: string;
  status: MetricStatus;
  explanation: string;
};

export type AdDiagnosis = {
  overallStatus: MetricStatus;
  overallSummary: string;
  funnelStage: "alcance" | "criativo" | "pagina" | "checkout" | "custo" | "saudavel" | "sem_dados";
  lowSample: boolean;
  breakEvenRoas: number | null;
  metrics: MetricFeedback[];
};

function pct(v: number | null): string {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}
function brl(v: number | null): string {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function mult(v: number | null): string {
  return v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}x`;
}

export function analyzeAd(row: AdsRowSummary): AdDiagnosis {
  const metrics: MetricFeedback[] = [];
  const impressions = row.impressions ?? 0;
  const clicks = row.clicks ?? 0;
  const ctr = row.ctr ?? (impressions > 0 ? (clicks / impressions) * 100 : null);
  const conversions = row.conversions ?? 0;
  const conversionRate = row.conversionRate ?? (clicks > 0 ? (conversions / clicks) * 100 : null);
  const addToCart = row.addToCart ?? 0;
  const expenses = row.expenses ?? 0;
  const gmv = row.gmv ?? 0;
  const roas = row.roas ?? (expenses > 0 ? gmv / expenses : null);
  const itemsSold = row.itemsSold ?? 0;
  const avgSalePrice = itemsSold > 0 ? gmv / itemsSold : null;

  const lowSample = impressions < 300 || clicks < 15;

  // 1) Alcance
  if (impressions === 0) {
    metrics.push({
      key: "impressions",
      label: "Impressões",
      value: "0",
      status: "ruim",
      explanation:
        "Esse anúncio não apareceu pra ninguém ainda — verifique se ele está mesmo ativo, se o lance está competitivo, ou se o orçamento não acabou logo no início do dia.",
    });
  } else {
    metrics.push({
      key: "impressions",
      label: "Impressões",
      value: impressions.toLocaleString("pt-BR"),
      status: lowSample ? "neutro" : "boa",
      explanation: lowSample
        ? "Ainda é pouco volume — as métricas abaixo (CTR, conversão) podem mudar bastante com mais dados. Trate as conclusões como provisórias."
        : "Volume de exibições suficiente pra confiar nas métricas de CTR e conversão abaixo.",
    });
  }

  // 2) CTR — mede se o criativo (foto/título/preço) chama atenção
  let ctrStatus: MetricStatus = "neutro";
  let ctrExplain = "Sem cliques suficientes ainda pra avaliar.";
  if (ctr != null && impressions > 0) {
    if (ctr < 0.5) {
      ctrStatus = "ruim";
      ctrExplain =
        "De cada 1000 pessoas que veem, menos de 5 clicam — a foto de capa, o título ou o preço exibido não estão chamando atenção comparado aos concorrentes na mesma busca.";
    } else if (ctr < 1.5) {
      ctrStatus = "atencao";
      ctrExplain =
        "CTR na média — dá pra melhorar. Testar outra foto de capa (mais nítida, com o produto centralizado) ou revisar se o preço exibido está competitivo costuma ajudar.";
    } else {
      ctrStatus = "boa";
      ctrExplain = "Boa taxa de cliques — o anúncio está atraindo atenção bem entre quem vê.";
    }
  }
  metrics.push({ key: "ctr", label: "CTR (cliques ÷ impressões)", value: pct(ctr), status: ctrStatus, explanation: ctrExplain });

  // 3) Taxa de conversão — mede se quem clica de fato compra (problema de página, não de anúncio)
  let convStatus: MetricStatus = "neutro";
  let convExplain = "Sem cliques suficientes ainda pra avaliar.";
  if (conversionRate != null && clicks > 0) {
    if (conversionRate < 2) {
      convStatus = "ruim";
      convExplain =
        ctrStatus === "boa" || ctrStatus === "atencao"
          ? "Isso é um 'gap de expectativa': a pessoa clicou interessada (o anúncio funcionou), mas não comprou. O problema está na PÁGINA DO PRODUTO — preço final mais alto que o esperado, fotos que não convencem, poucas avaliações ou descrição confusa."
          : "Poucos cliques viram venda. Combinado com o CTR baixo, pode ser tráfego pouco qualificado (a palavra-chave/categoria do anúncio não é bem o que esse comprador queria)."
      ;
    } else if (conversionRate < 5) {
      convStatus = "atencao";
      convExplain = "Conversão razoável — revisar fotos, avaliações e o preço final (com frete) pode destravar mais vendas.";
    } else {
      convStatus = "boa";
      convExplain = "Boa taxa de conversão — quem clica está comprando bem. A página do produto está convencendo.";
    }
  }
  metrics.push({
    key: "conversion_rate",
    label: "Taxa de conversão (vendas ÷ cliques)",
    value: pct(conversionRate),
    status: convStatus,
    explanation: convExplain,
  });

  // 4) Carrinho abandonado (add to cart vs conversão)
  if (addToCart > 0) {
    const cartToSale = conversions > 0 ? (conversions / addToCart) * 100 : 0;
    let cartStatus: MetricStatus = "boa";
    let cartExplain = "A maior parte de quem coloca no carrinho finaliza a compra.";
    if (cartToSale < 30) {
      cartStatus = "ruim";
      cartExplain =
        "Muita gente coloca no carrinho mas não finaliza — geralmente é frete alto/demorado na etapa de checkout, falta de cupom, ou a pessoa só estava comparando preço.";
    } else if (cartToSale < 60) {
      cartStatus = "atencao";
      cartExplain = "Parte de quem coloca no carrinho desiste antes de pagar — vale revisar prazo e custo de frete.";
    }
    metrics.push({
      key: "cart",
      label: "Carrinho → venda",
      value: `${addToCart.toLocaleString("pt-BR")} no carrinho, ${pct(cartToSale)} viraram venda`,
      status: cartStatus,
      explanation: cartExplain,
    });
  }

  // 5) Custo por conversão vs preço médio de venda
  if (row.costPerConversion != null && avgSalePrice != null && avgSalePrice > 0) {
    const shareOfPrice = (row.costPerConversion / avgSalePrice) * 100;
    let costStatus: MetricStatus = "boa";
    let costExplain = "O custo de ads por venda é uma fatia pequena do preço do produto.";
    if (shareOfPrice > 50) {
      costStatus = "ruim";
      costExplain = `Cada venda custou ${brl(row.costPerConversion)} só em anúncio — mais da metade do preço médio de venda (${brl(avgSalePrice)}). Sobra pouco (ou nada) depois de somar o custo do produto.`;
    } else if (shareOfPrice > 25) {
      costStatus = "atencao";
      costExplain = `O custo de ads por venda (${brl(row.costPerConversion)}) já é uma fatia relevante do preço médio (${brl(avgSalePrice)}) — de olho pra não crescer mais.`;
    }
    metrics.push({
      key: "cost_per_conversion",
      label: "Custo por conversão",
      value: brl(row.costPerConversion),
      status: costStatus,
      explanation: costExplain,
    });
  }

  // 6) ROAS real vs ROAS de equilíbrio (o insight central — usa a margem REAL do produto)
  let breakEvenRoas: number | null = null;
  let roasStatus: MetricStatus = "neutro";
  let roasExplain = "Ainda sem investimento suficiente pra avaliar o retorno.";
  let funnelStage: AdDiagnosis["funnelStage"] = "sem_dados";

  if (expenses > 0) {
    if (row.matchedProductCost != null && avgSalePrice != null && avgSalePrice > row.matchedProductCost) {
      const margin = (avgSalePrice - row.matchedProductCost) / avgSalePrice;
      breakEvenRoas = 1 / margin;
      if (roas == null || roas < breakEvenRoas) {
        roasStatus = "ruim";
        roasExplain = `Esse anúncio pareceria "positivo" só olhando ROAS > 1x, mas o ROAS de equilíbrio DESSE produto (considerando o custo real de ${brl(row.matchedProductCost)} e o preço médio vendido de ${brl(avgSalePrice)}) é ${mult(breakEvenRoas)}. Como o ROAS real é ${mult(roas)}, cada venda gerada por esse anúncio está dando PREJUÍZO na prática, mesmo aparecendo venda no relatório.`;
        funnelStage = "custo";
      } else if (roas < breakEvenRoas * 1.3) {
        roasStatus = "atencao";
        roasExplain = `ROAS real (${mult(roas)}) está acima do equilíbrio (${mult(breakEvenRoas)}), mas com pouca margem de folga — qualquer aumento de custo do anúncio ou do frete pode virar prejuízo.`;
        funnelStage = "custo";
      } else {
        roasStatus = "boa";
        roasExplain = `ROAS real (${mult(roas)}) folgado acima do equilíbrio (${mult(breakEvenRoas)}) pra esse produto — esse anúncio está gerando lucro de verdade, não só faturamento. Bom candidato a aumentar o orçamento.`;
        funnelStage = "saudavel";
      }
    } else if (roas != null) {
      // Sem custo do produto cadastrado — cai pro critério genérico (ROAS > 1x).
      if (roas < 1) {
        roasStatus = "ruim";
        roasExplain = `ROAS ${mult(roas)} — esse anúncio está gastando mais do que a venda que ele gerou (sem nem contar o custo de produção). Cadastre o custo do produto pra eu calcular o ROAS de equilíbrio real.`;
        funnelStage = "custo";
      } else if (roas < 2) {
        roasStatus = "atencao";
        roasExplain = `ROAS ${mult(roas)} — só olhando faturamento parece positivo, mas sem o custo do produto cadastrado não dá pra saber se sobra lucro de verdade. Cadastre o SKU pra um diagnóstico exato.`;
        funnelStage = "custo";
      } else {
        roasStatus = "boa";
        roasExplain = `ROAS ${mult(roas)} — bom sinal de faturamento. Cadastre o custo do produto (SKU casado) pra eu confirmar se isso também é lucro real.`;
        funnelStage = "saudavel";
      }
    }
  }
  metrics.push({
    key: "roas",
    label: breakEvenRoas != null ? "ROAS real vs. equilíbrio" : "ROAS",
    value: mult(roas),
    status: roasStatus,
    explanation: roasExplain,
  });

  // Veredito geral: prioriza a etapa do funil mais "de trás pra frente" que estiver ruim
  // (impressão > criativo/CTR > página/conversão > checkout > custo), já que resolver uma
  // etapa de trás sem resolver uma da frente não adianta.
  let overallStatus: MetricStatus = "boa";
  let overallSummary = "Anúncio saudável — sem gargalo claro nas métricas disponíveis.";

  if (impressions === 0) {
    overallStatus = "ruim";
    overallSummary = "Anúncio sem alcance — não está sendo exibido. Revise status, lance e orçamento antes de qualquer outra coisa.";
    funnelStage = "alcance";
  } else if (ctrStatus === "ruim") {
    overallStatus = "ruim";
    overallSummary = "Gargalo no CRIATIVO: pouca gente clica. Foto de capa e preço exibido precisam de ajuste antes de investir mais.";
    funnelStage = "criativo";
  } else if (convStatus === "ruim") {
    overallStatus = "ruim";
    overallSummary = "Gargalo na PÁGINA DO PRODUTO: o anúncio traz clique, mas a decisão de compra trava. Revise preço final, fotos e avaliações.";
    funnelStage = "pagina";
  } else if (metrics.find((m) => m.key === "cart")?.status === "ruim") {
    overallStatus = "ruim";
    overallSummary = "Gargalo no CHECKOUT: gente coloca no carrinho e desiste. Revise frete e prazo de entrega.";
    funnelStage = "checkout";
  } else if (roasStatus === "ruim") {
    overallStatus = "ruim";
    overallSummary =
      funnelStage === "custo" && breakEvenRoas != null
        ? "O funil está funcionando (gente clica, converte, compra) mas o CUSTO não fecha: o anúncio está pagando a conta, não gerando lucro. Considere reduzir o lance ou pausar."
        : "ROAS abaixo de 1x — o anúncio está no prejuízo direto.";
  } else if ([ctrStatus, convStatus, roasStatus].includes("atencao")) {
    overallStatus = "atencao";
    overallSummary = "Anúncio no caminho certo, mas com folga apertada em algum ponto do funil — veja os detalhes abaixo.";
  }

  return { overallStatus, overallSummary, funnelStage, lowSample, breakEvenRoas, metrics };
}
