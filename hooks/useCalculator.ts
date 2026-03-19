"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { calculatorSchema, type CalculatorFormValues } from "@/types";
import type { Product } from "@/types";
import { DEFAULT_MARKETPLACE_FEES } from "@/lib/constants";
import {
  computePricingFromFormValues,
  safeParseCalculatorValues,
} from "@/lib/pricingEngine";
import { useSettingsStore } from "@/store/settingsStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { useDebounce } from "./useDebounce";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { listSupplies, upsertProductMaterial } from "@/lib/supabaseProduction";
import { useRouter } from "next/navigation";

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback simples compatível com formato UUID v4
  // suficiente para o Supabase aceitar como uuid.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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
    material: { weight: 50, pricePerKg: 120, type: "PLA" as const, supplyId: undefined },
    time: {
      hours: 3,
      powerW,
      printerId: settings.printer?.defaultPrinterId || undefined,
      unitsPerBatch: 1,
    },
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
      cardFeePercent: settings.defaults.cardFeePercent ?? 0,
    },
    advanced: {
      taxaFalha: 10,
      maoDeObraTipo: "fixo" as const,
      maoDeObraValor: 0,
      tempoManualMin: 0,
      descontoPercentual: 0,
    },
  };
}

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

  const printerSettings = settings.printer ?? {
    presetId: undefined,
    customPowerW: undefined,
    customPresets: [],
  };

  const defaultValues = getDefaultValues(settings, printerSettings);

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
      const desiredMargin = lastInput.pricing.desiredMargin ?? settings.defaults.desiredMargin;
      const adjustedCost = lastResults.custoTotalAjustado;
      const directPrice = lastResults.suggestedPriceDirectCash ?? lastResults.suggestedPriceDirectCard ?? lastResults.suggestedPrice;
      const riskyChannels: string[] = [];
      if (lastResults.suggestedPriceShopee < adjustedCost) riskyChannels.push("Shopee");
      if (lastResults.suggestedPriceML < adjustedCost) riskyChannels.push("Mercado Livre");
      if (directPrice < adjustedCost) riskyChannels.push("Direto");
      const marginBelowTarget = lastResults.margemReal < desiredMargin;
      if (typeof window !== "undefined" && (riskyChannels.length > 0 || marginBelowTarget)) {
        const reasons: string[] = [];
        if (riskyChannels.length > 0) {
          reasons.push(`Preço abaixo do custo real ajustado em: ${riskyChannels.join(", ")}.`);
        }
        if (marginBelowTarget) {
          reasons.push(
            `Margem real (${lastResults.margemReal.toFixed(1)}%) abaixo da meta (${desiredMargin.toFixed(1)}%).`,
          );
        }
        const ok = window.confirm(
          `Atenção: esta simulação indica risco de prejuízo.\n\n${reasons.join("\n")}\n\nDeseja salvar mesmo assim?`,
        );
        if (!ok) {
          clearSaveRequested();
          return;
        }
      }

      const unitsPerBatch =
        typeof lastInput.time.unitsPerBatch === "number" && lastInput.time.unitsPerBatch > 0
          ? lastInput.time.unitsPerBatch
          : 1;
      const effectiveWeightPerUnit =
        typeof lastInput.material.plateWeight === "number" &&
        lastInput.material.plateWeight > 0 &&
        unitsPerBatch > 0
          ? lastInput.material.plateWeight / unitsPerBatch
          : lastInput.material.weight;

      const customName =
        typeof lastInput.productName === "string" ? lastInput.productName.trim() : "";
      const name =
        customName ||
        "Simulação " +
          new Date().toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          });
      const minutesFromHours =
        typeof lastInput.time.hours === "number" && Number.isFinite(lastInput.time.hours)
          ? Math.max(0, Math.round(lastInput.time.hours * 60))
          : null;

      const product: Product = {
        id: generateUuid(),
        name,
        // peso efetivo por peça (considera plateWeight/unidades do lote)
        weight: effectiveWeightPerUnit,
        price: lastResults.suggestedPrice,
        margin: Math.min(lastResults.cascataShopee.marginPercent, lastResults.cascataML.marginPercent),
        marketplace: "Shopee",
        currency: settings.currency ?? "BRL",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        suggestedPriceShopee: lastResults.suggestedPriceShopee,
        suggestedPriceML: lastResults.suggestedPriceML,
        totalCost: lastResults.totalCost,
        // Preenche automaticamente parte da ficha técnica:
        // tempo estimado em minutos baseado no tempo da simulação.
        printTimeMinutes: minutesFromHours,
        // Preenche impressora padrão do produto (para ordens) com a impressora selecionada na calculadora
        // ou, se não houver, com o padrão salvo em Impressoras.
        defaultPrinterId:
          (lastInput.time as any)?.printerId ||
          settings.printer?.defaultPrinterId ||
          null,
      };

      addProduct(product);

      if (user && typeof window !== "undefined") {
        const list = useProductsStore.getState().products;
        await upsertProductsForUser(user.id, list).catch(() => {});

        // Grava BOM (materiais) a partir da simulação quando houver supplyId do filamento
        // e o produto tiver ID compatível com a tabela UUID do Supabase.
        const supplyId = lastInput.material.supplyId;
        const isUuid = /^[0-9a-fA-F-]{36}$/.test(product.id);
        if (supplyId && isUuid) {
          try {
            const supplies = await listSupplies(user.id);
            const supply = supplies.find((s) => s.id === supplyId);
            if (supply) {
              const unit = (supply.unit ?? "").toLowerCase();
              const gramsPerPiece = effectiveWeightPerUnit;
              const qty =
                unit === "g"
                  ? gramsPerPiece
                  : unit === "kg"
                    ? gramsPerPiece / 1000
                    : gramsPerPiece;

              const nowIso = new Date().toISOString();
              await upsertProductMaterial(user.id, {
                productId: product.id,
                supplyId: supply.id,
                qty,
                unit: null,
                createdAt: nowIso,
                updatedAt: nowIso,
              });
            }
          } catch {
            // se falhar em gravar BOM, não bloqueia o fluxo de salvar produto
          }
        }
      }

      // Após salvar, levar para a aba Produtos.
      router.push("/products");
      clearSaveRequested();
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
    form,
    printerSettings,
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
    form.reset(getDefaultValues(settings, printerSettings));
    clearNewSimulationRequested();
  }, [newSimulationRequestedAt, form, settings, printerSettings, clearNewSimulationRequested]);

  useEffect(() => {
    const customPresets = printerSettings.customPresets ?? [];
    const selectedPrinterId = form.getValues("time.printerId") ?? "";
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
        // Se houver impressora selecionada, os custos dela são preenchidos pelo InputPanel.
        // Aqui só aplicamos defaults quando não há impressora selecionada.
        kwhPrice: selectedPrinterId ? form.getValues("costs.kwhPrice") : settings.defaults.kwhPrice,
        printerCost: selectedPrinterId ? form.getValues("costs.printerCost") : settings.defaults.printerCost,
        lifetimeHours: selectedPrinterId ? form.getValues("costs.lifetimeHours") : settings.defaults.lifetimeHours,
        residualValue: settings.defaults.residualValue ?? 0,
        annualMaintenance: settings.defaults.annualMaintenance ?? 0,
        infrastructureYear: settings.defaults.infrastructureYear ?? 0,
        yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
        packaging: settings.defaults.packaging,
      },
      time: {
        ...form.getValues("time"),
        // powerW também pode vir da impressora selecionada.
        powerW: selectedPrinterId ? form.getValues("time.powerW") : resolvedPowerW,
      },
      pricing: {
        ...form.getValues("pricing"),
        desiredMargin: settings.defaults.desiredMargin,
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

