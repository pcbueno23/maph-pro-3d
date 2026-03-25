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
      const gross = s.grossProfit ?? s.netProfit; // compat com registros antigos sem grossProfit
      const fee = s.marketplaceFeeAmount ?? 0;
      const tax = s.taxAmount ?? 0;
      const net = s.netProfit;
      if (s.channel === "Shopee") {
        acc.shopeeRevenue += s.revenue;
        acc.shopeeGrossProfit += gross;
        acc.shopeeFees += fee + tax;
        acc.shopeeProfit += net;
      } else if (s.channel === "ML") {
        acc.mlRevenue += s.revenue;
        acc.mlGrossProfit += gross;
        acc.mlFees += fee + tax;
        acc.mlProfit += net;
      } else if (s.channel === "Direto") {
        acc.directRevenue += s.revenue;
        acc.directGrossProfit += gross;
        acc.directFees += fee + tax;
        acc.directProfit += net;
      }
      return acc;
    },
    {
      shopeeRevenue: 0,
      shopeeGrossProfit: 0,
      shopeeFees: 0,
      shopeeProfit: 0,
      mlRevenue: 0,
      mlGrossProfit: 0,
      mlFees: 0,
      mlProfit: 0,
      directRevenue: 0,
      directGrossProfit: 0,
      directFees: 0,
      directProfit: 0,
    },
  );

  const totalRevenue =
    totalsByChannel.shopeeRevenue + totalsByChannel.mlRevenue + totalsByChannel.directRevenue;
  const totalGrossProfit =
    totalsByChannel.shopeeGrossProfit + totalsByChannel.mlGrossProfit + totalsByChannel.directGrossProfit;
  const totalFees =
    totalsByChannel.shopeeFees + totalsByChannel.mlFees + totalsByChannel.directFees;
  const totalProfit =
    totalsByChannel.shopeeProfit + totalsByChannel.mlProfit + totalsByChannel.directProfit;

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

      <div className="glass-panel rounded-2xl px-4 py-3 md:col-span-3">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
            Vendas acumuladas
          </p>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
            <LineChart className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-2 space-y-1 text-sm text-slate-200">
          <p>
            Shopee —{" "}
            <span className="font-semibold">
              {totalsByChannel.shopeeRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Bruto: "}
            <span className="text-slate-300">
              {totalsByChannel.shopeeGrossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Taxa: "}
            <span className="text-rose-400">
              -{totalsByChannel.shopeeFees.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Líquido: "}
            <span className="font-semibold text-emerald-400">
              {totalsByChannel.shopeeProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
          <p>
            ML —{" "}
            <span className="font-semibold">
              {totalsByChannel.mlRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Bruto: "}
            <span className="text-slate-300">
              {totalsByChannel.mlGrossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Taxa: "}
            <span className="text-rose-400">
              -{totalsByChannel.mlFees.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Líquido: "}
            <span className="font-semibold text-emerald-400">
              {totalsByChannel.mlProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
          <p>
            Venda direta —{" "}
            <span className="font-semibold">
              {totalsByChannel.directRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Bruto: "}
            <span className="text-slate-300">
              {totalsByChannel.directGrossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Taxa: "}
            <span className="text-rose-400">
              -{totalsByChannel.directFees.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            {" | Líquido: "}
            <span className="font-semibold text-emerald-400">
              {totalsByChannel.directProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
          <span>
            Faturamento:{" "}
            <span className="font-semibold text-slate-50">
              {totalRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </span>
          <span>
            Lucro bruto:{" "}
            <span className="font-semibold text-slate-200">
              {totalGrossProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </span>
          <span>
            Taxas marketplace:{" "}
            <span className="font-semibold text-rose-400">
              -{totalFees.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </span>
          <span>
            Lucro líquido:{" "}
            <span className="font-semibold text-emerald-400">
              {totalProfit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </span>
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

