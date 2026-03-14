import { create } from "zustand";
import type { Product } from "@/types";

const STORAGE_KEY = "precifica3d-products";

interface ProductsState {
  products: Product[];
  hydrateFromStorage: () => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  hydrateFromCloud: (products: Product[]) => void;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
  products: [],
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Product[];
        set({ products: parsed });
        return;
      } catch {
        // ignore
      }
    }
    // Sem dados no localStorage: manter lista vazia (não pré-preencher com exemplos)
    set({ products: [] });
  },
  addProduct: (product: Product) => {
    const next = [product, ...get().products];
    set({ products: next });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  removeProduct: (id: string) => {
    const next = get().products.filter((p) => p.id !== id);
    set({ products: next });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  hydrateFromCloud: (products: Product[]) => {
    set({ products });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
  },
}));

