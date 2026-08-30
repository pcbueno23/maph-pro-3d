"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSalesStore, type SalesChannel } from "@/store/salesStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useProductsStore } from "@/store/productsStore";
import type { Product, ProductMarketplaceChannel } from "@/types";
import { getEffectiveMarketplaceFeePercent } from "@/lib/marketplaceFees";

function formatChannelHistory(ch: SalesChannel) {
  if (ch === "ML") return "Mercado Livre";
  return ch;
}

function channelToMarketplace(channel: SalesChannel): ProductMarketplaceChannel {
  if (channel === "ML") return "Mercado Livre";
  if (channel === "Direto") return "Venda Direta";
  return "Shopee";
}

export default function SalesPage() {
  const { items, hydrateFromStorage: hydrateInventory, updateItem, upsertFromProduct } = useInventoryStore();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const {
    registerSale,
    sales,
    hydrateFromStorage: hydrateSales,
    removeSale,
    clearSales,
  } = useSalesStore();
  const { settings } = useSettingsStore();
  const addProduct = useProductsStore((s) => s.addProduct);

  useEffect(() => {
    hydrateInventory();
    hydrateSales();
  }, [hydrateInventory, hydrateSales]);

  const [quickOpen, setQuickOpen] = useState(false);
  const [quickName, setQuickName] = useState("");
  const [quickSku, setQuickSku] = useState("");
  const [quickChannel, setQuickChannel] = useState<SalesChannel>("Shopee");
  const [quickCost, setQuickCost] = useState("");
  const [quickPrice, setQuickPrice] = useState("");
  const [quickQty, setQuickQty] = useState("1");
  const [quickError, setQuickError] = useState<string | null>(null);

  function marketplaceFeeFor(channel: SalesChannel, unitPrice: number, revenue: number): number {
    if (channel === "Shopee") {
      const feePercent = getEffectiveMarketplaceFeePercent("Shopee", "CPF", unitPrice, {
        freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
      });
      return (revenue * feePercent) / 100;
    }
    if (channel === "ML") {
      const feePercent = getEffectiveMarketplaceFeePercent("Mercado Livre", "CPF", unitPrice, {
        classicML: settings.defaults.mlClassic ?? false,
      });
      return (revenue * feePercent) / 100;
    }
    const cardFee = settings.defaults.cardFeePercent ?? 0;
    return (revenue * cardFee) / 100;
  }

  function handleQuickRegister(e: FormEvent) {
    e.preventDefault();
    setQuickError(null);

    const name = quickName.trim();
    const sku = quickSku.trim();
    const cost = Number(quickCost.replace(",", "."));
    const price = Number(quickPrice.replace(",", "."));
    const qty = Number(quickQty);

    if (!name) return setQuickError("Nome do produto é obrigatório.");
    if (!Number.isFinite(cost) || cost < 0) return setQuickError("Custo aproximado inválido.");
    if (!Number.isFinite(price) || price <= 0) return setQuickError("Preço de venda inválido.");
    if (!Number.isFinite(qty) || qty <= 0) return setQuickError("Quantidade inválida.");

    const now = new Date().toISOString();
    const product: Product = {
      id: crypto.randomUUID(),
      name,
      weight: 0,
      price,
      margin: 0,
      marketplace: channelToMarketplace(quickChannel),
      currency: "BRL",
      totalCost: cost,
      sku: sku || null,
      createdAt: now,
      updatedAt: now,
    };
    addProduct(product);
    // Cria o item de estoque com quantidade 0 — já foi vendido, não sobrou saldo pra rastrear.
    upsertFromProduct(product, 0, sku || undefined);
    const createdItem = useInventoryStore.getState().items.find((i) => i.productId === product.id);
    if (!createdItem) return setQuickError("Falha ao cadastrar o produto.");

    const revenue = price * qty;
    const grossProfit = (price - cost) * qty;
    const marketplaceFeeAmount = marketplaceFeeFor(quickChannel, price, revenue);
    const netProfit = grossProfit - marketplaceFeeAmount;

    registerSale({
      itemId: createdItem.id,
      productName: name,
      sku,
      channel: quickChannel,
      quantity: qty,
      unitPrice: price,
      revenue,
      unitProductionCost: cost,
      grossProfit,
      marketplaceFeeAmount,
      taxAmount: 0,
      netProfit,
    });

    setQuickName("");
    setQuickSku("");
    setQuickCost("");
    setQuickPrice("");
    setQuickQty("1");
    setQuickOpen(false);
  }

  const handleSell = (itemId: string, channel: SalesChannel) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    const defaultQty = quantities[itemId] ?? 1;
    const maxQty = item.quantity;

    const defaultPrice =
      channel === "Shopee"
        ? item.suggestedPriceShopee ?? item.price
        : channel === "ML"
          ? item.suggestedPriceML ?? item.price
          : item.suggestedPriceDirect ?? item.price;

    const channelLabel =
      channel === "ML"
        ? "Mercado Livre"
        : channel === "Direto"
          ? "venda direta"
          : channel;

    const priceStr =
      typeof window !== "undefined"
        ? window.prompt(
            `Preço de venda unitário (${channelLabel})`,
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
    const grossProfit = (unitPrice - unitCost) * qty;
    const marketplaceFeeAmount = marketplaceFeeFor(channel, unitPrice, revenue);

    // Imposto: não armazenado globalmente por produto — registrado como 0
    // (pode ser expandido quando taxPercent for adicionado ao InventoryItem)
    const taxAmount = 0;

    const netProfit = grossProfit - marketplaceFeeAmount - taxAmount;

    registerSale({
      itemId: item.id,
      productName: item.name,
      sku: item.sku,
      channel,
      quantity: qty,
      unitPrice,
      revenue,
      unitProductionCost: unitCost,
      grossProfit,
      marketplaceFeeAmount,
      taxAmount,
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
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Vendeu algo que ainda não está cadastrado?
          </p>
          <button
            type="button"
            onClick={() => setQuickOpen((o) => !o)}
            className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-500/20"
          >
            {quickOpen ? "Cancelar" : "+ Cadastro expresso"}
          </button>
        </div>

        {quickOpen && (
          <form onSubmit={handleQuickRegister} className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Nome do produto
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              SKU (opcional)
              <input
                type="text"
                value={quickSku}
                onChange={(e) => setQuickSku(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Canal
              <select
                value={quickChannel}
                onChange={(e) => setQuickChannel(e.target.value as SalesChannel)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              >
                <option value="Shopee">Shopee</option>
                <option value="ML">Mercado Livre</option>
                <option value="Direto">Venda direta</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Custo aproximado (R$)
              <input
                type="text"
                inputMode="decimal"
                value={quickCost}
                onChange={(e) => setQuickCost(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Preço de venda (R$)
              <input
                type="text"
                inputMode="decimal"
                value={quickPrice}
                onChange={(e) => setQuickPrice(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              Quantidade
              <input
                type="number"
                min={1}
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5 text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                required
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              {quickError && <p className="mb-2 text-xs text-rose-400">{quickError}</p>}
              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:from-cyan-400 hover:to-emerald-400"
              >
                Cadastrar produto e registrar venda
              </button>
              <p className="mt-2 text-[10px] text-slate-500">
                Cria um produto mínimo (nome + custo aproximado) e já registra a venda — depois você
                pode completar a ficha técnica dele em Produtos.
              </p>
            </div>
          </form>
        )}
      </div>

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
                <th className="px-2 py-2">Preço direto</th>
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
                  <td className="px-2 py-2 text-slate-100">
                    {(i.suggestedPriceDirect ?? i.price).toLocaleString("pt-BR", {
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
                      className="mr-2 rounded-lg bg-cyan-500/10 px-2 py-1.5 text-[11px] font-semibold text-cyan-300 hover:bg-cyan-500/20"
                    >
                      Vender ML
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSell(i.id, "Direto")}
                      className="rounded-lg bg-violet-500/10 px-2 py-1.5 text-[11px] font-semibold text-violet-300 hover:bg-violet-500/20"
                    >
                      Venda direta
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
                <th className="px-2 py-1">Lucro bruto</th>
                <th className="px-2 py-1">Taxa marketplace</th>
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
                    <td className="px-2 py-1 text-slate-300">{formatChannelHistory(s.channel)}</td>
                    <td className="px-2 py-1 text-slate-100">{s.quantity}</td>
                    <td className="px-2 py-1 text-slate-100">
                      {s.revenue.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-1 text-slate-300">
                      {(s.grossProfit ?? s.netProfit).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-1 text-rose-400">
                      -{(s.marketplaceFeeAmount ?? 0).toLocaleString("pt-BR", {
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

