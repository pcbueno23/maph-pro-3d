"use client";

import { useCallback, useMemo, useState } from "react";
import { Copy, Check, ExternalLink, Store } from "lucide-react";
import { InputPanel } from "@/components/calculator/InputPanel";
import { CostBreakdownChart } from "@/components/charts/CostBreakdownChart";
import { useCalculator } from "@/hooks/useCalculator";
import { LAB_PRINTING_SUPPLY_FALLBACK_ID } from "@/lib/calculatorLabDefaults";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcBaseUrl(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  try {
    return new URL(t).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** URL da rota `/app` de cada calculadora Vite publicada (inalterada no código delas). */
function marketplaceCalculatorUrl(baseRaw: string): URL {
  const u = new URL(baseRaw);
  const path = u.pathname.replace(/\/$/, "");
  u.pathname = path.endsWith("/app") ? path : `${path}/app`;
  return u;
}

type MarketplaceTab = "custo" | "ml" | "shopee";

export default function PrecificacaoMarketplacesPage() {
  const { form, results } = useCalculator();
  const [tab, setTab] = useState<MarketplaceTab>("custo");
  const [copied, setCopied] = useState(false);

  const mlBase = calcBaseUrl(process.env.NEXT_PUBLIC_CALC_ML_APP_URL);
  const shopeeBase = calcBaseUrl(process.env.NEXT_PUBLIC_CALC_SHOPEE_APP_URL);

  const mlIframeSrc = mlBase ? marketplaceCalculatorUrl(mlBase).toString() : null;
  const shopeeIframeSrc = shopeeBase ? marketplaceCalculatorUrl(shopeeBase).toString() : null;

  const unitCost = useMemo(() => {
    if (!results) return null;
    const adj = results.custoTotalAjustado;
    if (typeof adj === "number" && Number.isFinite(adj)) return Math.max(0, adj);
    return Math.max(0, Number(results.totalCost ?? 0));
  }, [results]);

  const costChartItems = useMemo(() => {
    if (!results) return [];
    return [
      { name: "Filamento", value: results.filamentCost, color: "#22d3ee" },
      { name: "Energia", value: results.energyCost, color: "#a855f7" },
      { name: "Depreciação + fixos", value: results.depreciationCost, color: "#10b981" },
      { name: "Embalagem", value: results.packagingCost, color: "#f97316" },
      { name: "Mão de obra", value: results.maoDeObraCusto ?? 0, color: "#eab308" },
    ].filter((x) => x.value > 0.0001);
  }, [results]);

  const copyUnitCost = useCallback(async () => {
    if (unitCost == null) return;
    try {
      await navigator.clipboard.writeText(unitCost.toFixed(2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [unitCost]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-100 md:text-xl">
              Custos 3D e calculadoras ML / Shopee
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-400">
              Aqui você calcula o custo da impressão no Maph Pro 3D. As calculadoras de precificação
              do Mercado Livre e da Shopee são as mesmas já publicadas por você — apenas embutidas
              nesta tela (iframe), sem alterar o código delas. Use{" "}
              <span className="text-slate-300">copiar custo</span> e cole no campo de custo da
              calculadora, se quiser.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Se o painel da calculadora não aparecer, o host delas pode estar bloqueando iframe
              (CSP / X-Frame-Options). Nesse caso use &quot;Abrir em nova aba&quot; ou ajuste o
              deploy para permitir <code className="text-slate-400">frame-ancestors</code> do
              domínio do Maph Pro 3D.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
            <Store className="h-4 w-4 shrink-0" />
            <span>Licença das calculadoras: fluxo original (chave), dentro do iframe.</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {(
          [
            ["custo", "1. Custo 3D"] as const,
            ["ml", "2. Calculadora ML"] as const,
            ["shopee", "3. Calculadora Shopee"] as const,
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              tab === id
                ? "bg-slate-800 text-cyan-300 shadow-neon-cyan"
                : "text-slate-400 hover:bg-slate-900/80 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "custo" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-4">
            <InputPanel
              form={form}
              hidePricingSection
              materialSupplyFallbackId={LAB_PRINTING_SUPPLY_FALLBACK_ID}
            />
          </div>

          <div className="flex flex-col gap-4">
            {unitCost != null ? (
              <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/60 p-5 shadow-neon-cyan">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Custo total por unidade
                </p>
                <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-300">
                  {fmtBRL(unitCost)}
                </p>
                <button
                  type="button"
                  onClick={() => void copyUnitCost()}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-500/50"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copied ? "Copiado" : "Copiar valor (para colar na calculadora)"}
                </button>
                {results?.maoDeObraCusto != null && results.maoDeObraCusto > 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Inclui rateio de mão de obra conforme o formulário.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-4 text-center text-sm text-slate-400">
                Preencha material, tempo e custos para ver o total por unidade.
              </div>
            )}

            {costChartItems.length > 0 ? (
              <CostBreakdownChart items={costChartItems} />
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "ml" ? (
        <div className="space-y-3">
          {!mlIframeSrc ? (
            <p className="text-sm text-slate-400">
              Configure <code className="text-slate-300">NEXT_PUBLIC_CALC_ML_APP_URL</code> com a URL
              pública da sua calculadora (ex.: <code className="text-slate-300">https://…/app</code>
              ).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={mlIframeSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir calculadora ML em nova aba
                </a>
              </div>
              <iframe
                title="Calculadora Mercado Livre"
                src={mlIframeSrc}
                className="h-[min(85vh,900px)] w-full rounded-2xl border border-slate-800 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </>
          )}
        </div>
      ) : null}

      {tab === "shopee" ? (
        <div className="space-y-3">
          {!shopeeIframeSrc ? (
            <p className="text-sm text-slate-400">
              Configure{" "}
              <code className="text-slate-300">NEXT_PUBLIC_CALC_SHOPEE_APP_URL</code> com a URL
              pública da sua calculadora (ex.: <code className="text-slate-300">https://…/app</code>
              ).
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={shopeeIframeSrc}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir calculadora Shopee em nova aba
                </a>
              </div>
              <iframe
                title="Calculadora Shopee"
                src={shopeeIframeSrc}
                className="h-[min(85vh,900px)] w-full rounded-2xl border border-slate-800 bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
