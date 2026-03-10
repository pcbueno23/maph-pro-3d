import { create } from "zustand";

export type SupplyKind = "filament" | "ink" | "other";

export interface Supply {
  id: string;
  name: string;
  kind: SupplyKind;
  unit: string; // ex.: "kg", "ml", "un"
  unitCost: number; // custo por unidade (ex.: R$/kg)
  stockQty: number;
}

interface SuppliesState {
  supplies: Supply[];
  addSupply: (s: Supply) => void;
  updateSupply: (s: Supply) => void;
  removeSupply: (id: string) => void;
  hydrateFromStorage: () => void;
  /** Consome uma quantidade de filamento em gramas, percorrendo os insumos de tipo filament. */
  consumeFilamentGrams: (grams: number) => void;
}

const STORAGE_KEY = "precifica3d-supplies";

function persist(next: Supply[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
}

export const useSuppliesStore = create<SuppliesState>((set, get) => ({
  supplies: [],
  hydrateFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Supply[];
      if (Array.isArray(parsed)) {
        set({ supplies: parsed });
      }
    } catch {
      // ignore
    }
  },
  addSupply: (s) => {
    const next = [...get().supplies, s];
    set({ supplies: next });
    persist(next);
  },
  updateSupply: (s) => {
    const next = get().supplies.map((x) => (x.id === s.id ? s : x));
    set({ supplies: next });
    persist(next);
  },
  removeSupply: (id) => {
    const next = get().supplies.filter((x) => x.id !== id);
    set({ supplies: next });
    persist(next);
  },
  consumeFilamentGrams: (grams) => {
    if (grams <= 0) return;
    const current = [...get().supplies];
    let remaining = grams;
    for (let i = 0; i < current.length && remaining > 0; i += 1) {
      const s = current[i];
      if (s.kind !== "filament") continue;
      // converte estoque para gramas
      let stockGrams = 0;
      if (s.unit === "kg") stockGrams = s.stockQty * 1000;
      else if (s.unit === "g") stockGrams = s.stockQty;
      else continue;

      if (stockGrams <= 0) continue;
      const consume = Math.min(stockGrams, remaining);
      stockGrams -= consume;
      remaining -= consume;

      const newStock =
        s.unit === "kg" ? stockGrams / 1000 : stockGrams; // mantém unidade original
      current[i] = { ...s, stockQty: newStock };
    }
    set({ supplies: current });
    persist(current);
  },
}));

