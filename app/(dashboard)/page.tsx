"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  ClipboardList,
  Printer,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Printer as PrinterType, Product, ProductionOrder, Sale } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { useSalesStore } from "@/store/salesStore";
import { listPrinters, listProductionOrders } from "@/lib/supabaseProduction";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Line,
  LineChart,
  CartesianGrid,
  Legend,
} from "recharts";

type RangeOption = "today" | "7d" | "30d";

const ORDER_STATUS_ORDER: ProductionOrder["status"][] = [
  "new",
  "preparing",
  "queued",
  "printing",
  "post_processing",
  "ready_to_ship",
  "done",
  "cancelled",
];

const STATUS_LABELS: Record<ProductionOrder["status"], string> = {
  new: "Recebida",
  preparing: "Em preparação",
  queued: "Aguardando",
  printing: "Em impressão",
  post_processing: "Acabamento",
  ready_to_ship: "Pronto p/ envio",
  done: "Concluída",
  cancelled: "Cancelada",
};

const STATUS_COLORS: Record<ProductionOrder["status"], string> = {
  new: "#60a5fa", // blue
  preparing: "#34d399", // emerald
  queued: "#fbbf24", // amber
  printing: "#22c55e", // green
  post_processing: "#a78bfa", // violet
  ready_to_ship: "#38bdf8", // sky
  done: "#10b981", // emerald-600
  cancelled: "#fb7185", // rose
};

const CHART_SERIES_COLORS = {
  shopee: "#22d3ee", // cyan
  ml: "#60a5fa", // blue
  profit: "#34d399", // green
};

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function startOfDayLocal(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDaysLocal(d: Date, days: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function dayKeyLocal(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function prettyDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function parseOrderDate(order: ProductionOrder) {
  // Preferimos o dueDate quando existir, pois costuma representar melhor o "dia operacional".
  if (order.dueDate) {
    return new Date(`${order.dueDate}T00:00:00`);
  }
  return new Date(order.createdAt);
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { sales, hydrateFromStorage } = useSalesStore();

  const [range, setRange] = useState<RangeOption>("7d");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (!user) return;
    let alive = true;

    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [ord, prts, prods] = await Promise.all([
          listProductionOrders(user.id),
          listPrinters(user.id),
          fetchUserProducts(user.id),
        ]);
        if (!alive) return;
        setOrders(ord);
        setPrinters(prts);
        setProducts(prods);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Falha ao carregar dashboard operacional.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const rangeMeta = useMemo(() => {
    const now = new Date();
    const toDate = now;
    const fromDaysBack = range === "today" ? 0 : range === "7d" ? 6 : 29;
    const fromDate = startOfDayLocal(addDaysLocal(now, -fromDaysBack));
    const label = range === "today" ? "Hoje" : range === "7d" ? "Últimos 7 dias" : "Últimos 30 dias";
    return { fromDate, toDate, label };
  }, [range]);

  const filteredOrders = useMemo(() => {
    const { fromDate, toDate } = rangeMeta;
    return orders.filter((o) => {
      const d = parseOrderDate(o);
      return d >= fromDate && d <= toDate;
    });
  }, [orders, rangeMeta]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);
  const printerById = useMemo(() => new Map(printers.map((p) => [p.id, p] as const)), [printers]);

  const ordersByStatus = useMemo(() => {
    const counts: Record<ProductionOrder["status"], number> = {
      new: 0,
      preparing: 0,
      queued: 0,
      printing: 0,
      post_processing: 0,
      ready_to_ship: 0,
      done: 0,
      cancelled: 0,
    };
    for (const o of filteredOrders) counts[o.status] += 1;
    return counts;
  }, [filteredOrders]);

  const inProgressOrders = useMemo(() => {
    // Consideramos "em andamento" tudo que não é concluído/cancelado.
    return (
      ordersByStatus.new +
      ordersByStatus.preparing +
      ordersByStatus.queued +
      ordersByStatus.printing +
      ordersByStatus.post_processing +
      ordersByStatus.ready_to_ship
    );
  }, [ordersByStatus]);

  const doneOrders = ordersByStatus.done;
  const cancelledOrders = ordersByStatus.cancelled;

  const totalOrderQty = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.quantity ?? 0), 0),
    [filteredOrders],
  );

  const ordersStatusChartData = useMemo(() => {
    return ORDER_STATUS_ORDER.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: ordersByStatus[status],
    }));
  }, [ordersByStatus]);

  const printersUsage = useMemo(() => {
    const map = new Map<string, { printerId: string | null; name: string; orderCount: number; qty: number }>();
    for (const o of filteredOrders) {
      const printerId = o.printerId ?? null;
      const key = printerId ?? "__none__";
      const existing =
        map.get(key) ??
        ({
          printerId,
          name: printerId ? printerById.get(printerId)?.name ?? "Impressora" : "Sem impressora",
          orderCount: 0,
          qty: 0,
        });
      map.set(key, existing);
      existing.orderCount += 1;
      existing.qty += o.quantity ?? 0;
    }
    return [...map.values()].sort((a, b) => b.orderCount - a.orderCount || b.qty - a.qty);
  }, [filteredOrders, printerById]);

  const activePrintersCount = useMemo(() => {
    const set = new Set<string>();
    for (const p of printersUsage) if (p.printerId) set.add(p.printerId);
    return set.size;
  }, [printersUsage]);

  const rangeSales = useMemo(() => {
    const { fromDate, toDate } = rangeMeta;
    const list = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= fromDate && d <= toDate;
    });
    const totalsByChannel = list.reduce(
      (acc, s) => {
        if (s.channel === "Shopee") {
          acc.shopeeRevenue += s.revenue;
          acc.shopeeProfit += s.netProfit;
        } else {
          acc.mlRevenue += s.revenue;
          acc.mlProfit += s.netProfit;
        }
        return acc;
      },
      {
        shopeeRevenue: 0,
        shopeeProfit: 0,
        mlRevenue: 0,
        mlProfit: 0,
      },
    );
    const totalRevenue = totalsByChannel.shopeeRevenue + totalsByChannel.mlRevenue;
    const totalProfit = totalsByChannel.shopeeProfit + totalsByChannel.mlProfit;
    const totalOrders = list.length;

    return { list, totalsByChannel, totalRevenue, totalProfit, totalOrders };
  }, [sales, rangeMeta]);

  const salesDays = useMemo(() => {
    const daysBack = range === "today" ? 0 : range === "7d" ? 6 : 29;
    const from = startOfDayLocal(addDaysLocal(rangeMeta.toDate, -daysBack));
    const days: Date[] = [];
    for (let i = 0; i <= daysBack; i++) days.push(addDaysLocal(from, i));
    return days;
  }, [range, rangeMeta.toDate]);

  const salesByDay = useMemo(() => {
    const revenueByDay: Record<string, { shopee: number; ml: number; profit: number }> = {};
    for (const d of salesDays) {
      revenueByDay[dayKeyLocal(d)] = { shopee: 0, ml: 0, profit: 0 };
    }
    for (const s of rangeSales.list) {
      const d = new Date(s.date);
      const k = dayKeyLocal(d);
      if (!revenueByDay[k]) continue;
      if (s.channel === "Shopee") revenueByDay[k].shopee += s.revenue;
      else revenueByDay[k].ml += s.revenue;
      revenueByDay[k].profit += s.netProfit;
    }
    return salesDays.map((d) => {
      const k = dayKeyLocal(d);
      return {
        day: prettyDayLabel(d),
        key: k,
        shopee: revenueByDay[k]?.shopee ?? 0,
        ml: revenueByDay[k]?.ml ?? 0,
        profit: revenueByDay[k]?.profit ?? 0,
      };
    });
  }, [rangeSales.list, salesDays]);

  const recentOrders = useMemo(() => {
    const list = [...filteredOrders].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    return list.slice(0, 8);
  }, [filteredOrders]);

  const recentSales = useMemo(() => {
    const sorted = [...rangeSales.list].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return sorted.slice(0, 8);
  }, [rangeSales.list]);

  const filterButton = (key: RangeOption, label: string) => {
    const active = range === key;
    return (
      <button
        key={key}
        type="button"
        onClick={() => setRange(key)}
        className={[
          "rounded-xl border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
          active
            ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-200"
            : "border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 hover:border-slate-700",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Dashboard operacional
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Período: <strong className="font-semibold text-slate-200">{rangeMeta.label}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {filterButton("today", "Hoje")}
          {filterButton("7d", "7 dias")}
          {filterButton("30d", "30 dias")}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
          Carregando KPIs...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-900/50 bg-rose-950/20 p-4 text-sm text-rose-200">
          {error}
        </div>
      ) : (
        <>
          {/* Cards principais */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Ordens em andamento
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{inProgressOrders}</p>
                <ClipboardList className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Qtde peças: <span className="font-semibold text-slate-200">{totalOrderQty}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Concluídas
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-emerald-400">{doneOrders}</p>
                <Clock className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Canceladas: <span className="font-semibold text-rose-300">{cancelledOrders}</span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Impressoras ativas
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{activePrintersCount}</p>
                <Printer className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                (com ordens no período)
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Faturamento no período
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">
                  {formatBRL(rangeSales.totalRevenue)}
                </p>
                <Wallet className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Lucro líquido:{" "}
                <span className="font-semibold text-emerald-400">
                  {formatBRL(rangeSales.totalProfit)}
                </span>
              </p>
            </div>
          </div>

          {/* Gráficos (ordens + impressoras) */}
          <div className="grid gap-3 lg:grid-cols-3 md:grid-cols-2">
            <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Ordens por status
                </p>
                <span className="text-[11px] text-slate-500">
                  Total: <span className="font-semibold text-slate-200">{filteredOrders.length}</span>
                </span>
              </div>

              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordersStatusChartData} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1f2937" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#1f2937",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                      formatter={(value: any) => [Number(value).toFixed(0), "Qtd."]}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {ordersStatusChartData.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Uso das impressoras
                </p>
                <span className="text-[11px] text-slate-500">
                  Top: <span className="font-semibold text-slate-200">{Math.min(6, printersUsage.length)}</span>
                </span>
              </div>

              {printersUsage.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Sem ordens no período.</p>
              ) : (
                <>
                  <div className="mt-3 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={printersUsage.slice(0, 6).map((p) => ({
                          name: p.name,
                          count: p.orderCount,
                        }))}
                        margin={{ left: -10, right: 10 }}
                      >
                        <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1f2937" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "#6b7280" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            borderColor: "#1f2937",
                            borderRadius: 12,
                            fontSize: 11,
                          }}
                          formatter={(value: any) => [Number(value).toFixed(0), "Ordens"]}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                          {printersUsage.slice(0, 6).map((p, idx) => {
                            const palette = ["#22d3ee", "#60a5fa", "#34d399", "#a78bfa", "#fbbf24", "#fb7185"];
                            return <Cell key={`${p.name}-${idx}`} fill={palette[idx % palette.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-slate-800 pt-3 text-xs text-slate-200">
                    {printersUsage.slice(0, 4).map((p) => (
                      <div key={p.printerId ?? "none"} className="flex items-center justify-between">
                        <span className="text-slate-300 truncate max-w-[190px]">{p.name}</span>
                        <span className="font-semibold text-slate-50">
                          {p.orderCount} ord. • {p.qty} pç
                        </span>
                      </div>
                    ))}
                    {printersUsage.length > 4 ? (
                      <p className="text-[11px] text-slate-500">+ {printersUsage.length - 4} outras</p>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Vendas (gráfico) */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Vendas por canal (dia a dia)
                </p>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <ShoppingBag className="h-4 w-4 text-cyan-400" />
                  <span>
                    Vendas: <span className="font-semibold text-slate-200">{rangeSales.totalOrders}</span>
                  </span>
                </div>
              </div>

              <div className="mt-3 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesByDay} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1f2937" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#1f2937",
                        borderRadius: 12,
                        fontSize: 11,
                      }}
                      formatter={(value: any, name: any) => {
                        const v = Number(value) || 0;
                        if (name === "profit") return [formatBRL(v), "Lucro"];
                        return [formatBRL(v), name === "shopee" ? "Shopee" : "Mercado Livre"];
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="shopee" stroke={CHART_SERIES_COLORS.shopee} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ml" stroke={CHART_SERIES_COLORS.ml} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="profit" stroke={CHART_SERIES_COLORS.profit} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-sm">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Shopee</p>
                  <p className="text-slate-200">
                    {formatBRL(rangeSales.totalsByChannel.shopeeRevenue)}{" "}
                    <span className="text-emerald-400">• lucro {formatBRL(rangeSales.totalsByChannel.shopeeProfit)}</span>
                  </p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Mercado Livre</p>
                  <p className="text-slate-200">
                    {formatBRL(rangeSales.totalsByChannel.mlRevenue)}{" "}
                    <span className="text-emerald-400">• lucro {formatBRL(rangeSales.totalsByChannel.mlProfit)}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Últimas ordens
                </p>
                <span className="text-[11px] text-slate-500">
                  Mostrando: <span className="font-semibold text-slate-200">{recentOrders.length}</span>
                </span>
              </div>

              <div className="mt-3 max-h-64 overflow-y-auto">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-2 py-1">Ordem</th>
                      <th className="px-2 py-1">Produto</th>
                      <th className="px-2 py-1">Status</th>
                      <th className="px-2 py-1 text-right">Qtd</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentOrders.map((o) => {
                      const prod = o.productId ? productById.get(o.productId) : undefined;
                      const pName = prod?.name ?? "Produto";
                      const statusColor = STATUS_COLORS[o.status] ?? "#94a3b8";
                      const printerName = o.printerId ? printerById.get(o.printerId)?.name : null;
                      const dueLabel = o.dueDate ? o.dueDate : new Date(o.createdAt).toLocaleDateString("pt-BR");
                      return (
                        <tr key={o.id} className="hover:bg-slate-900/60">
                          <td className="px-2 py-1 text-slate-400">
                            #{o.id.slice(0, 8)}{" "}
                            <span className="text-[11px] text-slate-500 block">{dueLabel}</span>
                          </td>
                          <td className="px-2 py-1 text-slate-100">
                            <div className="truncate max-w-[220px]" title={pName}>
                              {pName}
                            </div>
                            {printerName ? (
                              <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[220px]" title={printerName}>
                                {printerName}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-1">
                            <span className="inline-flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusColor }} />
                              <span className="text-slate-200">{STATUS_LABELS[o.status]}</span>
                            </span>
                          </td>
                          <td className="px-2 py-1 text-right text-slate-200 font-semibold">{o.quantity}</td>
                        </tr>
                      );
                    })}
                    {recentOrders.length === 0 && (
                      <tr>
                        <td className="px-2 py-4 text-center text-xs text-slate-500" colSpan={4}>
                          Sem ordens no período.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-[11px] text-slate-500 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-cyan-400" />
                Dica: use os filtros para comparar gargalos e ritmo operacional.
              </div>
            </div>
          </div>

          {/* Últimas vendas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Últimas vendas
              </p>
              <span className="text-[11px] text-slate-500">
                Mostrando: <span className="font-semibold text-slate-200">{recentSales.length}</span>
              </span>
            </div>

            <div className="mt-3 max-h-64 overflow-y-auto">
              <table className="min-w-full text-left text-[11px]">
                <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-1">Data</th>
                    <th className="px-2 py-1">Produto</th>
                    <th className="px-2 py-1">Canal</th>
                    <th className="px-2 py-1 text-right">Faturamento</th>
                    <th className="px-2 py-1 text-right">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentSales.map((s: Sale) => (
                    <tr key={s.id} className="hover:bg-slate-900/60">
                      <td className="px-2 py-1 text-slate-400">
                        {new Date(s.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-2 py-1 text-slate-100">
                        <div className="truncate max-w-[320px]" title={s.productName}>
                          {s.productName}
                        </div>
                      </td>
                      <td className="px-2 py-1 text-slate-300">{s.channel}</td>
                      <td className="px-2 py-1 text-right text-slate-100">
                        {formatBRL(s.revenue)}
                      </td>
                      <td className="px-2 py-1 text-right text-emerald-400 font-semibold">
                        {formatBRL(s.netProfit)}
                      </td>
                    </tr>
                  ))}
                  {recentSales.length === 0 && (
                    <tr>
                      <td className="px-2 py-4 text-center text-xs text-slate-500" colSpan={5}>
                        Sem vendas no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

