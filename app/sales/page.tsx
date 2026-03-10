"use client";

import { useEffect, useState } from "react";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSalesStore } from "@/store/salesStore";

export default function SalesPage() {
  const { items, hydrateFromStorage: hydrateInventory, updateItem } = useInventoryStore();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const {
    registerSale,
    sales,
    hydrateFromStorage: hydrateSales,
    removeSale,
    clearSales,
  } = useSalesStore();

  useEffect(() => {
    hydrateInventory();
    hydrateSales();
  }, [hydrateInventory, hydrateSales]);

  const handleSell = (itemId: string, channel: "Shopee" | "ML") => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const defaultQty = quantities[itemId] ?? 1;
    const maxQty = item.quantity;

    const defaultPrice =
      channel === "Shopee"
        ? item.suggestedPriceShopee ?? item.price
        : item.suggestedPriceML ?? item.price;

    const priceStr =
      typeof window !== "undefined"
        ? window.prompt(
            `Preço de venda unitário (${channel})`,
            defaultPrice.toFixed(2),
          )
        : null;
    if (!priceStr) return;
    const unitPrice = Number(priceStr.replace(",", "."));
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

    const qtyStr =
      typeof window !== "undefined"
        ? window.prompt(
            "Quantidade vendida",
            String(Math.min(defaultQty, maxQty || 1)),
          )
        : null;
    if (!qtyStr) return;
    const qty = Number(qtyStr);
    if (!Number.isFinite(qty) || qty <= 0) return;
    if (qty > item.quantity) return;

    const next: typeof item = {
      ...item,
      quantity: item.quantity - qty,
      updatedAt: new Date().toISOString(),
    };
    updateItem(next);
    setQuantities((q) => ({ ...q, [itemId]: 1 }));

    const unitCost = item.productionCost ?? 0;
    const revenue = unitPrice * qty;
    const netProfit = (unitPrice - unitCost) * qty;

    registerSale({
      itemId: item.id,
      productName: item.name,
      sku: item.sku,
      channel,
      quantity: qty,
      unitPrice,
      revenue,
      unitProductionCost: unitCost,
      netProfit,
    });
  };

  const itemsWithStock = items.filter((i) => i.quantity > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Vendas
      </h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
        {itemsWithStock.length === 0 ? (
          <p className="text-slate-400">
            Nenhuma peça produzida em estoque. Use o botão “Produzida” na aba Produtos para lançar
            peças antes de registrar vendas.
          </p>
        ) : (
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-2 py-2">Nome</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Qtd em estoque</th>
                <th className="px-2 py-2">Qtd a vender</th>
                <th className="px-2 py-2">Preço Shopee</th>
                <th className="px-2 py-2">Preço ML</th>
                <th className="px-2 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {itemsWithStock.map((i) => (
                <tr key={i.id} className="hover:bg-slate-900/60">
                  <td className="px-2 py-2 text-slate-100">{i.name}</td>
                  <td className="px-2 py-2 text-slate-300">{i.sku}</td>
                  <td className="px-2 py-2 text-slate-100">{i.quantity}</td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={quantities[i.id] ?? 1}
                      min={1}
                      max={i.quantity}
                      onChange={(e) =>
                        setQuantities((q) => ({
                          ...q,
                          [i.id]: Number(e.target.value) || 1,
                        }))
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-slate-100">
                    {(i.suggestedPriceShopee ?? i.price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-2 py-2 text-slate-100">
                    {(i.suggestedPriceML ?? i.price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleSell(i.id, "Shopee")}
                      className="mr-2 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                    >
                      Vender Shopee
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSell(i.id, "ML")}
                      className="rounded-lg bg-cyan-500/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      Vender ML
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {sales.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Histórico recente de vendas
          </p>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span>Mostrando as 10 vendas mais recentes.</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Remover TODO o histórico de vendas?")) {
                  clearSales();
                }
              }}
              className="rounded-full border border-red-500/40 px-2 py-0.5 text-[10px] text-red-300 hover:bg-red-500/10"
            >
              Limpar histórico
            </button>
          </div>
          <table className="mt-2 min-w-full text-left">
            <thead className="border-b border-slate-800 text-[10px] uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-2 py-1">Data</th>
                <th className="px-2 py-1">Produto</th>
                <th className="px-2 py-1">Canal</th>
                <th className="px-2 py-1">Qtd</th>
                <th className="px-2 py-1">Faturamento</th>
                <th className="px-2 py-1">Lucro líquido</th>
                <th className="px-2 py-1 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sales
                .slice()
                .reverse()
                .slice(0, 10)
                .map((s) => (
                  <tr key={s.id}>
                    <td className="px-2 py-1 text-slate-300">
                      {new Date(s.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-2 py-1 text-slate-100">{s.productName}</td>
                    <td className="px-2 py-1 text-slate-300">{s.channel}</td>
                    <td className="px-2 py-1 text-slate-100">{s.quantity}</td>
                    <td className="px-2 py-1 text-slate-100">
                      {s.revenue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-1 text-emerald-400">
                      {s.netProfit.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm("Remover esta venda?")) {
                            removeSale(s.id);
                          }
                        }}
                        className="rounded-lg border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-red-500/10 hover:text-red-300"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

