"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ExternalLink, Upload } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import {
  importPerformanceReport,
  importAdsReport,
  importKeywordReport,
  importGmvMaxReport,
  importAdGroupReport,
  fetchLatestImport,
  fetchPerformanceProductRows,
  fetchAdsRows,
  fetchKeywordRows,
  fetchGmvMaxRows,
  type ShopeeImportSummary,
  type ShopeeReportType,
  type PerformanceProductRow,
  type AdsRowSummary,
  type KeywordRowSummary,
  type GmvMaxRowSummary,
} from "@/lib/supabaseShopeeReports";
import { analyzeAd, gmvMaxRowToAdsRow } from "@/lib/shopeeAdsAnalysis";
import { ShopeeAdDiagnosisCard } from "@/components/reports/ShopeeAdDiagnosisCard";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number | null) {
  return value == null ? "—" : `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

function roasTone(roas: number | null): string {
  if (roas == null) return "text-slate-400";
  if (roas < 1) return "text-rose-400";
  if (roas < 1.5) return "text-amber-300";
  return "text-emerald-400";
}

/** Só estes dois já têm modelo real confirmado pra montar o importador. */
const IMPORTABLE_REPORT_TYPE: Record<string, ShopeeReportType> = {
  "performance-produto": "performance_produto",
  ads: "shopee_ads",
};

type Tier = 1 | 2 | 3;

type Report = {
  id: string;
  tier: Tier;
  title: string;
  crumbs: string;
  urls: { label: string; href: string }[];
  traz: string;
  uso: string;
  note?: string;
};

const TIER_LABEL: Record<Tier, string> = {
  1: "Essenciais",
  2: "Ajuste fino",
  3: "Contexto",
};

const REPORTS: Report[] = [
  {
    id: "renda",
    tier: 1,
    title: "Minha Renda",
    crumbs: "Finanças → Minha Renda",
    urls: [{ label: "Abrir Minha Renda", href: "https://seller.shopee.com.br/portal/finance/income" }],
    traz: "Extrato pedido a pedido com todas as taxas descontadas pela Shopee: comissão por categoria, taxa de transação/pagamento, taxa de serviço, e o valor líquido efetivamente repassado.",
    uso: "É a única fonte com o preço líquido real por venda — sem ele, o simulador de margem trabalha com a comissão \"de tabela\" e erra sempre que a loja está em algum programa promocional que altera a taxa.",
    note: "A Shopee pode pedir sua senha de login de novo pra abrir essa tela — é a verificação normal deles pra dados financeiros, não é nada errado.",
  },
  {
    id: "performance-produto",
    tier: 1,
    title: "Performance do Produto",
    crumbs: 'Dados → Informações Gerenciais → Produto → Performance do Produto → botão "Exportar dados"',
    urls: [{ label: "Abrir Performance do Produto", href: "https://seller.shopee.com.br/datacenter/product/performance" }],
    traz: "Por SKU, num período escolhido: vendas em R$, impressões, cliques, CTR, taxa de conversão de pedidos, número de pedidos e unidades vendidas.",
    uso: "Insumo de volume × conversão por preço praticado — dá pra testar elasticidade, comparando produtos com preços parecidos e vendo qual conversão sustenta um preço maior sem perder venda.",
  },
  {
    id: "ads",
    tier: 1,
    title: "Shopee Ads",
    crumbs: 'Central de Marketing → Shopee Ads → tabela "Desempenho de Anúncios de Produtos" → botão "Exportar dados"',
    urls: [{ label: "Abrir Shopee Ads", href: "https://seller.shopee.com.br/portal/marketing/pas/index" }],
    traz: "Impressões, cliques, CTR, pedidos, itens vendidos, vendas, investimento em R$ e ROAS — por anúncio/produto.",
    uso: "O custo de aquisição por produto é o item mais esquecido em calculadora de preço. Sem somar o investimento em ads ao custo, a margem calculada fica inflada nos produtos que dependem de anúncio pra vender.",
  },
  {
    id: "pedidos",
    tier: 2,
    title: "Meus Pedidos",
    crumbs: 'Pedido → Meus Pedidos → aba "Todos" → botão "Exportar" (topo direito, com seletor de período)',
    urls: [{ label: "Abrir Meus Pedidos", href: "https://seller.shopee.com.br/portal/sale/order" }],
    traz: "ID do pedido, preço pago pelo comprador, produto/variação, canal de envio e status, por pedido individual.",
    uso: "Reconcilia o preço de vitrine com o preço efetivamente pago depois de cupom e desconto no checkout — os dois nem sempre coincidem, e é esse valor pago que deveria alimentar a margem real.",
  },
  {
    id: "retornos",
    tier: 2,
    title: "Retornos e Pedidos Cancelados",
    crumbs: 'Pedido → Retornos e Pedidos cancelados → abas Devolução e reembolso / Cancelamentos / Falhas de entrega → botão "Exportar" em cada aba',
    urls: [{ label: "Abrir Retornos e Cancelados", href: "https://seller.shopee.com.br/portal/sale/returnrefundcancel" }],
    traz: "Motivo da devolução ou cancelamento, valor reembolsado e status da solicitação.",
    uso: "Taxa de devolução por produto corrói margem de um jeito que não aparece na venda bruta — vira um fator de correção: produtos com devolução alta precisam de preço com folga extra.",
  },
  {
    id: "vendas",
    tier: 2,
    title: "Visão Geral das Vendas",
    crumbs: 'Dados → Informações Gerenciais → Vendas → botão "Exportar dados"',
    urls: [{ label: "Abrir Visão de Vendas", href: "https://seller.shopee.com.br/datacenter/sales/overview" }],
    traz: "Vendas, visitantes, compradores e taxas de conversão ao longo do tempo — agregado da loja, não por SKU.",
    uso: "Contexto de tendência e sazonalidade pra ajustar o preço-alvo por período (datas comemorativas, campanhas Shopee); não é granular o bastante pra decidir preço de um produto específico.",
  },
  {
    id: "trafego",
    tier: 3,
    title: "Tráfego da loja",
    crumbs: 'Dados → Informações Gerenciais → Tráfego → botão "Exportar dados"',
    urls: [{ label: "Abrir Tráfego da loja", href: "https://seller.shopee.com.br/datacenter/traffic/overview" }],
    traz: "Origem dos acessos — busca, feed, anúncio pago, afiliados — e visitantes/visualizações por origem.",
    uso: "Sinaliza se um produto depende de tráfego pago pra vender, o que aumenta o custo real além do que a Shopee Ads sozinha já mostra por campanha.",
  },
  {
    id: "marketing",
    tier: 3,
    title: "Marketing",
    crumbs: 'Dados → Informações Gerenciais → Marketing → sub-abas Desconto / Oferta Relâmpago / Cupom / Live → botão "Exportar dados"',
    urls: [{ label: "Abrir Marketing", href: "https://seller.shopee.com.br/datacenter/marketing/discount" }],
    traz: "Desempenho de cada mecanismo promocional: alcance, vendas geradas e desconto concedido.",
    uso: 'Mede o efeito de desconto pontual na margem — útil pra simular "quanto posso descontar numa campanha sem furar o piso de preço".',
  },
  {
    id: "diagnostico",
    tier: 3,
    title: "Diagnóstico do Produto",
    crumbs: "Dados → Informações Gerenciais → Produto → Tráfego do Produto / Diagnóstico do Produto → botão \"Exportar dados\"",
    urls: [
      { label: "Abrir Tráfego do Produto", href: "https://seller.shopee.com.br/datacenter/product/traffic" },
      { label: "Abrir Diagnóstico do Produto", href: "https://seller.shopee.com.br/datacenter/product/diagnosis" },
    ],
    traz: "Sinais qualitativos por produto: taxa de rejeição, itens visitados, alertas de listagem (GTIN, elegibilidade a programas).",
    uso: "Mais útil pra copy e imagem do anúncio do que pra decidir preço — vale como aba secundária de diagnóstico.",
  },
  {
    id: "conta",
    tier: 3,
    title: "Saúde da Conta",
    crumbs: "Dados → Desempenho da Conta — não exporta arquivo, é um painel de leitura",
    urls: [{ label: "Abrir Desempenho da Conta", href: "https://seller.shopee.com.br/portal/accounthealth" }],
    traz: "Métricas de saúde da loja: taxa de não cumprimento, atraso no envio, penalidades e pontos de melhoria.",
    uso: "Não alimenta preço diretamente, mas cancelamento ou atraso alto costuma forçar desconto defensivo pra recuperar posição no algoritmo — vale como alerta cruzado, não como dado de entrada.",
  },
];

export default function RelatoriosShopeePage() {
  const [activeId, setActiveId] = useState(REPORTS[0].id);
  const active = REPORTS.find((r) => r.id === activeId) ?? REPORTS[0];
  const user = useAuthStore((s) => s.user);
  const reportType = IMPORTABLE_REPORT_TYPE[activeId];

  const [summary, setSummary] = useState<ShopeeImportSummary | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [perfRows, setPerfRows] = useState<PerformanceProductRow[]>([]);
  const [adsRows, setAdsRows] = useState<AdsRowSummary[]>([]);

  // Os outros 3 exports de Shopee Ads (opcionais, melhoram o diagnóstico quando presentes).
  const [keywordSummary, setKeywordSummary] = useState<ShopeeImportSummary | null>(null);
  const [keywordRows, setKeywordRows] = useState<KeywordRowSummary[]>([]);
  const [keywordImporting, setKeywordImporting] = useState(false);
  const [gmvMaxSummary, setGmvMaxSummary] = useState<ShopeeImportSummary | null>(null);
  const [gmvMaxRows, setGmvMaxRows] = useState<GmvMaxRowSummary[]>([]);
  const [gmvMaxImporting, setGmvMaxImporting] = useState(false);
  const [adGroupSummary, setAdGroupSummary] = useState<ShopeeImportSummary | null>(null);
  const [adGroupImporting, setAdGroupImporting] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);

  useEffect(() => {
    setImportMsg(null);
    setSummary(null);
    setPerfRows([]);
    setAdsRows([]);
    setKeywordSummary(null);
    setKeywordRows([]);
    setGmvMaxSummary(null);
    setGmvMaxRows([]);
    setAdGroupSummary(null);
    setAnalysisStarted(false);
    if (!reportType || !user) return;
    let cancelled = false;
    fetchLatestImport(user.id, reportType).then((s) => {
      if (!cancelled) setSummary(s);
    });
    if (reportType === "shopee_ads") {
      fetchLatestImport(user.id, "shopee_ads_keyword").then((s) => {
        if (!cancelled) setKeywordSummary(s);
      });
      fetchLatestImport(user.id, "shopee_ads_gmvmax").then((s) => {
        if (!cancelled) setGmvMaxSummary(s);
      });
      fetchLatestImport(user.id, "shopee_ads_group").then((s) => {
        if (!cancelled) setAdGroupSummary(s);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [reportType, user]);

  useEffect(() => {
    if (!summary) return;
    let cancelled = false;
    if (reportType === "performance_produto") {
      fetchPerformanceProductRows(summary.id).then((rows) => {
        if (!cancelled) setPerfRows(rows);
      });
    } else if (reportType === "shopee_ads") {
      fetchAdsRows(summary.id).then((rows) => {
        if (!cancelled) setAdsRows(rows);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [summary, reportType]);

  useEffect(() => {
    if (!keywordSummary) return;
    let cancelled = false;
    fetchKeywordRows(keywordSummary.id).then((rows) => {
      if (!cancelled) setKeywordRows(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [keywordSummary]);

  useEffect(() => {
    if (!gmvMaxSummary) return;
    let cancelled = false;
    fetchGmvMaxRows(gmvMaxSummary.id).then((rows) => {
      if (!cancelled) setGmvMaxRows(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [gmvMaxSummary]);

  async function handleKeywordFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setKeywordImporting(true);
    const result = await importKeywordReport(user.id, file);
    setKeywordImporting(false);
    if (result.ok) setKeywordSummary(result.summary);
    else setImportMsg(result.message);
  }

  async function handleGmvMaxFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setGmvMaxImporting(true);
    const result = await importGmvMaxReport(user.id, file);
    setGmvMaxImporting(false);
    if (result.ok) setGmvMaxSummary(result.summary);
    else setImportMsg(result.message);
  }

  async function handleAdGroupFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setAdGroupImporting(true);
    const result = await importAdGroupReport(user.id, file);
    setAdGroupImporting(false);
    if (result.ok) setAdGroupSummary(result.summary);
    else setImportMsg(result.message);
  }

  const keywordsByItemId = useMemo(() => {
    const map = new Map<string, KeywordRowSummary[]>();
    for (const k of keywordRows) {
      if (!k.itemId) continue;
      const arr = map.get(k.itemId) ?? [];
      arr.push(k);
      map.set(k.itemId, arr);
    }
    return map;
  }, [keywordRows]);

  const combinedAdsRows = useMemo(() => {
    if (gmvMaxRows.length === 0) return adsRows;
    // A linha única "GMV Max da Loja" do relatório geral vira N cartões (um por produto
    // real dentro da campanha automática), usando o relatório detalhado do GMV Max.
    const withoutStoreTotal = adsRows.filter((r) => r.adName !== "GMV Max da Loja");
    return [...withoutStoreTotal, ...gmvMaxRows.map(gmvMaxRowToAdsRow)];
  }, [adsRows, gmvMaxRows]);

  const perfTotals = useMemo(() => {
    if (perfRows.length === 0) return null;
    return {
      salesPaid: perfRows.reduce((s, r) => s + (r.salesPaid ?? 0), 0),
      unitsPaid: perfRows.reduce((s, r) => s + (r.unitsPaid ?? 0), 0),
      ordersPaid: perfRows.reduce((s, r) => s + (r.ordersPaid ?? 0), 0),
      withSales: perfRows.filter((r) => (r.salesPaid ?? 0) > 0).length,
    };
  }, [perfRows]);

  const adsDiagnoses = useMemo(
    () => combinedAdsRows.map((r) => ({ row: r, diagnosis: analyzeAd(r) })),
    [combinedAdsRows],
  );

  const adsTotals = useMemo(() => {
    if (combinedAdsRows.length === 0) return null;
    const expenses = combinedAdsRows.reduce((s, r) => s + (r.expenses ?? 0), 0);
    const gmv = combinedAdsRows.reduce((s, r) => s + (r.gmv ?? 0), 0);
    return {
      expenses,
      gmv,
      roas: expenses > 0 ? gmv / expenses : null,
      // "No prejuízo" real: usa o ROAS de equilíbrio calculado com o custo do produto
      // quando disponível, não só ROAS < 1x (que subestima quem tem margem apertada).
      losing: adsDiagnoses.filter(
        (d) => d.diagnosis.metrics.find((m) => m.key === "roas")?.status === "ruim" && (d.row.expenses ?? 0) > 0,
      ).length,
    };
  }, [combinedAdsRows, adsDiagnoses]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user || !reportType) return;
    setImporting(true);
    setImportMsg(null);
    const importFn = reportType === "shopee_ads" ? importAdsReport : importPerformanceReport;
    const result = await importFn(user.id, file);
    setImporting(false);
    if (!result.ok) {
      setImportMsg(result.message);
      return;
    }
    setSummary(result.summary);
    setImportMsg(
      `Importado: ${result.summary.rowCount} linha(s), ${result.summary.matchedCount} casada(s) com produtos cadastrados.`,
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Relatórios Shopee
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Acesso rápido aos relatórios do Central do Vendedor que alimentam sua margem real —
          escolha uma aba e abra a tela de exportação direto na Shopee.
        </p>
      </div>

      {([1, 2, 3] as Tier[]).map((tier) => (
        <div key={tier}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {TIER_LABEL[tier]}
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORTS.filter((r) => r.tier === tier).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveId(r.id)}
                className={
                  r.id === activeId
                    ? "rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-sm font-medium text-cyan-200"
                    : "rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-600 hover:text-slate-200"
                }
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
        <p className="text-sm font-semibold text-slate-50">{active.title}</p>
        <p className="mt-1 font-mono text-xs text-slate-500">{active.crumbs}</p>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Traz</p>
            <p className="mt-1 text-slate-300">{active.traz}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Uso no seu preço</p>
            <p className="mt-1 text-slate-300">{active.uso}</p>
          </div>
        </div>

        {active.note ? (
          <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {active.note}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {active.urls.map((u) => (
            <a
              key={u.href}
              href={u.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              <ExternalLink className="h-4 w-4" />
              {u.label}
            </a>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-800 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Importar dados desse relatório
          </p>

          {reportType ? (
            <>
              {summary ? (
                <p className="mt-2 text-sm text-slate-300">
                  Última importação:{" "}
                  <span className="font-mono text-xs text-slate-400">{summary.fileName}</span> —{" "}
                  {summary.rowCount} linha(s), {summary.matchedCount} casada(s) com produtos
                  {summary.periodStart && summary.periodEnd
                    ? ` (período ${summary.periodStart} a ${summary.periodEnd})`
                    : ""}
                  .
                </p>
              ) : (
                <p className="mt-2 text-sm text-slate-500">Nenhum arquivo importado ainda.</p>
              )}

              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-200">
                <Upload className="h-4 w-4" />
                {importing ? "Importando..." : "Escolher arquivo (.xlsx ou .csv)"}
                <input
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  disabled={importing}
                  onChange={(e) => void handleFile(e)}
                />
              </label>

              {importMsg ? <p className="mt-2 text-xs text-cyan-300">{importMsg}</p> : null}
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Ainda não temos um modelo real desse relatório pra montar a importação — assim que
              você conseguir exportar um, manda que eu adiciono aqui também.
            </p>
          )}
        </div>
      </div>

      {reportType === "performance_produto" && perfTotals ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
          <p className="text-sm font-semibold text-slate-50">Como seus produtos performaram</p>
          <p className="mt-1 text-xs text-slate-500">
            A partir do arquivo importado — {summary?.periodStart && summary?.periodEnd ? `período ${summary.periodStart} a ${summary.periodEnd}` : "sem período identificado"}.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Vendido</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">{formatBRL(perfTotals.salesPaid)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Unidades</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{perfTotals.unitsPaid}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Pedidos pagos</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">{perfTotals.ordersPaid}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Venderam algo</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">
                {perfTotals.withSales}/{perfRows.length}
              </p>
            </div>
          </div>

          {perfRows.length - perfTotals.withSales > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {perfRows.length - perfTotals.withSales} produto(s) tiveram 0 venda nesse período — candidatos a
              revisar preço, foto ou parar de anunciar.
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="pb-2 font-medium">Produto</th>
                  <th className="pb-2 font-medium">SKU</th>
                  <th className="pb-2 text-right font-medium">Vendido</th>
                  <th className="pb-2 text-right font-medium">Unid.</th>
                  <th className="pb-2 text-right font-medium">Conversão</th>
                </tr>
              </thead>
              <tbody>
                {perfRows.map((r) => (
                  <tr key={r.itemId ?? r.productName} className="border-t border-slate-800/60">
                    <td className="max-w-[220px] truncate py-2 pr-2 text-slate-200" title={r.productName ?? ""}>
                      {r.productName ?? "—"}
                      {!r.matchedProductId ? (
                        <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] text-slate-500">
                          sem SKU casado
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-2 font-mono text-slate-400">{r.sku ?? "—"}</td>
                    <td className="py-2 pr-2 text-right text-slate-200">
                      {r.salesPaid != null ? formatBRL(r.salesPaid) : "—"}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-300">{r.unitsPaid ?? "—"}</td>
                    <td className="py-2 text-right text-slate-300">{formatPct(r.conversionRatePaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {reportType === "shopee_ads" ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
          <p className="text-sm font-semibold text-slate-50">Aprofundar a análise (opcional)</p>
          <p className="mt-1 text-xs text-slate-400">
            Além do relatório geral acima, a Shopee exporta mais 3 arquivos em "Exportar dados" que deixam o
            diagnóstico mais preciso. Importe quantos quiser (ou nenhum) e clique em "Iniciar análise".
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs font-medium text-slate-200">Palavra-chave / locação</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {keywordSummary ? `${keywordSummary.rowCount} linha(s) importada(s)` : "Não importado ainda"}
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200">
                <Upload className="h-3 w-3" />
                {keywordImporting ? "Importando..." : "Escolher arquivo"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={keywordImporting}
                  onChange={(e) => void handleKeywordFile(e)}
                />
              </label>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs font-medium text-slate-200">GMV Max detalhado</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {gmvMaxSummary ? `${gmvMaxSummary.rowCount} linha(s) importada(s)` : "Não importado ainda"}
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200">
                <Upload className="h-3 w-3" />
                {gmvMaxImporting ? "Importando..." : "Escolher arquivo"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={gmvMaxImporting}
                  onChange={(e) => void handleGmvMaxFile(e)}
                />
              </label>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <p className="text-xs font-medium text-slate-200">Grupos de anúncios</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {adGroupSummary ? `${adGroupSummary.rowCount} linha(s) importada(s)` : "Não importado ainda"}
              </p>
              <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-[11px] text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200">
                <Upload className="h-3 w-3" />
                {adGroupImporting ? "Importando..." : "Escolher arquivo"}
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  disabled={adGroupImporting}
                  onChange={(e) => void handleAdGroupFile(e)}
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            disabled={!summary}
            onClick={() => setAnalysisStarted(true)}
            className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {summary ? "Iniciar análise" : "Importe o relatório geral de anúncios primeiro"}
          </button>
        </div>
      ) : null}

      {reportType === "shopee_ads" && analysisStarted && adsTotals ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]">
          <p className="text-sm font-semibold text-slate-50">Como seus anúncios performaram</p>
          <p className="mt-1 text-xs text-slate-500">
            A partir do(s) arquivo(s) importado(s) — {summary?.periodStart && summary?.periodEnd ? `período ${summary.periodStart} a ${summary.periodEnd}` : "sem período identificado"}
            {gmvMaxRows.length > 0 ? " · GMV Max detalhado por produto" : ""}
            {keywordRows.length > 0 ? " · palavra-chave/locação incluída" : ""}.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">Investido</p>
              <p className="mt-1 text-lg font-semibold text-rose-400">{formatBRL(adsTotals.expenses)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">GMV gerado</p>
              <p className="mt-1 text-lg font-semibold text-emerald-400">{formatBRL(adsTotals.gmv)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">ROAS geral</p>
              <p className={`mt-1 text-lg font-semibold ${roasTone(adsTotals.roas)}`}>
                {adsTotals.roas != null ? `${adsTotals.roas.toFixed(2)}x` : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-500">No prejuízo</p>
              <p className="mt-1 text-lg font-semibold text-slate-50">
                {adsTotals.losing}/{combinedAdsRows.length}
              </p>
            </div>
          </div>

          {adsTotals.losing > 0 ? (
            <p className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {adsTotals.losing} anúncio(s) estão no prejuízo de verdade (ROAS abaixo do que cobre custo de ads + custo
              de produção) — abra o diagnóstico de cada um abaixo pra ver o motivo exato.
            </p>
          ) : (
            <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
              Nenhum anúncio no prejuízo nesse período — todos geram mais venda do que custam.
            </p>
          )}

          {adGroupSummary && adGroupSummary.rowCount === 0 && (
            <p className="mt-3 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-[11px] text-slate-500">
              Nenhum grupo de anúncio configurado nessa conta — normal se você usa só GMV Max (lance automático).
            </p>
          )}

          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Diagnóstico por anúncio — clique pra abrir
            </p>
            {adsDiagnoses.map(({ row: r }, i) => (
              <ShopeeAdDiagnosisCard
                key={`${r.itemId ?? r.adName}-${i}`}
                row={r}
                keywords={r.itemId ? keywordsByItemId.get(r.itemId) : undefined}
              />
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-center text-xs text-slate-500">
        Caminhos e nomes de botão são da estrutura do Central do Vendedor Shopee em 08/2026 — a
        Shopee pode mudar isso a qualquer momento.
      </p>
    </div>
  );
}
