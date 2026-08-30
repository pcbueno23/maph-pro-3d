"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSalesStore, type Sale } from "@/store/salesStore";
import type { SupplyCategory, SupplyItem } from "@/types";
import type { InventoryItem } from "@/store/inventoryStore";
import { listSupplies } from "@/lib/supabaseProduction";
import { fetchUserInventory } from "@/lib/supabaseUserData";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { computeProductUnitCost } from "@/lib/productionCost";
import jsPDF from "jspdf";

const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  filament: "Filamento",
  resin: "Resina",
  ink: "Tinta",
  packaging: "Embalagem",
  tool: "Ferramenta",
  part: "Peça",
  other: "Outro",
};

const HEATMAP_DAYS = 91;

/** Converte um ISO (UTC) pro dia de calendário local — evita virar um dia por causa do fuso. */
function localDayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type HeatmapCell = { key: string; value: number; label: string; weekday: number };

function buildHeatmapWeeks(sales: Sale[]): (HeatmapCell | null)[][] {
  const byDay = new Map<string, number>();
  for (const s of sales) {
    const key = localDayKey(s.date);
    byDay.set(key, (byDay.get(key) ?? 0) + s.revenue);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: HeatmapCell[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ key, value: byDay.get(key) ?? 0, label: d.toLocaleDateString("pt-BR"), weekday: d.getDay() });
  }

  // Alinha a primeira semana à segunda-feira, preenchendo com células vazias.
  const mondayOffset = (days[0].weekday + 6) % 7;
  const padded: (HeatmapCell | null)[] = [...Array.from({ length: mondayOffset }, () => null), ...days];
  const weeks: (HeatmapCell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
}

function heatTone(value: number, max: number): string {
  if (value <= 0) return "bg-slate-900/70";
  const ratio = max > 0 ? value / max : 0;
  if (ratio > 0.75) return "bg-emerald-500";
  if (ratio > 0.5) return "bg-emerald-600/80";
  if (ratio > 0.25) return "bg-emerald-700/70";
  return "bg-emerald-800/60";
}

type AbcPeriod = "30d" | "90d" | "all";
type AbcRow = { key: string; productName: string; sku: string; revenue: number; pctOfTotal: number; cumPct: number; cls: "A" | "B" | "C" };

function buildAbc(sales: Sale[]): AbcRow[] {
  const byProduct = new Map<string, { productName: string; sku: string; revenue: number }>();
  for (const s of sales) {
    const key = s.itemId || s.sku || s.productName;
    const existing = byProduct.get(key);
    if (existing) existing.revenue += s.revenue;
    else byProduct.set(key, { productName: s.productName, sku: s.sku, revenue: s.revenue });
  }
  const total = Array.from(byProduct.values()).reduce((sum, p) => sum + p.revenue, 0);
  const sorted = Array.from(byProduct.entries())
    .map(([key, p]) => ({ key, ...p }))
    .sort((a, b) => b.revenue - a.revenue);
  let cum = 0;
  return sorted.map((p) => {
    const pct = total > 0 ? (p.revenue / total) * 100 : 0;
    cum += pct;
    const cls: AbcRow["cls"] = cum <= 80 ? "A" : cum <= 95 ? "B" : "C";
    return { ...p, pctOfTotal: pct, cumPct: cum, cls };
  });
}

const ABC_CLASS_TONE: Record<AbcRow["cls"], string> = {
  A: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  B: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  C: "bg-slate-500/15 text-slate-400 border-slate-600/40",
};

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  /** Custo unitário atual por productId (BOM + energia/dep quando houver ficha técnica). */
  const [productUnitCosts, setProductUnitCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sales = useSalesStore((s) => s.sales);
  const hydrateSales = useSalesStore((s) => s.hydrateFromStorage);
  const [abcPeriod, setAbcPeriod] = useState<AbcPeriod>("30d");

  useEffect(() => {
    hydrateSales();
  }, [hydrateSales]);

  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(sales), [sales]);
  const heatmapMax = useMemo(
    () => Math.max(...heatmapWeeks.flat().map((c) => c?.value ?? 0), 1),
    [heatmapWeeks],
  );

  const abcSales = useMemo(() => {
    if (abcPeriod === "all") return sales;
    const days = abcPeriod === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return sales.filter((s) => new Date(s.date) >= cutoff);
  }, [sales, abcPeriod]);
  const abcRows = useMemo(() => buildAbc(abcSales), [abcSales]);
  const abcCounts = useMemo(
    () => ({
      A: abcRows.filter((r) => r.cls === "A").length,
      B: abcRows.filter((r) => r.cls === "B").length,
      C: abcRows.filter((r) => r.cls === "C").length,
    }),
    [abcRows],
  );

  useEffect(() => {
    if (!user?.id) {
      setSupplies([]);
      setItems([]);
      setProductUnitCosts({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      listSupplies(user.id),
      fetchUserInventory(user.id),
      fetchUserProducts(user.id),
    ])
      .then(async ([suppliesData, inventoryData, productsData]) => {
        if (cancelled) return;
        setSupplies(suppliesData ?? []);
        const inv = inventoryData ?? [];
        setItems(inv);
        const products = productsData ?? [];
        const pmap = new Map(products.map((p) => [p.id, p] as const));
        const pids = [...new Set(inv.map((i) => i.productId))];
        const costs: Record<string, number> = {};
        await Promise.all(
          pids.map(async (pid) => {
            const p = pmap.get(pid);
            if (!p) return;
            try {
              const u = await computeProductUnitCost(user.id, p);
              costs[pid] = u.totalCost;
            } catch {
              costs[pid] = p.totalCost ?? inv.find((x) => x.productId === pid)?.productionCost ?? 0;
            }
          }),
        );
        if (!cancelled) setProductUnitCosts(costs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filamentSupplies = supplies.filter((s) => s.category === "filament");
  const totalFilamentGrams = filamentSupplies.reduce((acc, s) => {
    if (s.unit === "kg") return acc + s.stockQty * 1000;
    if (s.unit === "g") return acc + s.stockQty;
    return acc;
  }, 0);
  const totalFilamentValue = filamentSupplies.reduce(
    (acc, s) => acc + s.stockQty * s.unitCost,
    0,
  );

  const totalSuppliesByKind = supplies.reduce(
    (acc, s) => {
      const value = s.stockQty * s.unitCost;
      if (s.category === "filament") acc.filament += value;
      else if (s.category === "ink") acc.ink += value;
      else acc.other += value;
      return acc;
    },
    { filament: 0, ink: 0, other: 0 },
  );

  const totalPiecesCost = useMemo(
    () =>
      items.reduce(
        (acc, i) =>
          acc + (productUnitCosts[i.productId] ?? i.productionCost ?? 0) * i.quantity,
        0,
      ),
    [items, productUnitCosts],
  );
  const totalPiecesValueShopee = items.reduce(
    (acc, i) => acc + (i.suggestedPriceShopee ?? i.price) * i.quantity,
    0,
  );
  const totalPiecesValueML = items.reduce(
    (acc, i) => acc + (i.suggestedPriceML ?? i.price) * i.quantity,
    0,
  );

  const totalSuppliesValue =
    totalSuppliesByKind.filament + totalSuppliesByKind.ink + totalSuppliesByKind.other;
  const totalInvested = totalSuppliesValue + totalPiecesCost;

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const piecesRows = useMemo(() => {
    return items.map((i) => {
      const priceShopee = i.suggestedPriceShopee ?? i.price;
      const priceML = i.suggestedPriceML ?? i.price;
      const worstPerUnit = Math.min(priceShopee, priceML);
      const unitCost = productUnitCosts[i.productId] ?? i.productionCost ?? 0;
      const marginPercent =
        worstPerUnit > 0
          ? ((worstPerUnit - unitCost) / worstPerUnit) * 100
          : (i.marginPercent ?? 0);
      return {
        ...i,
        resolvedUnitCost: unitCost,
        priceShopee,
        priceML,
        worstPerUnit,
        worstTotal: worstPerUnit * i.quantity,
        displayMarginPercent: marginPercent,
      };
    });
  }, [items, productUnitCosts]);

  const belowMinimumSupplies = useMemo(
    () =>
      supplies
        .map((s) => {
          const stockQty = Number(s.stockQty ?? 0);
          const minQty = Number(s.minStockQty ?? 0);
          return {
            ...s,
            stockQty,
            minQty,
            deficitQty: Math.max(0, minQty - stockQty),
          };
        })
        .filter((s) => s.minQty > 0 && s.stockQty < s.minQty),
    [supplies],
  );

  const totalEstimatedPurchase = useMemo(
    () =>
      belowMinimumSupplies.reduce(
        (acc, s) => acc + s.deficitQty * Number(s.unitCost ?? 0),
        0,
      ),
    [belowMinimumSupplies],
  );

  function handleGenerateLowStockPdf() {
    if (belowMinimumSupplies.length === 0) return;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const today = new Date().toLocaleDateString("pt-BR");

    doc.setFontSize(14);
    doc.text("Lista de compra de insumos", 14, 16);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${today}`, 14, 22);
    doc.text(
      `Itens abaixo do mínimo: ${belowMinimumSupplies.length} | Custo estimado: ${formatBRL(totalEstimatedPurchase)}`,
      14,
      28,
    );

    let y = 36;
    belowMinimumSupplies.forEach((s, idx) => {
      if (y > 276) {
        doc.addPage();
        y = 16;
      }
      doc.setFontSize(10);
      doc.text(`${idx + 1}. ${s.name}`, 14, y);
      y += 5;
      doc.setFontSize(9);
      doc.text(
        `Categoria: ${SUPPLY_CATEGORY_LABEL[s.category]}  |  Unidade: ${s.unit}`,
        18,
        y,
      );
      y += 4.5;
      doc.text(
        `Estoque atual: ${s.stockQty.toLocaleString("pt-BR")}  |  Mínimo: ${s.minQty.toLocaleString("pt-BR")}  |  Comprar: ${s.deficitQty.toLocaleString("pt-BR")}`,
        18,
        y,
      );
      y += 4.5;
      doc.text(`Custo/un: ${formatBRL(s.unitCost ?? 0)}  |  Subtotal: ${formatBRL(s.deficitQty * Number(s.unitCost ?? 0))}`, 18, y);
      y += 6;
    });

    const fileDate = new Date().toISOString().slice(0, 10);
    doc.save(`lista-compra-insumos-${fileDate}.pdf`);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Relatórios
      </h1>
      <p className="text-xs text-slate-500">
        Custo das peças em estoque usa a ficha técnica atual (materiais/BOM + impressora e tempo, quando
        cadastrados), não só o valor gravado no lançamento.
      </p>
      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/60 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      {loading && (
        <p className="text-sm text-slate-400">Carregando insumos e peças produzidas...</p>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Curva de vendas — últimos {HEATMAP_DAYS} dias
        </p>
        {sales.length === 0 ? (
          <p className="mt-3 text-slate-400">Nenhuma venda registrada ainda.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {heatmapWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) =>
                    cell ? (
                      <div
                        key={cell.key}
                        title={`${cell.label}: ${formatBRL(cell.value)}`}
                        className={`h-3 w-3 rounded-sm ${heatTone(cell.value, heatmapMax)}`}
                      />
                    ) : (
                      <div key={di} className="h-3 w-3" />
                    ),
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
              <span>Menos</span>
              <div className="h-3 w-3 rounded-sm bg-slate-900/70" />
              <div className="h-3 w-3 rounded-sm bg-emerald-800/60" />
              <div className="h-3 w-3 rounded-sm bg-emerald-700/70" />
              <div className="h-3 w-3 rounded-sm bg-emerald-600/80" />
              <div className="h-3 w-3 rounded-sm bg-emerald-500" />
              <span>Mais</span>
              <span className="ml-2">Intensidade por faturamento do dia.</span>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Análise ABC — produtos por faturamento
          </p>
          <div className="flex gap-1">
            {(["30d", "90d", "all"] as AbcPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setAbcPeriod(p)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-medium ${
                  abcPeriod === p
                    ? "bg-cyan-500/15 text-cyan-200"
                    : "text-slate-400 hover:bg-slate-900/60"
                }`}
              >
                {p === "30d" ? "30 dias" : p === "90d" ? "90 dias" : "Tudo"}
              </button>
            ))}
          </div>
        </div>

        {abcRows.length === 0 ? (
          <p className="mt-3 text-slate-400">Nenhuma venda nesse período.</p>
        ) : (
          <>
            <p className="mt-2 text-[11px] text-slate-500">
              <span className="text-emerald-300">A</span> = até 80% do faturamento acumulado (
              {abcCounts.A} produto{abcCounts.A === 1 ? "" : "s"}) · <span className="text-amber-300">B</span> = até 95%
              ({abcCounts.B}) · <span className="text-slate-400">C</span> = resto ({abcCounts.C}).
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Produto</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Faturamento</th>
                    <th className="px-2 py-2">% do total</th>
                    <th className="px-2 py-2">% acumulado</th>
                    <th className="px-2 py-2">Classe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {abcRows.map((r) => (
                    <tr key={r.key} className="hover:bg-slate-900/60">
                      <td className="px-2 py-2 text-slate-100">{r.productName}</td>
                      <td className="px-2 py-2 text-slate-300">{r.sku || "-"}</td>
                      <td className="px-2 py-2 text-slate-200">{formatBRL(r.revenue)}</td>
                      <td className="px-2 py-2 text-slate-300">{r.pctOfTotal.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-slate-300">{r.cumPct.toFixed(1)}%</td>
                      <td className="px-2 py-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ABC_CLASS_TONE[r.cls]}`}>
                          {r.cls}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Insumos — valor em estoque
          </p>
          <ul className="space-y-1 text-slate-200">
            <li className="flex justify-between">
              <span>Filamentos</span>
              <span>
                {totalSuppliesByKind.filament.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Tintas</span>
              <span>
                {totalSuppliesByKind.ink.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Outros</span>
              <span>
                {totalSuppliesByKind.other.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="mt-2 flex justify-between border-t border-slate-800 pt-2 font-semibold">
              <span>Total insumos</span>
              <span>
                {(totalSuppliesByKind.filament +
                  totalSuppliesByKind.ink +
                  totalSuppliesByKind.other
                ).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
          </ul>

          <div className="mt-4 rounded-xl bg-slate-900/70 p-3 text-xs text-slate-200">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Filamentos — saldo em gramas
            </p>
            <p>
              Total em filamentos:{" "}
              <span className="font-semibold text-slate-50">
                {totalFilamentGrams.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}{" "}
                g
              </span>
            </p>
            <p>
              Valor equivalente:{" "}
              <span className="font-semibold text-slate-50">
                {totalFilamentValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Peças produzidas — valor em estoque
          </p>
          <ul className="space-y-1 text-slate-200">
            <li className="flex justify-between">
              <span>Custo de produção em estoque</span>
              <span>
                {totalPiecesCost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Valor potencial (Shopee)</span>
              <span>
                {totalPiecesValueShopee.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Valor potencial (ML)</span>
              <span>
                {totalPiecesValueML.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="mt-2 flex justify-between border-t border-slate-800 pt-2 font-semibold">
              <span>Lucro bruto potencial (pior canal)</span>
              <span>
                {(Math.min(totalPiecesValueShopee, totalPiecesValueML) -
                  totalPiecesCost
                ).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Capital empregado no negócio
        </p>
        <div className="mt-2 grid gap-2 text-slate-200 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Insumos (matéria-prima)</p>
            <p className="text-base font-semibold text-slate-50">
              {totalSuppliesValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Custo de produção em peças prontas</p>
            <p className="text-base font-semibold text-slate-50">
              {totalPiecesCost.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total empregado (insumos + produção)</p>
            <p className="text-base font-semibold text-emerald-400">
              {totalInvested.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Lista de insumos (tudo que você tem)
            </p>
            <button
              type="button"
              onClick={handleGenerateLowStockPdf}
              disabled={belowMinimumSupplies.length === 0}
              className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Gerar PDF de compra (abaixo do mínimo)
            </button>
          </div>
          {belowMinimumSupplies.length > 0 ? (
            <p className="mt-2 text-[11px] text-amber-300">
              {belowMinimumSupplies.length} item(ns) abaixo do mínimo. Custo estimado de reposição:{" "}
              <span className="font-semibold">{formatBRL(totalEstimatedPurchase)}</span>
            </p>
          ) : (
            <p className="mt-2 text-[11px] text-slate-500">
              Nenhum item abaixo do estoque mínimo no momento.
            </p>
          )}
          {supplies.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhum insumo cadastrado.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Insumo</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Unidade</th>
                    <th className="px-2 py-2">Custo/un</th>
                    <th className="px-2 py-2">Estoque</th>
                    <th className="px-2 py-2">Mínimo</th>
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {supplies.map((s) => {
                    const stockQty = Number(s.stockQty ?? 0);
                    const minQty = s.minStockQty ?? 0;
                    const stockIsEmpty = stockQty <= 0;
                    const lowStock = minQty > 0 && stockQty <= minQty;
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-2 text-slate-100">{s.name}</td>
                        <td className="px-2 py-2 text-slate-300">{SUPPLY_CATEGORY_LABEL[s.category]}</td>
                        <td className="px-2 py-2 text-slate-300">{s.unit}</td>
                        <td className="px-2 py-2 text-slate-200">{formatBRL(s.unitCost)}</td>
                        <td className={`px-2 py-2 ${lowStock || stockIsEmpty ? "text-amber-300" : "text-slate-200"}`}>
                          {stockQty.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-slate-300">
                          {Number(minQty).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-slate-200">
                          {formatBRL(stockQty * (s.unitCost ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lista de peças produzidas (tudo que você tem)
          </p>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhuma peça produzida cadastrada. Use a aba Produtos para lançar estoque.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Peça</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Qtd</th>
                    <th className="px-2 py-2">Preço Shopee</th>
                    <th className="px-2 py-2">Preço ML</th>
                    <th className="px-2 py-2">Custo</th>
                    <th className="px-2 py-2">% Margem</th>
                    <th className="px-2 py-2">Valor (pior canal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {piecesRows.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-900/60">
                      <td className="px-2 py-2 text-slate-100">{i.name}</td>
                      <td className="px-2 py-2 text-slate-300">{i.sku || "-"}</td>
                      <td className="px-2 py-2 text-slate-200">{i.quantity}</td>
                      <td className="px-2 py-2 text-slate-200">{formatBRL(i.priceShopee)}</td>
                      <td className="px-2 py-2 text-slate-200">{formatBRL(i.priceML)}</td>
                      <td className="px-2 py-2 text-slate-200">
                        {formatBRL(i.resolvedUnitCost)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            i.displayMarginPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {i.displayMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-200">
                        {formatBRL(i.worstTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

