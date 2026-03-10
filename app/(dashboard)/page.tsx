"use client";

import { useEffect } from "react";
import { LineChart, ShoppingBag, Wallet, Percent } from "lucide-react";
import { useSalesStore } from "@/store/salesStore";

export default function DashboardPage() {
  const { sales, hydrateFromStorage } = useSalesStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const totalsByChannel = sales.reduce(
    (acc, s) => {
      if (s.channel === "Shopee") {
        acc.shopeeRevenue += s.revenue;
        acc.shopeeProfit += s.netProfit;
      } else {
        acc.mlRevenue += s.revenue;
        acc.mlProfit += s.netProfit;
      }
      acc.totalQty += s.quantity;
      return acc;
    },
    {
      shopeeRevenue: 0,
      shopeeProfit: 0,
      mlRevenue: 0,
      mlProfit: 0,
      totalQty: 0,
    },
  );

  const totalRevenue = totalsByChannel.shopeeRevenue + totalsByChannel.mlRevenue;
  const totalProfit = totalsByChannel.shopeeProfit + totalsByChannel.mlProfit;
  const totalOrders = sales.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const sortedSales = [...sales].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const recentSales = sortedSales.slice(0, 8);

  const firstDate = sortedSales[sortedSales.length - 1]?.date;
  const lastDate = sortedSales[0]?.date;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Visão geral
          </h1>
          {firstDate && lastDate && (
            <p className="mt-1 text-xs text-slate-400">
              Período:{" "}
              {new Date(firstDate).toLocaleDateString("pt-BR")} –{" "}
              {new Date(lastDate).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <LineChart className="h-5 w-5" />
        </div>
      </div>

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
          Nenhuma venda registrada ainda. Use a aba <strong>Vendas</strong> para lançar as vendas
          Shopee e Mercado Livre.
        </div>
      ) : (
        <>
          {/* Cards principais */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Faturamento
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">
                  {totalRevenue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <Wallet className="h-5 w-5 text-cyan-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Lucro líquido
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-emerald-400">
                  {totalProfit.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Nº de vendas
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">{totalOrders}</p>
                <ShoppingBag className="h-5 w-5 text-cyan-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Ticket médio
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-50">
                  {avgTicket.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </p>
                <Percent className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
          </div>

          {/* Resumo por canal + últimas vendas */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Por canal
              </p>
              <div className="mt-3 space-y-3 text-xs text-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-100">Shopee</p>
                    <p className="mt-1 text-[11px] text-slate-400">Faturamento e lucro líquido</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-50">
                      {totalsByChannel.shopeeRevenue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <p className="text-[11px] text-emerald-400">
                      {totalsByChannel.shopeeProfit.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-100">Mercado Livre</p>
                    <p className="mt-1 text-[11px] text-slate-400">Faturamento e lucro líquido</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-50">
                      {totalsByChannel.mlRevenue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                    <p className="text-[11px] text-emerald-400">
                      {totalsByChannel.mlProfit.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Últimas vendas
              </p>
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
                    {recentSales.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-1 text-slate-400">
                          {new Date(s.date).toLocaleDateString("pt-BR")}
                        </td>
                        <td className="px-2 py-1 text-slate-100">{s.productName}</td>
                        <td className="px-2 py-1 text-slate-300">{s.channel}</td>
                        <td className="px-2 py-1 text-right text-slate-100">
                          {s.revenue.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="px-2 py-1 text-right text-emerald-400">
                          {s.netProfit.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentSales.length === 0 && (
                  <p className="py-4 text-center text-xs text-slate-400">
                    Nenhuma venda registrada ainda.
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

