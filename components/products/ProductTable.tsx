"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Product } from "@/types";
import { useProductsStore } from "@/store/productsStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useAuthStore } from "@/store/authStore";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";

interface Props {
  products: Product[];
}

export function ProductTable({ products }: Props) {
  const router = useRouter();
  const removeProduct = useProductsStore((s) => s.removeProduct);
  const setProductToLoad = useCalculatorStore((s) => s.setProductToLoad);
  const { user } = useAuthStore();
  const { upsertFromProduct } = useInventoryStore();
  const { consumeFilamentGrams } = useSuppliesStore();

  function handleLoadInCalculator(product: Product) {
    setProductToLoad(product);
    router.push("/calculator");
  }

  function handleRemove(product: Product) {
    if (typeof window !== "undefined" && !window.confirm(`Remover "${product.name}" da lista?`)) return;
    removeProduct(product.id);
    if (user) {
      const list = useProductsStore.getState().products;
      upsertProductsForUser(user.id, list).catch(() => {});
    }
  }
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
        Nenhum produto salvo ainda. Após calcular um produto, você poderá
        salvá-lo aqui para reutilizar parâmetros, duplicar e exportar.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.15em] text-slate-400">
          <tr>
            <th className="px-4 py-3">Nome</th>
            <th className="px-2 py-3">Peso (g)</th>
            <th className="px-2 py-3">Preço</th>
            <th className="px-2 py-3">% Margem</th>
            <th className="px-2 py-3">Marketplace</th>
            <th className="px-2 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-900/60">
              <td className="px-4 py-2">
                <button
                  type="button"
                  onClick={() => handleLoadInCalculator(product)}
                  className="text-left font-medium text-cyan-400 underline decoration-cyan-400/50 underline-offset-2 transition hover:text-cyan-300 hover:decoration-cyan-300"
                  title="Abrir na calculadora para editar"
                >
                  {product.name}
                </button>
              </td>
              <td className="px-2 py-2 text-slate-200">{product.weight}</td>
              <td className="px-2 py-2 text-slate-100">
                {product.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: product.currency,
                })}
              </td>
              <td className="px-2 py-2">
                <span
                  className={
                    (product.margin ?? 0) >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }
                >
                  {(product.margin ?? 0).toFixed(1)}%
                </span>
              </td>
              <td className="px-2 py-2 text-slate-300">
                {product.marketplace}
              </td>
              <td className="px-2 py-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    const qtyStr =
                      typeof window !== "undefined"
                        ? window.prompt("Quantidade produzida para estoque:", "1")
                        : null;
                    if (!qtyStr) return;
                    const qty = Number(qtyStr);
                    if (!Number.isFinite(qty) || qty <= 0) return;
                    const sku =
                      typeof window !== "undefined"
                        ? window.prompt("SKU da peça (opcional):", "")
                        : "";
                    upsertFromProduct(product, qty, sku ?? undefined);
                    // baixa filamento do estoque (aproxima usando primeiro insumo de filamento)
                    if (product.weight > 0) {
                      const grams = product.weight * qty;
                      consumeFilamentGrams(grams);
                    }
                  }}
                  className="mr-2 inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/10 hover:text-emerald-200"
                >
                  Produzida
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(product)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-400"
                  title="Remover item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

