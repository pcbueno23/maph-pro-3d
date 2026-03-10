import { create } from "zustand";

export type SalesChannel = "Shopee" | "ML";

export interface Sale {
  id: string;
  date: string;
  itemId: string;
  productName: string;
  sku: string;
  channel: SalesChannel;
  quantity: number;
  unitPrice: number;
  revenue: number;
  unitProductionCost: number;
  netProfit: number;
}

interface SalesState {
  sales: Sale[];
  hydrateFromStorage: () => void;
  /** Preenche vendas com dados da nuvem (e grava no localStorage). */
  hydrateFromCloud: (sales: Sale[]) => void;
  registerSale: (sale: Omit<Sale, "id" | "date">) => void;
  removeSale: (id: string) => void;
  clearSales: () => void;
}

const STORAGE_KEY = "precifica3d-sales";

export const useSalesStore = create<SalesState>((set, get) => ({
  sales: [],
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Sale[];
      if (Array.isArray(parsed)) {
        set({ sales: parsed });
      }
    } catch {
      // ignore
    }
  },
  hydrateFromCloud: (sales) => {
    set({ sales });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    }
  },
  registerSale: (saleInput) => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sale_${Date.now()}`;
    const now = new Date().toISOString();
    const sale: Sale = { id, date: now, ...saleInput };
    const next = [...get().sales, sale];
    set({ sales: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  removeSale: (id) => {
    const next = get().sales.filter((s) => s.id !== id);
    set({ sales: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
  clearSales: () => {
    set({ sales: [] });
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  },
}));

