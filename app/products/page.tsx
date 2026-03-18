"use client";

import { useEffect, useState } from "react";
import { ProductTable } from "@/components/products/ProductTable";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { MARKETPLACES } from "@/lib/constants";
import type { Marketplace, Product } from "@/types";

export default function ProductsPage() {
  const { products, hydrateFromStorage, addProduct } = useProductsStore();
  const { user } = useAuthStore();

  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newWeight, setNewWeight] = useState<number | "">("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newMargin, setNewMargin] = useState<number | "">("");
  const [newMarketplace, setNewMarketplace] = useState<Marketplace>("Shopee");

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  async function handleCreateProduct() {
    const weight =
      typeof newWeight === "number"
        ? newWeight
        : Number.parseFloat(String(newWeight).replace(",", "."));
    const price =
      typeof newPrice === "number"
        ? newPrice
        : Number.parseFloat(String(newPrice).replace(",", "."));
    const marginVal =
      typeof newMargin === "number"
        ? newMargin
        : Number.parseFloat(String(newMargin).replace(",", "."));

    if (!newName.trim() || !Number.isFinite(weight) || weight <= 0 || !Number.isFinite(price) || price <= 0) {
      return;
    }

    const margin = Number.isFinite(marginVal) ? marginVal : null;
    const nowIso = new Date().toISOString();
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `manual_${Date.now()}`;

    const product: Product = {
      id,
      name: newName.trim(),
      weight,
      price,
      margin,
      marketplace: newMarketplace,
      currency: "BRL",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    addProduct(product);

    if (user) {
      const list = useProductsStore.getState().products;
      upsertProductsForUser(user.id, list).catch(() => {});
    }

    setNewOpen(false);
    setNewName("");
    setNewWeight("");
    setNewPrice("");
    setNewMargin("");
    setNewMarketplace("Shopee");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Produtos salvos
        </h1>
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Adicionar produto
        </button>
      </div>

      <ProductTable products={products} />

      {newOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  Adicionar produto (cadastro manual)
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Use para criar produtos que não vieram da calculadora.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">
                  Nome
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Peso (g)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={newWeight}
                  onChange={(e) =>
                    setNewWeight(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={newPrice}
                  onChange={(e) =>
                    setNewPrice(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Margem (% opcional)
                </label>
                <input
                  type="number"
                  step={0.1}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={newMargin}
                  onChange={(e) =>
                    setNewMargin(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Marketplace
                </label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={newMarketplace}
                  onChange={(e) => setNewMarketplace(e.target.value as Marketplace)}
                >
                  {MARKETPLACES.map((mkt) => (
                    <option key={mkt} value={mkt}>
                      {mkt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setNewOpen(false)}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateProduct}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Salvar produto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

