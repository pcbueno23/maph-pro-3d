import { create } from "zustand";
import type { Product } from "@/types";

export interface InventoryItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  marketplace: string;
  marginPercent: number;
  /** Preços sugeridos por canal no momento do lançamento (se disponíveis). */
  suggestedPriceShopee?: number;
  suggestedPriceML?: number;
  /** Custo de produção unitário no momento do lançamento (se disponível). */
  productionCost?: number;
  createdAt: string;
  updatedAt: string;
}

interface InventoryState {
  items: InventoryItem[];
  hydrateFromStorage: () => void;
  upsertFromProduct: (product: Product, quantity: number, sku?: string) => void;
  updateItem: (item: InventoryItem) => void;
  removeItem: (id: string) => void;
}

const STORAGE_KEY = "precifica3d-inventory";

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as InventoryItem[];
      if (Array.isArray(parsed)) {
        set({ items: parsed });
      }
    } catch {
      // ignore
    }
  },
  upsertFromProduct: (product, quantity, sku) => {
    const now = new Date().toISOString();
    const existing = get().items.find((i) => i.productId === product.id);
    let next: InventoryItem[];
    if (existing) {
      const updated: InventoryItem = {
        ...existing,
        sku: sku ?? existing.sku,
        quantity: existing.quantity + quantity,
        price: product.price,
        marginPercent: product.margin ?? existing.marginPercent,
        suggestedPriceShopee: product.suggestedPriceShopee ?? existing.suggestedPriceShopee,
        suggestedPriceML: product.suggestedPriceML ?? existing.suggestedPriceML,
        productionCost: product.totalCost ?? existing.productionCost,
        updatedAt: now,
      };
      next = get().items.map((i) => (i.id === existing.id ? updated : i));
    } else {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `inv_${Date.now()}`;
      const item: InventoryItem = {
        id,
        productId: product.id,
        name: product.name,
        sku: sku ?? "",
        quantity,
        price: product.price,
        marketplace: product.marketplace,
        marginPercent: product.margin ?? 0,
        suggestedPriceShopee: product.suggestedPriceShopee,
        suggestedPriceML: product.suggestedPriceML,
        productionCost: product.totalCost,
        createdAt: now,
        updatedAt: now,
      };
      next = [...get().items, item];
    }
    set({ items: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  updateItem: (item) => {
    const next = get().items.map((i) => (i.id === item.id ? item : i));
    set({ items: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  removeItem: (id) => {
    const next = get().items.filter((i) => i.id !== id);
    set({ items: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
}));

