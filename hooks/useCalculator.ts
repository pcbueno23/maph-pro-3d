"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculatorSchema, type CalculatorFormValues } from "@/types";
import type { Product } from "@/types";
import { DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";
import { calculateAll } from "@/lib/calculations";
import { useSettingsStore } from "@/store/settingsStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { useDebounce } from "./useDebounce";
import { upsertProductsForUser } from "@/lib/supabaseProducts";

function getDefaultValues(
  settings: ReturnType<typeof useSettingsStore.getState>["settings"],
  printerSettings: { presetId?: string; customPowerW?: number; customPresets?: { id: string; averagePowerW: number }[] },
) {
  const customPresets = printerSettings.customPresets ?? [];
  const fromCustom =
    typeof printerSettings.presetId === "string" && printerSettings.presetId.startsWith("custom:")
      ? customPresets.find((p) => p.id === printerSettings.presetId!.slice("custom:".length))?.averagePowerW
      : undefined;
  const powerW = printerSettings.customPowerW ?? fromCustom ?? 250;
  return {
    productName: "",
    material: { weight: 50, pricePerKg: 120, type: "PLA" as const },
    time: { hours: 3, powerW },
    costs: {
      kwhPrice: settings.defaults.kwhPrice,
      printerCost: settings.defaults.printerCost,
      lifetimeHours: settings.defaults.lifetimeHours,
      residualValue: settings.defaults.residualValue ?? 0,
      annualMaintenance: settings.defaults.annualMaintenance ?? 0,
      infrastructureYear: settings.defaults.infrastructureYear ?? 0,
      yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
      packaging: settings.defaults.packaging,
    },
    pricing: {
      marketplace: "Shopee" as const,
      personType: "CPF" as const,
      marketplaceFee: DEFAULT_MARKETPLACE_FEES["Shopee"].CPF,
      desiredMargin: settings.defaults.desiredMargin,
      shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
      taxPercent: 0,
      taxMode: settings.defaults.taxMode ?? "net_marketplace",
      mlClassic: settings.defaults.mlClassic ?? false,
      freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
      discountPercent: 0,
      comparePrice: undefined as number | undefined,
    },
  };
}

export function useCalculator() {
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const {
    setLastCalculation,
    saveRequested,
    clearSaveRequested,
    lastInput,
    lastResults,
    productToLoad,
    setProductToLoad,
    stlPreset,
    setStlPreset,
  } = useCalculatorStore();
  const addProduct = useProductsStore((s) => s.addProduct);

  const printerSettings = settings.printer ?? {
    presetId: undefined,
    customPowerW: undefined,
    customPresets: [],
  };

  const defaultValues = getDefaultValues(settings, printerSettings);

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema),
    mode: "onChange",
    defaultValues,
  });

  const watched = form.watch();
  const debouncedValues = useDebounce(watched, 300);

  const results = useMemo(() => {
    try {
      const parsed = calculatorSchema.parse(debouncedValues);
      return calculateAll(parsed);
    } catch {
      return null;
    }
  }, [debouncedValues]);

  useEffect(() => {
    if (results) {
      try {
        const parsed = calculatorSchema.parse(debouncedValues);
        setLastCalculation(parsed, results);
      } catch {
        // ignore
      }
    }
  }, [debouncedValues, results, setLastCalculation]);

  useEffect(() => {
    if (!saveRequested || !lastInput || !lastResults) {
      if (saveRequested) clearSaveRequested();
      return;
    }

    const customName =
      typeof lastInput.productName === "string"
        ? lastInput.productName.trim()
        : "";
    const name =
      customName ||
      "Simulação " +
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
    const product: Product = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `prod_${Date.now()}`,
      name,
      weight: lastInput.material.weight,
      price: lastResults.suggestedPrice,
      margin: Math.min(
        lastResults.cascataShopee.marginPercent,
        lastResults.cascataML.marginPercent,
      ),
      marketplace: "Shopee",
      currency: settings.currency ?? "BRL",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      suggestedPriceShopee: lastResults.suggestedPriceShopee,
      suggestedPriceML: lastResults.suggestedPriceML,
      totalCost: lastResults.totalCost,
    };

    addProduct(product);

    if (user && typeof window !== "undefined") {
      const list = useProductsStore.getState().products;
      upsertProductsForUser(user.id, list).catch(() => {});
    }

    form.reset(getDefaultValues(settings, printerSettings));
    clearSaveRequested();
  }, [saveRequested, lastInput, lastResults, clearSaveRequested, addProduct, user, settings, form, printerSettings]);

  useEffect(() => {
    const customPresets = printerSettings.customPresets ?? [];
    const resolvedPowerW = (() => {
      if (printerSettings.customPowerW) return printerSettings.customPowerW;
      if (
        typeof printerSettings.presetId === "string" &&
        printerSettings.presetId.startsWith("custom:")
      ) {
        const id = printerSettings.presetId.slice("custom:".length);
        const preset = customPresets.find((p) => p.id === id);
        if (preset) return preset.averagePowerW;
      }
      return form.getValues("time.powerW");
    })();

    form.reset({
      ...form.getValues(),
      costs: {
        ...form.getValues("costs"),
        kwhPrice: settings.defaults.kwhPrice,
        printerCost: settings.defaults.printerCost,
        lifetimeHours: settings.defaults.lifetimeHours,
        residualValue: settings.defaults.residualValue ?? 0,
        annualMaintenance: settings.defaults.annualMaintenance ?? 0,
        infrastructureYear: settings.defaults.infrastructureYear ?? 0,
        yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
        packaging: settings.defaults.packaging,
      },
      time: {
        ...form.getValues("time"),
        powerW: resolvedPowerW,
      },
      pricing: {
        ...form.getValues("pricing"),
        shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
        taxMode: settings.defaults.taxMode ?? "net_marketplace",
        mlClassic: settings.defaults.mlClassic ?? false,
        freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  useEffect(() => {
    if (productToLoad) {
      const fee =
        DEFAULT_MARKETPLACE_FEES[productToLoad.marketplace]?.CPF ??
        defaultValues.pricing.marketplaceFee;
      form.reset({
        ...defaultValues,
        productName: productToLoad.name ?? "",
        material: {
          ...defaultValues.material,
          weight: productToLoad.weight,
        },
        pricing: {
          ...defaultValues.pricing,
          marketplace: productToLoad.marketplace,
          desiredMargin: productToLoad.margin ?? defaultValues.pricing.desiredMargin,
          marketplaceFee: fee,
        },
      });
      setProductToLoad(null);
    }
  }, [productToLoad, setProductToLoad, form, defaultValues]);

  // Aplicar preset vindo do analisador STL
  useEffect(() => {
    if (!stlPreset) return;

    const current = form.getValues();
    const hours = Math.max(0, Math.floor((stlPreset.estimatedMinutes ?? 0) / 60));
    const minutes = Math.max(0, (stlPreset.estimatedMinutes ?? 0) % 60);
    const totalHours = hours + minutes / 60;

    form.reset({
      ...current,
      material: {
        ...current.material,
        weight: stlPreset.weightGrams,
      },
      time: {
        ...current.time,
        hours: totalHours,
      },
    });

    setStlPreset(null);
  }, [stlPreset, form, setStlPreset]);

  const isDirty = form.formState.isDirty;

  return { form, results, isDirty };
}

