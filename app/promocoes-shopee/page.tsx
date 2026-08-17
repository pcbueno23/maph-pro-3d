"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { formatBRL } from "@/lib/engines/shopee/engine";
import ProductPromoForm from "@/components/shopeePromo/ProductPromoForm";
import type { Product } from "@/types";

export default function PromocoesShopeePage() {
  const { products, hydrateFromStorage, updateProduct } = useProductsStore();
  const { user } = useAuthStore();
  const [onlyShopee, setOnlyShopee] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((p) => (onlyShopee ? p.marketplace === "Shopee" : true))
      .filter((p) => (term ? p.name.toLowerCase().includes(term) : true));
  }, [products, onlyShopee, search]);

  async function handleChange(product: Product, patch: Partial<Product>) {
    const updated: Product = { ...product, ...patch, updatedAt: new Date().toISOString() };
    updateProduct(updated);
    if (user) {
      await upsertProductsForUser(user.id, useProductsStore.getState().products);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 md:p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Promoções Shopee
        </p>
        <p className="mt-1 text-sm text-slate-300">
          Defina por produto o preço de cadastro, desconto, cupom e oferta relâmpago que você
          quer usar na Shopee. Os valores ficam salvos aqui — ainda não conecta direto na Shopee,
          é uma cola pra você digitar no painel dela.
        </p>
      </div>

      <div className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
        />
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={onlyShopee}
            onChange={(e) => setOnlyShopee(e.target.checked)}
            className="h-4 w-4 accent-cyan-400"
          />
          Só produtos Shopee
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-sm text-slate-500">
          Nenhum produto encontrado.
          {onlyShopee ? ' Tente desmarcar "Só produtos Shopee".' : ""}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => {
            const isOpen = expanded[product.id] ?? false;
            return (
              <div
                key={product.id}
                className="glass-panel overflow-hidden rounded-2xl border border-slate-800"
              >
                <button
                  type="button"
                  onClick={() => setExpanded((s) => ({ ...s, [product.id]: !isOpen }))}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-900/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    )}
                    <span className="truncate text-sm font-medium text-slate-100">
                      {product.name}
                    </span>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {product.shopeePromoPrecoCadastro
                      ? `Cadastro: ${formatBRL(product.shopeePromoPrecoCadastro)}`
                      : "Sem valores definidos"}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-800 p-4">
                    <ProductPromoForm
                      product={product}
                      onChange={(patch) => handleChange(product, patch)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
