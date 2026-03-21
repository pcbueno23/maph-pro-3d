"use client";

import { useEffect, useState } from "react";
import type { Product } from "@/types";
import { ProductTable } from "@/components/products/ProductTable";
import { NewProductWizard } from "@/components/products/NewProductWizard";
import { useProductsStore } from "@/store/productsStore";

export default function ProductsPage() {
  const { products, hydrateFromStorage } = useProductsStore();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitialProduct, setWizardInitialProduct] = useState<Product | null>(null);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Produtos salvos
        </h1>
        <button
          type="button"
          onClick={() => {
            setWizardInitialProduct(null);
            setWizardOpen(true);
          }}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Novo produto
        </button>
      </div>

      <ProductTable
        products={products}
        onOpenProductWizard={(p) => {
          setWizardInitialProduct(p);
          setWizardOpen(true);
        }}
      />

      <NewProductWizard
        open={wizardOpen}
        initialProduct={wizardInitialProduct}
        onClose={() => {
          setWizardOpen(false);
          setWizardInitialProduct(null);
        }}
      />
    </div>
  );
}

