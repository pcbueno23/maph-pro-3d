import { create } from "zustand";
import type { SettingsValues } from "@/types";

// Chave única para as configurações no localStorage
const STORAGE_KEY = "precifica3d-settings-v3";

interface SettingsState {
  settings: SettingsValues;
  updateSettings: (next: SettingsValues) => void;
}

export const defaultSettings: SettingsValues = {
  currency: "BRL",
  defaults: {
    kwhPrice: 1.2,
    printerCost: 2500,
    residualValue: 0,
    lifetimeHours: 4000,
    annualMaintenance: 0,
    infrastructureYear: 0,
    yearlyPrintHours: 1000,
    packaging: 3,
    desiredMargin: 45,
    shippingEstimateDefault: 0,
    shopeeFreeShippingDefault: false,
    taxMode: "net_marketplace",
    mlClassic: false,
  },
  printer: {
    presetId: "",
    customName: "",
    customPowerW: undefined,
    customPrinterCost: undefined,
    customLifetimeHours: undefined,
    customAnnualMaintenance: undefined,
    customYearlyPrintHours: undefined,
    customPresets: [],
  },
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings:
    typeof window === "undefined"
      ? defaultSettings
      : (() => {
          try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return defaultSettings;
            const parsed = JSON.parse(raw) as SettingsValues;
            return {
              ...defaultSettings,
              ...parsed,
              defaults: {
                ...defaultSettings.defaults,
                ...(parsed.defaults ?? defaultSettings.defaults),
              },
              printer: {
                ...defaultSettings.printer,
                ...(parsed.printer ?? defaultSettings.printer),
              },
            };
          } catch {
            return defaultSettings;
          }
        })(),
  updateSettings: (next) => {
    set({ settings: next });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  },
}));
