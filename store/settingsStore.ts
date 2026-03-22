import { create } from "zustand";
import type { SettingsValues } from "@/types";
import { CALCULATOR_ADVANCED_DEFAULTS } from "@/types";

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
    // Margem padrão inicial da calculadora; pode ser sobrescrita em /settings.
    desiredMargin: 30,
    shippingEstimateDefault: 0,
    shopeeFreeShippingDefault: false,
    taxMode: "net_marketplace",
    mlClassic: false,
    shopeeBaseCommission: 14,
    shopeeFreeShippingCommission: 20,
    mlClassicCommission: 13,
    mlPremiumCommission: 16,
    // taxa padrão de cartão para venda direta (crédito)
    cardFeePercent: 4.99,
    /** Pontos a mais na margem de venda direta vs margem marketplace (pré-preenche a calculadora). */
    directMarginExtraPoints: 10,
  },
  printer: {
    presetId: "",
    customName: "",
    defaultPrinterId: "",
    customPowerW: undefined,
    customPrinterCost: undefined,
    customLifetimeHours: undefined,
    customAnnualMaintenance: undefined,
    customYearlyPrintHours: undefined,
    customPresets: [],
  },
  advanced: { ...CALCULATOR_ADVANCED_DEFAULTS },
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
              advanced: {
                ...defaultSettings.advanced,
                ...(parsed.advanced ?? defaultSettings.advanced),
              },
            };
          } catch {
            return defaultSettings;
          }
        })(),
  updateSettings: (next) => {
    set((state) => {
      const merged: SettingsValues = {
        ...state.settings,
        ...next,
        defaults: {
          ...state.settings.defaults,
          ...(next.defaults ?? {}),
        },
        printer: {
          ...state.settings.printer,
          ...(next.printer ?? {}),
        },
        advanced: {
          ...state.settings.advanced,
          ...(next.advanced ?? {}),
        },
      };
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return { settings: merged };
    });
  },
}));
