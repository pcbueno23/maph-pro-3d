import { create } from "zustand";
import type { SaveProductChannel } from "@/lib/productMarketplace";
import type { CalculatorResults, CalculatorFormValues } from "@/types";
import type { Product } from "@/types";

interface CalculatorState {
  lastInput: CalculatorFormValues | null;
  lastResults: CalculatorResults | null;
  saveRequested: boolean;
  /** Timestamp (ms) da última vez que o usuário pediu para salvar. */
  saveRequestedAt: number | null;
  /** Canal escolhido no modal (Shopee / ML / venda direta). */
  saveChannel: SaveProductChannel | null;
  /** Timestamp (ms) da última vez que o usuário pediu para nova simulação (zerar formulário). */
  newSimulationRequestedAt: number | null;
  productToLoad: Product | null;
  stlPreset: { weightGrams: number; estimatedMinutes: number } | null;
  setLastCalculation: (
    input: CalculatorFormValues,
    results: CalculatorResults,
  ) => void;
  requestSave: (channel: SaveProductChannel) => void;
  clearSaveRequested: () => void;
  requestNewSimulation: () => void;
  clearNewSimulationRequested: () => void;
  setProductToLoad: (product: Product | null) => void;
  setStlPreset: (data: { weightGrams: number; estimatedMinutes: number } | null) => void;
  /** Zera estado da calculadora (última conta, produto para carregar, preset STL). Usado no logout. */
  clearOnLogout: () => void;
}

export const useCalculatorStore = create<CalculatorState>((set) => ({
  lastInput: null,
  lastResults: null,
  saveRequested: false,
  saveRequestedAt: null,
  saveChannel: null,
  newSimulationRequestedAt: null as number | null,
  productToLoad: null,
  stlPreset: null,
  clearOnLogout: () =>
    set({
      lastInput: null,
      lastResults: null,
      productToLoad: null,
      stlPreset: null,
      saveRequested: false,
      saveRequestedAt: null,
      saveChannel: null,
    }),
  setLastCalculation: (input, results) =>
    set({
      lastInput: input,
      lastResults: results,
    }),
  requestSave: (channel) =>
    set({
      saveRequested: true,
      saveRequestedAt: Date.now(),
      saveChannel: channel,
    }),
  clearSaveRequested: () =>
    set({
      saveRequested: false,
      saveChannel: null,
    }),
  requestNewSimulation: () =>
    set({
      newSimulationRequestedAt: Date.now(),
    }),
  clearNewSimulationRequested: () =>
    set({
      newSimulationRequestedAt: null,
    }),
  setProductToLoad: (product) => set({ productToLoad: product }),
  setStlPreset: (data) => set({ stlPreset: data }),
}));

