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

    const sample: Product[] = [
      {
        id: "sample-1",
        name: "Organizador de Bits 3D",
        weight: 85,
        price: 39.9,
        margin: 55,
        marketplace: "Shopee",
        currency: "BRL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "sample-2",
        name: "Suporte de Fio – Bambu",
        weight: 120,
        price: 59.9,
        margin: 48,
        marketplace: "Mercado Livre",
        currency: "BRL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    set({ products: sample });
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sample));
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

