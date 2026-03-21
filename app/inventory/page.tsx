"use client";

import { useEffect, useMemo } from "react";
import { useInventoryStore } from "@/store/inventoryStore";
import { useAuthStore } from "@/store/authStore";
import { fetchUserProducts } from "@/lib/supabaseProducts";

export default function InventoryPage() {
  const { user } = useAuthStore();
  const {
    items,
    hydrateFromStorage: hydrateInventory,
    updateItem,
    removeItem,
  } = useInventoryStore();

  /** Só reexecuta quando mudam linhas ou custo salvo (evita loop com o array inteiro). */
  const inventoryCostKey = useMemo(
    () => items.map((i) => `${i.id}:${i.productionCost ?? 0}`).join("|"),
    [items],
  );

  useEffect(() => {
    hydrateInventory();
  }, [hydrateInventory]);

  /** Preenche custo/preços a partir do cadastro do produto (após migração no Supabase ou re-salvamento). */
  useEffect(() => {
    if (!user?.id || items.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const prods = await fetchUserProducts(user.id);
        if (cancelled) return;
        const update = useInventoryStore.getState().updateItem;
        const snapshot = useInventoryStore.getState().items;
        for (const i of snapshot) {
          const p = prods.find((x) => x.id === i.productId);
          if (!p?.totalCost || p.totalCost <= 0) continue;
          if (i.productionCost != null && i.productionCost > 0) continue;
          update({
            ...i,
            productionCost: p.totalCost,
            suggestedPriceShopee: p.suggestedPriceShopee ?? i.suggestedPriceShopee,
            suggestedPriceML: p.suggestedPriceML ?? i.suggestedPriceML,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // colunas novas ainda não aplicadas no banco ou offline
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, items.length, inventoryCostKey]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Peças produzidas
      </h1>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          {items.length === 0 ? (
            <p className="text-slate-400">
              Nenhuma peça produzida cadastrada ainda. Use o botão “Produzida” na aba Produtos para
              lançar estoque.
            </p>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Qtd</th>
                  <th className="px-2 py-2">Preço Shopee</th>
                  <th className="px-2 py-2">Preço ML</th>
                  <th className="px-2 py-2">Custo produção</th>
                  <th className="px-2 py-2">% Margem (pior canal)</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-900/60">
                    <td className="px-2 py-2 text-slate-100">{i.name}</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        value={i.sku}
                        onChange={(e) =>
                          updateItem({
                            ...i,
                            sku: e.target.value,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        value={i.quantity}
                        onChange={(e) =>
                          updateItem({
                            ...i,
                            quantity: Number(e.target.value) || 0,
                            updatedAt: new Date().toISOString(),
                          })
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
                      {(i.productionCost ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          i.marginPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {i.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-300">{i.marketplace}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(i.id)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
    </div>
  );
}

