 "use client";

import { Calculator, Package, Percent, LineChart } from "lucide-react";
import type { Product } from "@/types";
import { useEffect } from "react";
import { useSalesStore } from "@/store/salesStore";

interface Props {
  products: Product[];
}

export function DashboardStats({ products }: Props) {
  const { sales, hydrateFromStorage } = useSalesStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const totalProducts = products.length;
  const avgMargin =
    products.length > 0
      ? products.reduce((acc, p) => acc + (p.margin ?? 0), 0) /
        products.length
      : 0;

  const lastCalculation = products[0]?.updatedAt ?? null;

  const totalsByChannel = sales.reduce(
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

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Produtos
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {totalProducts}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <Package className="h-5 w-5" />
        </div>
      </div>

      <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3 md:col-span-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Vendas acumuladas
          </p>
          <div className="mt-1 space-y-1 text-sm text-slate-200">
            <p>
              Shopee —{" "}
              <span className="font-semibold">
                {totalsByChannel.shopeeRevenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>{" "}
              | Lucro:{" "}
              <span className="font-semibold text-emerald-400">
                {totalsByChannel.shopeeProfit.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </p>
            <p>
              ML —{" "}
              <span className="font-semibold">
                {totalsByChannel.mlRevenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>{" "}
              | Lucro:{" "}
              <span className="font-semibold text-emerald-400">
                {totalsByChannel.mlProfit.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </p>
            <p className="pt-1 text-xs text-slate-400">
              Total faturado:{" "}
              <span className="font-semibold text-slate-50">
                {totalRevenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>{" "}
              | Lucro líquido total:{" "}
              <span className="font-semibold text-emerald-400">
                {totalProfit.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </p>
          </div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
          <LineChart className="h-5 w-5" />
        </div>
      </div>

      <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Margem média
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">
            {avgMargin.toFixed(1)}%
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <Percent className="h-5 w-5" />
        </div>
      </div>

      <div className="glass-panel flex items-center justify-between rounded-2xl px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Última simulação
          </p>
          <p className="mt-1 text-sm text-slate-200">
            {lastCalculation
              ? new Intl.DateTimeFormat("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(lastCalculation))
              : "Ainda não há simulações"}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
          <Calculator className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

