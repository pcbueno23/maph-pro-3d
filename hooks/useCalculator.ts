"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculatorSchema, type CalculatorFormValues } from "@/types";
import { DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";
import {
  applySettingsToCalculatorForm,
  getCalculatorFormDefaults,
  getPrinterSettingsSlice,
} from "@/lib/calculatorFormDefaults";
import {
  computePricingFromFormValues,
  safeParseCalculatorValues,
} from "@/lib/pricingEngine";
import { useSettingsStore } from "@/store/settingsStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { useDebounce } from "./useDebounce";
import { saveCalculatorProductFromSnapshot } from "@/lib/saveCalculatorProduct";
import { useRouter } from "next/navigation";

export function useCalculator() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const {
    setLastCalculation,
    saveRequested,
    saveRequestedAt,
    clearSaveRequested,
    newSimulationRequestedAt,
    clearNewSimulationRequested,
    lastInput,
    lastResults,
    productToLoad,
    setProductToLoad,
    stlPreset,
    setStlPreset,
  } = useCalculatorStore();
  const addProduct = useProductsStore((s) => s.addProduct);

  const printerSettings = getPrinterSettingsSlice(settings);

  const defaultValues = getCalculatorFormDefaults(settings, printerSettings);

  const form = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema) as Resolver<CalculatorFormValues>,
    mode: "onChange",
    defaultValues,
  });

  const watched = form.watch();
  const debouncedValues = useDebounce(watched, 300);

  const results = useMemo(() => {
    const parsed = safeParseCalculatorValues(debouncedValues);
    if (!parsed) return null;
    return computePricingFromFormValues(parsed);
  }, [debouncedValues]);

  // Garante que cada pedido de save (timestamp) seja processado apenas uma vez,
  // mesmo com o StrictMode chamando o efeito em duplicidade no dev.
  const lastHandledSaveAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (results) {
      const parsed = safeParseCalculatorValues(debouncedValues);
      if (parsed) {
        setLastCalculation(parsed, results);
      }
    }
  }, [debouncedValues, results, setLastCalculation]);

  useEffect(() => {
    if (!saveRequested || !lastInput || !lastResults || !saveRequestedAt) {
      if (saveRequested) clearSaveRequested();
      return;
    }

    if (lastHandledSaveAtRef.current === saveRequestedAt) {
      // já processamos este pedido de save
      clearSaveRequested();
      return;
    }
    lastHandledSaveAtRef.current = saveRequestedAt;

    void (async () => {
      try {
        await saveCalculatorProductFromSnapshot({
          lastInput,
          lastResults,
          settings,
          user,
          addProduct,
          router,
        });
      } finally {
        clearSaveRequested();
      }
    })();
  }, [
    saveRequested,
    saveRequestedAt,
    lastInput,
    lastResults,
    clearSaveRequested,
    addProduct,
    user,
    settings,
    router,
  ]);

  const lastNewSimulationAtRef = useRef<number | null>(null);
  useEffect(() => {
    if (!newSimulationRequestedAt) return;
    if (lastNewSimulationAtRef.current === newSimulationRequestedAt) {
      clearNewSimulationRequested();
      return;
    }
    lastNewSimulationAtRef.current = newSimulationRequestedAt;
    form.reset(getCalculatorFormDefaults(settings, printerSettings));
    clearNewSimulationRequested();
  }, [newSimulationRequestedAt, form, settings, printerSettings, clearNewSimulationRequested]);

  useEffect(() => {
    form.reset(
      applySettingsToCalculatorForm(form.getValues(), settings, printerSettings),
    );
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

