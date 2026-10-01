"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, Settings2, ChevronDown, ExternalLink, ClipboardCopy, Check, Calculator } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useProductsStore } from "@/store/productsStore";
import {
  computeRow,
  parseMarginSheetXlsx,
  buildMarginSheetXlsxBlob,
  marginRowFullName,
  DEFAULT_MARGIN_PARAMS,
  type MarginRow,
  type MarginParams,
  type ComputedMarginRow,
} from "@/lib/shopeeMarginSheet";
import {
  fetchMarginRows,
  upsertMarginRowsFromImport,
  updateMarginRowCosts,
  fetchMarginParams,
  saveMarginParams,
} from "@/lib/supabaseMarginSheet";
import {
  SHOPEE_MARGIN_SHEET_PROMPT_COWORK,
  SHOPEE_MARGIN_SHEET_PROMPT_AGENT,
} from "@/lib/shopeeMarginSheetPrompts";

const PROMPT_BUTTONS = [
  { key: "cowork", label: "Prompt p/ Claude Cowork", prompt: SHOPEE_MARGIN_SHEET_PROMPT_COWORK },
  { key: "agent", label: "Prompt p/ Modo Agente", prompt: SHOPEE_MARGIN_SHEET_PROMPT_AGENT },
].filter((p): p is { key: string; label: string; prompt: string } => !!p.prompt);

function formatBRL(v: number | null) {
  return v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function formatPct(v: number | null) {
  return v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
function margemTone(pct: number | null, alvo: number): string {
  if (pct == null) return "text-slate-500";
  if (pct < 0) return "text-rose-400";
  if (pct < alvo / 100) return "text-amber-300";
  return "text-emerald-400";
}

export default function MargemShopeePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setPendingProductName = useCalculatorStore((s) => s.setPendingProductName);
  const { products, hydrateFromStorage } = useProductsStore();
  const [rows, setRows] = useState<MarginRow[]>([]);
  const [params, setParams] = useState<MarginParams>(DEFAULT_MARGIN_PARAMS);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [showParams, setShowParams] = useState(false);
  const [savingCell, setSavingCell] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  async function handleCopyPrompt(key: string, prompt: string) {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedPrompt(key);
      setTimeout(() => setCopiedPrompt((c) => (c === key ? null : c)), 2000);
    } catch {
      setImportMsg("Não consegui copiar pro clipboard — copie manualmente.");
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchMarginRows(user.id), fetchMarginParams(user.id)]).then(([r, p]) => {
      if (cancelled) return;
      setRows(r);
      setParams(p);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  // Custo já calculado em /products (via o botão "Calcular custo" dessa mesma página,
  // que salva com o nome "Produto — Variação") — usado como fallback automático pra
  // linhas sem custo de produção preenchido manualmente.
  const productCostByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      if (typeof p.totalCost === "number" && Number.isFinite(p.totalCost)) map.set(p.name, p.totalCost);
    }
    return map;
  }, [products]);

  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r] as const)), [rows]);

  function pulledCustoFor(r: Pick<MarginRow, "produto" | "variacao" | "custoProducao">): number | null {
    if (r.custoProducao != null) return null;
    return productCostByName.get(marginRowFullName(r)) ?? null;
  }

  function pulledEmbalagemFor(r: Pick<MarginRow, "embalagemOutros">): number | null {
    if (r.embalagemOutros != null) return null;
    return params.embalagemPadrao || null;
  }

  const computedRows: ComputedMarginRow[] = useMemo(
    () =>
      rows.map((r) => {
        const pulledCusto = pulledCustoFor(r);
        const pulledEmbalagem = pulledEmbalagemFor(r);
        const effective: MarginRow = {
          ...r,
          custoProducao: r.custoProducao ?? pulledCusto,
          embalagemOutros: r.embalagemOutros ?? pulledEmbalagem,
        };
        return computeRow(effective, params);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, params, productCostByName],
  );

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const parsed = await parseMarginSheetXlsx(file);
      if (parsed.rows.length === 0) {
        setImportMsg("Não encontrei linhas de produto nesse arquivo — confira se é o formato certo (aba 'Precos e Margem').");
        return;
      }
      const result = await upsertMarginRowsFromImport(user.id, parsed.rows);
      if (!result.ok) {
        setImportMsg(result.message);
        return;
      }
      if (parsed.params) {
        // embalagemPadrao não existe no formato da planilha (é só um preset do app) —
        // preserva o que o usuário já tinha configurado em vez de resetar pra 0.
        const merged: MarginParams = { ...parsed.params, embalagemPadrao: params.embalagemPadrao };
        await saveMarginParams(user.id, merged);
        setParams(merged);
      }
      const fresh = await fetchMarginRows(user.id);
      setRows(fresh);
      setImportMsg(
        `Importado: ${result.imported} produto(s) novo(s), ${result.updated} atualizado(s) (custo e embalagem preenchidos foram mantidos).`,
      );
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Falha ao ler o arquivo.");
    } finally {
      setImporting(false);
    }
  }

  function handleExport() {
    const blob = buildMarginSheetXlsxBlob(computedRows, params);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `precos_e_margem_shopee_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCalcularCusto(r: MarginRow) {
    setPendingProductName(marginRowFullName(r));
    router.push("/calculadoras/custo");
  }

  async function handleCostChange(row: MarginRow, field: "custoProducao" | "embalagemOutros", raw: string) {
    if (!row.id) return;
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    const next = rows.map((r) => (r.id === row.id ? { ...r, [field]: Number.isFinite(value as number) ? value : null } : r));
    setRows(next);
    setSavingCell(`${row.id}-${field}`);
    const updated = next.find((r) => r.id === row.id)!;
    await updateMarginRowCosts(row.id, updated.custoProducao, updated.embalagemOutros);
    setSavingCell(null);
  }

  async function handleParamChange(patch: Partial<MarginParams>) {
    if (!user) return;
    const next = { ...params, ...patch };
    setParams(next);
    await saveMarginParams(user.id, next);
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Preço e Margem — Shopee
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Importe a planilha de preços lidos da Shopee (cadastro/promoção/relâmpago), preencha o custo de
          produção e embalagem por produto, e acompanhe a margem real — sem precisar editar planilha toda vez.
        </p>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/40 hover:text-cyan-200">
          <Upload className="h-4 w-4" />
          {importing ? "Importando..." : "Importar planilha (.xlsx)"}
          <input type="file" accept=".xlsx" className="hidden" disabled={importing} onChange={(e) => void handleImport(e)} />
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={rows.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-emerald-500/40 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
          Exportar planilha
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {PROMPT_BUTTONS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => void handleCopyPrompt(p.key, p.prompt)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-violet-500/40 hover:text-violet-200"
            >
              {copiedPrompt === p.key ? <Check className="h-4 w-4 text-emerald-400" /> : <ClipboardCopy className="h-4 w-4" />}
              {copiedPrompt === p.key ? "Copiado!" : p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowParams((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-200 transition hover:border-slate-500"
          >
            <Settings2 className="h-4 w-4" />
            Parâmetros
            <ChevronDown className={`h-4 w-4 transition-transform ${showParams ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {importMsg && (
        <p className="rounded-lg border border-slate-800 bg-slate-900/50 px-2 py-2 text-xs text-slate-300">{importMsg}</p>
      )}

      {showParams && (
        <div className="glass-panel rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <p className="mb-3 text-sm font-semibold text-slate-100">Taxas, imposto e cupons (igual aba "Parâmetros" da planilha)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <ParamField label="Comissão (%)" value={params.comissaoPercent} onChange={(v) => handleParamChange({ comissaoPercent: v })} />
            <ParamField label="Taxa transação (%)" value={params.taxaTransacaoPercent} onChange={(v) => handleParamChange({ taxaTransacaoPercent: v })} />
            <ParamField label="Imposto (%)" value={params.impostoPercent} onChange={(v) => handleParamChange({ impostoPercent: v })} />
            <ParamField label="Taxa fixa (R$)" value={params.taxaFixa} onChange={(v) => handleParamChange({ taxaFixa: v })} />
            <ParamField label="Margem alvo (%)" value={params.margemAlvoPercent} onChange={(v) => handleParamChange({ margemAlvoPercent: v })} />
            <ParamField
              label="Embalagem+outros padrão (R$)"
              value={params.embalagemPadrao}
              onChange={(v) => handleParamChange({ embalagemPadrao: v })}
            />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Preenche automaticamente a coluna "Embalagem+outros" em linhas sem valor próprio
            (marcadas com o selo "preset" na tabela) — digitar um valor na linha sempre tem prioridade.
          </p>
          <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-slate-500">Faixas de cupom da loja</p>
          <div className="space-y-1">
            {params.cupomTiers.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-300">
                <span className="w-32">Pedido ≥ {formatBRL(t.min)}</span>
                <span>→ desconto {formatBRL(t.desconto)}</span>
                {t.label && <span className="text-slate-500">({t.label})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel min-w-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">
            Nenhum produto ainda — importe sua planilha de preços pra começar.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1500px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500">
                  <th className="sticky left-0 z-10 bg-slate-950 px-2 py-2 font-medium">Produto</th>
                  <th className="px-2 py-2 font-medium">Variação</th>
                  <th className="bg-amber-500/10 px-2 py-2 text-right font-medium text-amber-200">Custo produção</th>
                  <th className="bg-amber-500/10 px-2 py-2 text-right font-medium text-amber-200">Embalagem+outros</th>
                  <th className="px-2 py-2 text-right font-medium">Cadastro</th>
                  <th className="px-2 py-2 text-right font-medium">Promoção</th>
                  <th className="px-2 py-2 text-right font-medium">Cliente paga (sem relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Lucro (sem relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Margem (sem relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Relâmpago</th>
                  <th className="px-2 py-2 text-right font-medium">Cliente paga (com relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Lucro (com relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Margem (com relâmpago)</th>
                  <th className="px-2 py-2 text-right font-medium">Preço p/ margem alvo</th>
                  <th className="px-2 py-2 text-right font-medium">Promoção p/ margem alvo</th>
                  <th className="px-2 py-2 font-medium">Alerta</th>
                  <th className="px-2 py-2 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {computedRows.map((r) => {
                  const raw = rowsById.get(r.id) ?? r;
                  const pulledCusto = pulledCustoFor(raw);
                  const pulledEmbalagem = pulledEmbalagemFor(raw);
                  return (
                  <tr key={r.id} className="border-b border-slate-800/60">
                    <td className="sticky left-0 z-10 max-w-[160px] bg-slate-950 px-2 py-2 text-slate-200">
                      <span className="inline-flex max-w-full items-center gap-1">
                        <span className="truncate" title={r.produto}>
                          {r.produto}
                        </span>
                        {r.link && (
                          <a
                            href={r.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Abrir anúncio na Shopee"
                            className="shrink-0 text-cyan-400 hover:text-cyan-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </span>
                    </td>
                    <td className="max-w-[140px] truncate px-2 py-2 text-slate-400" title={r.variacao}>
                      {r.variacao || "—"}
                    </td>
                    <td className="bg-amber-500/5 px-2 py-1.5">
                      <input
                        key={`custo-${r.id}-${raw.custoProducao ?? pulledCusto ?? "x"}`}
                        type="text"
                        inputMode="decimal"
                        defaultValue={raw.custoProducao ?? pulledCusto ?? ""}
                        onBlur={(e) => handleCostChange(raw, "custoProducao", e.target.value)}
                        placeholder="R$/un"
                        title={pulledCusto != null ? "Puxado automaticamente do produto já precificado em Produtos" : undefined}
                        className={`w-16 rounded border bg-slate-900/80 px-1.5 py-1 text-right outline-none ${
                          pulledCusto != null
                            ? "border-cyan-500/30 text-cyan-100 focus:border-cyan-400"
                            : "border-amber-500/30 text-amber-100 focus:border-amber-400"
                        }`}
                      />
                      {pulledCusto != null && <span className="ml-1 text-[9px] text-cyan-400">auto</span>}
                      {savingCell === `${r.id}-custoProducao` && <span className="ml-1 text-[9px] text-slate-500">salvando…</span>}
                    </td>
                    <td className="bg-amber-500/5 px-2 py-1.5">
                      <input
                        key={`embalagem-${r.id}-${raw.embalagemOutros ?? pulledEmbalagem ?? "x"}`}
                        type="text"
                        inputMode="decimal"
                        defaultValue={raw.embalagemOutros ?? pulledEmbalagem ?? ""}
                        onBlur={(e) => handleCostChange(raw, "embalagemOutros", e.target.value)}
                        placeholder="R$/un"
                        title={pulledEmbalagem != null ? "Preenchido pelo preset de Embalagem+outros (Parâmetros)" : undefined}
                        className={`w-16 rounded border bg-slate-900/80 px-1.5 py-1 text-right outline-none ${
                          pulledEmbalagem != null
                            ? "border-cyan-500/30 text-cyan-100 focus:border-cyan-400"
                            : "border-amber-500/30 text-amber-100 focus:border-amber-400"
                        }`}
                      />
                      {pulledEmbalagem != null && <span className="ml-1 text-[9px] text-cyan-400">preset</span>}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-300">{formatBRL(r.precoCadastro)}</td>
                    <td className="px-2 py-2 text-right text-blue-300">{formatBRL(r.precoPromocaoRede)}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{formatBRL(r.clientePagaSemRelampago)}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{formatBRL(r.lucroSemRelampago)}</td>
                    <td className={`px-2 py-2 text-right font-medium ${margemTone(r.margemSemRelampagoPct, params.margemAlvoPercent)}`}>
                      {formatPct(r.margemSemRelampagoPct)}
                    </td>
                    <td className="px-2 py-2 text-right text-blue-300">{formatBRL(r.precoRelampago)}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{formatBRL(r.clientePagaComRelampago)}</td>
                    <td className="px-2 py-2 text-right text-slate-200">{formatBRL(r.lucroComRelampago)}</td>
                    <td className={`px-2 py-2 text-right font-medium ${margemTone(r.margemComRelampagoPct, params.margemAlvoPercent)}`}>
                      {formatPct(r.margemComRelampagoPct)}
                    </td>
                    <td className="px-2 py-2 text-right text-slate-300">{formatBRL(r.clienteDevePagarParaMargemAlvo)}</td>
                    <td className="px-2 py-2 text-right text-slate-300">{formatBRL(r.precoPromocaoParaMargemAlvo)}</td>
                    <td className="max-w-[200px] px-2 py-2 text-rose-300">{r.alerta}</td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => handleCalcularCusto(r)}
                        title="Abre a calculadora de custo 3D com o nome deste produto já preenchido"
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-500/40 hover:text-cyan-200"
                      >
                        <Calculator className="h-3.5 w-3.5" />
                        Calcular custo
                      </button>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ParamField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-slate-500">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = Number(local.replace(",", "."));
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-500/40"
      />
    </label>
  );
}
