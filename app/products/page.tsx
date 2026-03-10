"use client";

import { ProductTable } from "@/components/products/ProductTable";
import { useProductsStore } from "@/store/productsStore";
import { useEffect } from "react";

export default function ProductsPage() {
  const { products, hydrateFromStorage } = useProductsStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Produtos salvos
      </h1>
      <ProductTable products={products} />
    </div>
  );
}

