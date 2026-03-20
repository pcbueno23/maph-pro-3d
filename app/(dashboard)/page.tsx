"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  Clock,
  ClipboardList,
  FileSpreadsheet,
  Gauge,
  Package,
  Printer,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type {
  Printer as PrinterType,
  Product,
  ProductionOrder,
  Quote,
  SupplyItem,
} from "@/types";
import { useAuthStore } from "@/store/authStore";
import { useSalesStore } from "@/store/salesStore";
import type { Sale } from "@/store/salesStore";
import type { InventoryItem } from "@/store/inventoryStore";
import {
  listPrinters,
  listProductionOrders,
  listQuotes,
  listSupplies,
} from "@/lib/supabaseProduction";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { fetchUserInventory } from "@/lib/supabaseUserData";
import {
  PRODUCTION_ORDER_STATUS_COLORS,
  PRODUCTION_ORDER_STATUS_DISPLAY_ORDER,
  PRODUCTION_ORDER_STATUS_LABELS,
} from "@/lib/productionOrderStatus";
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
  PieChart,
  Pie,
} from "recharts";

type RangeOption = "today" | "7d" | "30d";

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

function parseDateOnlyLocal(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfTodayLocal(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function prettyDayLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

/**
 * Data de referência para filtro "no período" no dashboard.
 * Usar dueDate aqui excluía ordens ativas com entrega futura (comum em produção).
 */
function orderCreatedLocalDayStart(order: ProductionOrder): Date {
  return startOfDayLocal(new Date(order.createdAt));
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { sales, hydrateFromStorage } = useSalesStore();

  const [range, setRange] = useState<RangeOption>("7d");
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

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
        const [ord, prts, prods, sup, qt, inv] = await Promise.all([
          listProductionOrders(user.id),
          listPrinters(user.id),
          fetchUserProducts(user.id),
          listSupplies(user.id),
          listQuotes(user.id),
          fetchUserInventory(user.id),
        ]);
        if (!alive) return;
        setOrders(ord);
        setPrinters(prts);
        setProducts(prods);
        setSupplies(sup);
        setQuotes(qt);
        setInventoryItems(inv);
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
    const endOfPeriodDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const label = range === "today" ? "Hoje" : range === "7d" ? "Últimos 7 dias" : "Últimos 30 dias";
    return { fromDate, toDate, endOfPeriodDate, label };
  }, [range]);

  const filteredOrders = useMemo(() => {
    const { fromDate, endOfPeriodDate } = rangeMeta;
    return orders.filter((o) => {
      const d = orderCreatedLocalDayStart(o);
      return d >= fromDate && d <= endOfPeriodDate;
    });
  }, [orders, rangeMeta]);

  /**
   * Gráfico "Ordens por status": inclui **sempre** ordens em aberto (alinha com Pipeline em aberto),
   * e no período filtrado inclui também concluídas/canceladas. Só com `filteredOrders`, ordens
   * antigas abertas somem do gráfico quando a criação cai fora de 7/30 dias.
   */
  const ordersForStatusChart = useMemo(() => {
    const { fromDate, endOfPeriodDate } = rangeMeta;
    return orders.filter((o) => {
      const d = orderCreatedLocalDayStart(o);
      const inPeriod = d >= fromDate && d <= endOfPeriodDate;
      const isOpen = o.status !== "done" && o.status !== "cancelled";
      return inPeriod || isOpen;
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
    for (const o of ordersForStatusChart) counts[o.status] += 1;
    return counts;
  }, [ordersForStatusChart]);

  /** Ordens em aberto cujo prazo/criação cai no período (complementa o número global do card). */
  const inProgressInFilteredPeriod = useMemo(
    () =>
      filteredOrders.filter((o) => o.status !== "done" && o.status !== "cancelled").length,
    [filteredOrders],
  );

  /** Pipeline aberto (ignora filtro de período — visão real do que está na oficina). */
  const globalActiveOrders = useMemo(
    () => orders.filter((o) => o.status !== "done" && o.status !== "cancelled"),
    [orders],
  );
  const globalActiveQty = useMemo(
    () => globalActiveOrders.reduce((acc, o) => acc + (o.quantity ?? 0), 0),
    [globalActiveOrders],
  );

  const doneOrders = ordersByStatus.done;
  const cancelledOrders = ordersByStatus.cancelled;

  const totalOrderQty = useMemo(
    () => filteredOrders.reduce((acc, o) => acc + (o.quantity ?? 0), 0),
    [filteredOrders],
  );

  const ordersStatusChartData = useMemo(() => {
    return PRODUCTION_ORDER_STATUS_DISPLAY_ORDER.map((status) => ({
      status,
      label: PRODUCTION_ORDER_STATUS_LABELS[status],
      count: ordersByStatus[status],
    }));
  }, [ordersByStatus, PRODUCTION_ORDER_STATUS_DISPLAY_ORDER, PRODUCTION_ORDER_STATUS_LABELS]);

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

  const todayStart = useMemo(() => startOfTodayLocal(new Date()), []);

  const overdueOrdersAll = useMemo(() => {
    const res: ProductionOrder[] = [];
    for (const o of globalActiveOrders) {
      if (!o.dueDate) continue;
      const d = parseDateOnlyLocal(o.dueDate);
      if (!d || d >= todayStart) continue;
      res.push(o);
    }
    return res;
  }, [globalActiveOrders, todayStart]);

  const dueSoon3d = useMemo(() => {
    const end = addDaysLocal(todayStart, 3);
    const res: ProductionOrder[] = [];
    for (const o of globalActiveOrders) {
      if (!o.dueDate) continue;
      const d = parseDateOnlyLocal(o.dueDate);
      if (!d || d < todayStart || d > end) continue;
      res.push(o);
    }
    return res;
  }, [globalActiveOrders, todayStart]);

  const printingNowCount = useMemo(
    () => orders.filter((o) => o.status === "printing").length,
    [orders],
  );

  const lowStockSupplies = useMemo(() => {
    return supplies.filter((s) => {
      const min = s.minStockQty ?? 0;
      if (min <= 0) return false;
      return (s.stockQty ?? 0) < min;
    });
  }, [supplies]);

  const printerStatusCounts = useMemo(() => {
    const counts: Record<PrinterType["status"], number> = {
      available: 0,
      busy: 0,
      maintenance: 0,
      offline: 0,
    };
    for (const p of printers) counts[p.status] += 1;
    return counts;
  }, [printers]);

  const finishedOrdersInRange = useMemo(() => {
    const { fromDate, endOfPeriodDate } = rangeMeta;
    return orders.filter((o) => {
      if (o.status !== "done") return false;
      const d = new Date(o.updatedAt);
      return d >= fromDate && d <= endOfPeriodDate;
    });
  }, [orders, rangeMeta.fromDate, rangeMeta.endOfPeriodDate]);

  const finishedByDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const d of salesDays) {
      map[dayKeyLocal(d)] = 0;
    }
    for (const o of finishedOrdersInRange) {
      const k = dayKeyLocal(new Date(o.updatedAt));
      if (map[k] !== undefined) map[k] += 1;
    }
    return salesDays.map((d) => {
      const k = dayKeyLocal(d);
      return {
        day: prettyDayLabel(d),
        key: k,
        finalizadas: map[k] ?? 0,
      };
    });
  }, [finishedOrdersInRange, salesDays]);

  const orderCostEstimate = useMemo(() => {
    return filteredOrders.reduce((acc, o) => {
      const p = productById.get(o.productId);
      const unit = p?.totalCost ?? 0;
      return acc + unit * (o.quantity ?? 0);
    }, 0);
  }, [filteredOrders, productById]);

  const financialExtras = useMemo(() => {
    const avgTicket =
      rangeSales.totalOrders > 0 ? rangeSales.totalRevenue / rangeSales.totalOrders : 0;
    const marginPct =
      rangeSales.totalRevenue > 0 ? (rangeSales.totalProfit / rangeSales.totalRevenue) * 100 : 0;
    return { avgTicket, marginPct };
  }, [rangeSales]);

  const quotesInRange = useMemo(() => {
    const { fromDate, endOfPeriodDate } = rangeMeta;
    return quotes.filter((q) => {
      const d = new Date(`${q.quoteDate}T12:00:00`);
      return d >= fromDate && d <= endOfPeriodDate;
    });
  }, [quotes, rangeMeta.fromDate, rangeMeta.endOfPeriodDate]);

  const quotesDraftInRange = useMemo(
    () => quotesInRange.filter((q) => q.status === "draft"),
    [quotesInRange],
  );
  const quotesDraftValue = useMemo(
    () => quotesDraftInRange.reduce((a, q) => a + q.total, 0),
    [quotesDraftInRange],
  );

  const inventoryStats = useMemo(() => {
    const totalQty = inventoryItems.reduce((a, i) => a + i.quantity, 0);
    const potential = inventoryItems.reduce((a, i) => a + i.quantity * (i.price || 0), 0);
    const cost = inventoryItems.reduce((a, i) => a + i.quantity * (i.productionCost ?? 0), 0);
    return { skus: inventoryItems.length, totalQty, potential, cost };
  }, [inventoryItems]);

  const topProductsInRange = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) {
      map.set(o.productId, (map.get(o.productId) ?? 0) + (o.quantity ?? 0));
    }
    return [...map.entries()]
      .map(([productId, qty]) => ({
        productId,
        name: productById.get(productId)?.name ?? "Produto",
        qty,
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredOrders, productById]);

  const deadlinePerf = useMemo(() => {
    let late = 0;
    let onTime = 0;
    for (const o of finishedOrdersInRange) {
      if (!o.dueDate) {
        onTime += 1;
        continue;
      }
      const doneKey = dayKeyLocal(new Date(o.updatedAt));
      if (doneKey > o.dueDate) late += 1;
      else onTime += 1;
    }
    return { late, onTime };
  }, [finishedOrdersInRange]);

  const deadlinePieData = useMemo(
    () =>
      [
        { name: "No prazo", value: deadlinePerf.onTime, fill: "#34d399" },
        { name: "Atrasada", value: deadlinePerf.late, fill: "#fb7185" },
      ].filter((x) => x.value > 0),
    [deadlinePerf],
  );

  const pipelinePieData = useMemo(() => {
    const counts: Partial<Record<ProductionOrder["status"], number>> = {};
    for (const o of globalActiveOrders) {
      counts[o.status] = (counts[o.status] ?? 0) + 1;
    }
    return PRODUCTION_ORDER_STATUS_DISPLAY_ORDER.filter((s) => s !== "done" && s !== "cancelled")
      .map((status) => ({
        status,
        name: PRODUCTION_ORDER_STATUS_LABELS[status],
        value: counts[status] ?? 0,
      }))
      .filter((x) => x.value > 0);
  }, [
    globalActiveOrders,
    PRODUCTION_ORDER_STATUS_DISPLAY_ORDER,
    PRODUCTION_ORDER_STATUS_LABELS,
  ]);

  const PRINTER_STATUS_LABEL: Record<PrinterType["status"], string> = {
    available: "Disponível",
    busy: "Imprimindo",
    maintenance: "Manutenção",
    offline: "Offline",
  };

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
            <span className="text-slate-500"> · Ordens por data de criação (não pela entrega).</span>
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
                Ordens em aberto
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{globalActiveOrders.length}</p>
                <ClipboardList className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-200">{globalActiveQty}</span> peças no
                pipeline
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                No período filtrado:{" "}
                <span className="font-semibold text-slate-400">{inProgressInFilteredPeriod}</span>{" "}
                ordens
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Concluídas no período
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-emerald-400">{doneOrders}</p>
                <Clock className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Por atualização:{" "}
                <span className="font-semibold text-slate-200">{finishedOrdersInRange.length}</span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Canceladas (período):{" "}
                <span className="font-semibold text-rose-300">{cancelledOrders}</span>
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
                Lucro:{" "}
                <span className="font-semibold text-emerald-400">
                  {formatBRL(rangeSales.totalProfit)}
                </span>
                {" · "}
                Ticket médio:{" "}
                <span className="font-semibold text-slate-200">
                  {formatBRL(financialExtras.avgTicket)}
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Margem sobre faturamento:{" "}
                <span className="font-semibold text-emerald-300">
                  {financialExtras.marginPct.toFixed(1)}%
                </span>
              </p>
            </div>
          </div>

          {/* Alertas rápidos + atalhos */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div
              className={`rounded-2xl border p-3 ${
                overdueOrdersAll.length
                  ? "border-rose-500/40 bg-rose-950/25"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Atrasadas
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{overdueOrdersAll.length}</p>
                <Bell className="h-5 w-5 text-rose-400" />
              </div>
              <Link href="/alertas" className="mt-1 inline-block text-[10px] text-cyan-400 hover:underline">
                Ver alertas →
              </Link>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                dueSoon3d.length
                  ? "border-amber-500/35 bg-amber-950/20"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Vencem em 3 dias
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{dueSoon3d.length}</p>
                <CalendarDays className="h-5 w-5 text-amber-400" />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Entrega próxima</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Imprimindo agora
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{printingNowCount}</p>
                <Printer className="h-5 w-5 text-violet-400" />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">Status “em impressão”</p>
            </div>
            <div
              className={`rounded-2xl border p-3 ${
                lowStockSupplies.length
                  ? "border-orange-500/35 bg-orange-950/15"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Insumos críticos
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{lowStockSupplies.length}</p>
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <Link href="/insumos" className="mt-1 inline-block text-[10px] text-cyan-400 hover:underline">
                Insumos →
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Orçamentos (período)
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{quotesInRange.length}</p>
                <FileSpreadsheet className="h-5 w-5 text-cyan-400" />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Rascunhos: {quotesDraftInRange.length} ·{" "}
                <span className="text-slate-300">{formatBRL(quotesDraftValue)}</span>
              </p>
              <Link href="/orcamentos" className="mt-0.5 inline-block text-[10px] text-cyan-400 hover:underline">
                Orçamentos →
              </Link>
            </div>
          </div>

          {/* Impressoras + estoque + custo período */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Status das impressoras
                </p>
                <Gauge className="h-4 w-4 text-slate-500" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                {(["available", "busy", "maintenance", "offline"] as const).map((st) => (
                  <div
                    key={st}
                    className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/40 px-2 py-1.5"
                  >
                    <span className="text-slate-400">{PRINTER_STATUS_LABEL[st]}</span>
                    <span className="font-semibold text-slate-100">{printerStatusCounts[st]}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">
                Total cadastradas:{" "}
                <span className="font-semibold text-slate-300">{printers.length}</span>
              </p>
              <Link href="/impressoras" className="mt-1 inline-block text-[10px] text-cyan-400 hover:underline">
                Gerenciar impressoras →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Estoque (nuvem)
                </p>
                <Boxes className="h-4 w-4 text-slate-500" />
              </div>
              <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
                <li className="flex justify-between">
                  <span className="text-slate-500">SKUs</span>
                  <span className="font-semibold text-slate-100">{inventoryStats.skus}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Unidades</span>
                  <span className="font-semibold text-slate-100">{inventoryStats.totalQty}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Valor catálogo</span>
                  <span className="font-semibold text-emerald-300">
                    {formatBRL(inventoryStats.potential)}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-500">Custo estimado</span>
                  <span className="font-semibold text-slate-200">
                    {formatBRL(inventoryStats.cost)}
                  </span>
                </li>
              </ul>
              <Link href="/inventory" className="mt-2 inline-block text-[10px] text-cyan-400 hover:underline">
                Abrir estoque →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Custo estimado (ordens no período)
                </p>
                <Package className="h-4 w-4 text-slate-500" />
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-50">
                {formatBRL(orderCostEstimate)}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                Soma de <span className="text-slate-400">custo unitário do produto × quantidade</span>{" "}
                das ordens que caem no filtro de datas (use produtos com custo salvo).
              </p>
              <p className="mt-2 text-[10px] text-slate-500">
                Produtos no catálogo:{" "}
                <span className="font-semibold text-slate-300">{products.length}</span>
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
                  Total:{" "}
                  <span className="font-semibold text-slate-200">{ordersForStatusChart.length}</span>
                </span>
              </div>
              <p className="mt-1 text-[10px] leading-snug text-slate-500">
                Em aberto entram sempre; concluídas e canceladas só se a data (prazo ou criação) cair
                no período ({rangeMeta.label.toLowerCase()}).
              </p>

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
                        <Cell key={entry.status} fill={PRODUCTION_ORDER_STATUS_COLORS[entry.status]} />
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

          {/* Pipeline aberto, prazos e ritmo de conclusão */}
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Pipeline em aberto
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Distribuição por status (todas as ordens não finalizadas)
              </p>
              {pipelinePieData.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">Nenhuma ordem em aberto.</p>
              ) : (
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pipelinePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {pipelinePieData.map((e) => (
                          <Cell key={e.status} fill={PRODUCTION_ORDER_STATUS_COLORS[e.status]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "#1f2937",
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Prazo na conclusão
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Ordens <strong className="text-slate-400">concluídas</strong> no período vs data de entrega
              </p>
              {finishedOrdersInRange.length === 0 ? (
                <p className="mt-8 text-center text-sm text-slate-500">
                  Sem ordens concluídas no período.
                </p>
              ) : (
                <div className="mt-2 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={deadlinePieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={2}
                      >
                        {deadlinePieData.map((e) => (
                          <Cell key={e.name} fill={e.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "#1f2937",
                          borderRadius: 12,
                          fontSize: 11,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Finalizadas por dia
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Contagem por <strong className="text-slate-400">data de atualização</strong> (status concluída)
              </p>
              <div className="mt-3 h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={finishedByDay} margin={{ left: -10, right: 10 }}>
                    <CartesianGrid strokeDasharray="2 4" vertical={false} stroke="#1f2937" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 9, fill: "#9ca3af" }}
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
                      formatter={(v: any) => [Number(v).toFixed(0), "Ordens"]}
                    />
                    <Bar dataKey="finalizadas" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Produtos mais movimentados no período
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Soma de quantidades nas ordens filtradas</p>
              <ul className="mt-3 space-y-2">
                {topProductsInRange.length === 0 ? (
                  <li className="text-sm text-slate-500">Sem ordens no período.</li>
                ) : (
                  topProductsInRange.map((row, idx) => (
                    <li
                      key={row.productId}
                      className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2 text-[11px]"
                    >
                      <span className="flex items-center gap-2 text-slate-200">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15 text-[10px] font-bold text-cyan-300">
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[220px]" title={row.name}>
                          {row.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-slate-100">{row.qty} pç</span>
                    </li>
                  ))
                )}
              </ul>
              <Link href="/ordens" className="mt-3 inline-block text-[10px] text-cyan-400 hover:underline">
                Ir para ordens →
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Insumos abaixo do mínimo
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Top 6 por estoque vs mínimo configurado</p>
              <ul className="mt-3 max-h-52 space-y-2 overflow-y-auto">
                {lowStockSupplies.length === 0 ? (
                  <li className="text-sm text-slate-500">Nenhum insumo crítico.</li>
                ) : (
                  lowStockSupplies.slice(0, 6).map((s) => {
                    const min = s.minStockQty ?? 0;
                    const stock = s.stockQty ?? 0;
                    const pct = min > 0 ? Math.min(100, Math.round((stock / min) * 100)) : 0;
                    return (
                      <li
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800/80 bg-slate-900/30 px-3 py-2 text-[11px]"
                      >
                        <span className="truncate text-slate-200" title={s.name}>
                          {s.name}
                        </span>
                        <span className="shrink-0 text-slate-400">
                          {stock} {s.unit}
                          <span className="text-slate-600"> / min {min}</span>
                          <span
                            className={`ml-2 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              pct <= 30 ? "bg-rose-500/20 text-rose-300" : "bg-amber-500/15 text-amber-200"
                            }`}
                          >
                            {pct}%
                          </span>
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
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
                      const statusColor = PRODUCTION_ORDER_STATUS_COLORS[o.status] ?? "#94a3b8";
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
                              <span className="text-slate-200">{PRODUCTION_ORDER_STATUS_LABELS[o.status]}</span>
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

