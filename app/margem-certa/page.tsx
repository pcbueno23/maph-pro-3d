"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { InputPanel } from "@/components/calculator/InputPanel";
import { ContributionMarginPanel } from "@/components/calculator/ContributionMarginPanel";
import {
  applySettingsToCalculatorForm,
  getPrinterSettingsSlice,
} from "@/lib/calculatorFormDefaults";
import {
  buildLabPrintingFormDefaults,
  LAB_PRINTING_SUPPLY_FALLBACK_ID,
} from "@/lib/calculatorLabDefaults";
import { calcularCustoTotalAjustadoProduto } from "@/lib/precoCompleto";
import {
  computePricingFromFormValues,
  safeParseCalculatorValues,
} from "@/lib/pricingEngine";
import { saveCalculatorProductFromSnapshot } from "@/lib/saveCalculatorProduct";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { useSettingsStore } from "@/store/settingsStore";
import { calculatorSchema, type CalculatorFormValues } from "@/types";

export default function MargemCertaPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const [savingProduct, setSavingProduct] = useState(false);
  const printerSettings = useMemo(() => getPrinterSettingsSlice(settings), [settings]);
  const printingDefaults = useMemo(
    () => buildLabPrintingFormDefaults(settings),
    [settings],
  );

  const printingForm = useForm<CalculatorFormValues>({
    resolver: zodResolver(calculatorSchema) as Resolver<CalculatorFormValues>,
    mode: "onChange",
    defaultValues: printingDefaults,
  });

  const watchedPrinting = useWatch({ control: printingForm.control });
  const [syncPrintingCost, setSyncPrintingCost] = useState(true);

  const [productCost, setProductCost] = useState("25");
  const [packaging, setPackaging] = useState("3");

  useEffect(() => {
    if (!syncPrintingCost) return;
    const parsed = calculatorSchema.safeParse(printingForm.getValues());
    if (!parsed.success) return;
    const total = calcularCustoTotalAjustadoProduto(parsed.data);
    const pack = Number(parsed.data.costs.packaging ?? 0);
    const productOnly = Math.max(0, total - pack);
    setProductCost(String(Math.round(productOnly * 100) / 100));
    setPackaging(String(Math.round(pack * 100) / 100));
  }, [watchedPrinting, syncPrintingCost]);

  /** Mesmo comportamento da Calculadora de markup: ao salvar Configurações, reaplica ajustes avançados e presets de impressora. */
  useEffect(() => {
    printingForm.reset(
      applySettingsToCalculatorForm(
        printingForm.getValues(),
        settings,
        printerSettings,
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSaveProduct = async () => {
    const parsed = safeParseCalculatorValues(printingForm.getValues());
    if (!parsed) {
      window.alert(
        "Não foi possível usar os dados da impressão. Verifique peso, tempo e custos e tente de novo.",
      );
      return;
    }
    const results = computePricingFromFormValues(parsed);
    setSavingProduct(true);
    try {
      await saveCalculatorProductFromSnapshot({
        lastInput: parsed,
        lastResults: results,
        settings,
        user,
        addProduct,
        router,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-50 md:text-2xl">
          Calculadora margem certa
        </h1>
      </div>

      <div className="space-y-3 rounded-2xl border border-cyan-900/40 bg-slate-950/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-cyan-300">
            Parâmetros da impressão 3D
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="rounded border-slate-600"
              checked={syncPrintingCost}
              onChange={(e) => setSyncPrintingCost(e.target.checked)}
            />
            <span>Atualizar custo do produto e embalagem automaticamente</span>
          </label>
        </div>
        <InputPanel
          form={printingForm}
          hidePricingSection
          materialSupplyFallbackId={LAB_PRINTING_SUPPLY_FALLBACK_ID}
        />
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => void handleSaveProduct()}
            disabled={savingProduct}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProduct ? "Salvando…" : "Salvar produto"}
          </button>
        </div>
      </div>

      <ContributionMarginPanel
        defaultTargetMarginPercent={settings.defaults.desiredMargin}
        productCostStr={productCost}
        packagingStr={packaging}
        setProductCost={setProductCost}
        setPackaging={setPackaging}
        costInputsReadOnly={syncPrintingCost}
        showCostInputs
        topHint={
          <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
            Abaixo, a margem é calculada com as <strong className="text-slate-400">taxas do marketplace</strong>{" "}
            (Shopee em faixas fixas), <strong className="text-slate-400">frete no Mercado Livre</strong> e{" "}
            <strong className="text-slate-400">impostos</strong>, de acordo com o que você preencher.
          </p>
        }
      />
    </div>
  );
}
