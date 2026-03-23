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
import { isPlaceholderSupplyId } from "@/lib/supplyPlaceholders";
import { calcularCustoTotalAjustadoProduto } from "@/lib/precoCompleto";
import {
  computePricingFromFormValues,
  safeParseCalculatorValues,
} from "@/lib/pricingEngine";
import { SaveProductChannelDialog } from "@/components/calculator/SaveProductChannelDialog";
import type { SaveProductChannel } from "@/lib/productMarketplace";
import { saveCalculatorProductFromSnapshot } from "@/lib/saveCalculatorProduct";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { useSettingsStore } from "@/store/settingsStore";
import { calculatorSchema, type CalculatorFormValues } from "@/types";
import type { LabMarketplace } from "@/lib/pricingLocal";

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MargemCertaPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const [savingProduct, setSavingProduct] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
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

  const [productCost, setProductCost] = useState("0");
  const [packaging, setPackaging] = useState(() =>
    String(printingDefaults.costs.packaging ?? 0),
  );
  const [simulatedSnapshot, setSimulatedSnapshot] = useState<{
    price: number;
    marginPercent: number;
    marketplace: LabMarketplace;
  } | null>(null);
  const calcPreview = useMemo(() => {
    const parsed = safeParseCalculatorValues(printingForm.getValues());
    if (!parsed) return null;
    const result = computePricingFromFormValues(parsed);
    const adjustedTotal =
      typeof (result as { custoTotalAjustado?: number }).custoTotalAjustado ===
      "number"
        ? Number((result as { custoTotalAjustado?: number }).custoTotalAjustado)
        : Number(result.totalCost ?? 0);
    const baseTotal = Number(result.totalCost ?? 0);
    return {
      filamentCost: Number(result.filamentCost ?? 0),
      energyCost: Number(result.energyCost ?? 0),
      depreciationCost: Number(result.depreciationCost ?? 0),
      packagingCost: Number(result.packagingCost ?? 0),
      baseTotal,
      adjustedTotal,
      advancedAdjustment: adjustedTotal - baseTotal,
    };
  }, [watchedPrinting]);

  const printingFormValid = useMemo(
    () => calculatorSchema.safeParse(printingForm.getValues()).success,
    [watchedPrinting],
  );

  /** Com sync ligado e impressão inválida: não mostrar margem/preço (evita custo “fantasma” antigo). */
  const suppressMarginResults =
    syncPrintingCost && !printingFormValid;

  useEffect(() => {
    if (!syncPrintingCost) return;
    const parsed = calculatorSchema.safeParse(printingForm.getValues());
    if (!parsed.success) {
      const pack = Number(printingForm.getValues("costs.packaging") ?? 0);
      setProductCost("0");
      setPackaging(String(Math.round(pack * 100) / 100));
      return;
    }
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

  const runSaveWithChannel = async (channel: SaveProductChannel) => {
    const parsed = safeParseCalculatorValues(printingForm.getValues());
    if (!parsed) {
      window.alert(
        "Não foi possível usar os dados da impressão. Verifique peso, tempo e custos e tente de novo.",
      );
      return;
    }
    if (isPlaceholderSupplyId(parsed.material.supplyId)) {
      window.alert(
        "Selecione um filamento em «Filamento (preset de insumo)» nos parâmetros da impressão para salvar o material e a quantidade de insumo (gramas) no produto.",
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
        channel,
        overridePrice: simulatedSnapshot?.price,
        overrideMarginPercent: simulatedSnapshot?.marginPercent,
      });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveProduct = () => {
    const parsed = safeParseCalculatorValues(printingForm.getValues());
    if (!parsed) {
      window.alert(
        "Não foi possível usar os dados da impressão. Verifique peso, tempo e custos e tente de novo.",
      );
      return;
    }
    if (isPlaceholderSupplyId(parsed.material.supplyId)) {
      window.alert(
        "Selecione um filamento em «Filamento (preset de insumo)» nos parâmetros da impressão para salvar o material e a quantidade de insumo (gramas) no produto.",
      );
      return;
    }
    setSaveDialogOpen(true);
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
            onClick={() => handleSaveProduct()}
            disabled={savingProduct}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProduct ? "Salvando…" : "Salvar produto"}
          </button>
        </div>
      </div>

      <ContributionMarginPanel
        suppressResults={suppressMarginResults}
        suppressResultsMessage="Preencha os dados válidos da impressão acima (peso da peça ≥ 1 g, filamento, tempo, custos etc.) para calcular o custo e a margem de contribuição."
        defaultTargetMarginPercent={settings.defaults.desiredMargin}
        directMarginExtraPoints={settings.defaults.directMarginExtraPoints ?? 10}
        productCostStr={productCost}
        packagingStr={packaging}
        setProductCost={setProductCost}
        setPackaging={setPackaging}
        onSimulationChange={setSimulatedSnapshot}
        costInputsReadOnly={syncPrintingCost}
        showCostInputs
        topHint={
          <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
            Escolha o canal: <strong className="text-slate-400">Shopee</strong>,{" "}
            <strong className="text-slate-400">Mercado Livre</strong> (taxas e frete) ou{" "}
            <strong className="text-emerald-400/90">venda direta</strong> (sem comissão de
            plataforma). Impostos e frete seguem o que você informar.
          </p>
        }
      />
      <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">Resumo da produção</p>
        <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
          <li>
            Custo de Materiais: {formatBRL(calcPreview?.filamentCost ?? 0)}
          </li>
          <li>
            Custo de Energia: {formatBRL(calcPreview?.energyCost ?? 0)}
          </li>
          <li>
            Custo de Depreciação: {formatBRL(calcPreview?.depreciationCost ?? 0)}
          </li>
          <li>Embalagem: {formatBRL(calcPreview?.packagingCost ?? 0)}</li>
          {(calcPreview?.advancedAdjustment ?? 0) !== 0 ? (
            <li>
              Ajustes avançados (falha/mão de obra):{" "}
              {formatBRL(calcPreview?.advancedAdjustment ?? 0)}
            </li>
          ) : null}
          <li>
            Custo Total de Produção:{" "}
            <strong>{formatBRL(calcPreview?.adjustedTotal ?? 0)}</strong>
          </li>
        </ul>
      </div>

      <SaveProductChannelDialog
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onConfirm={(channel) => {
          setSaveDialogOpen(false);
          void runSaveWithChannel(channel);
        }}
      />
    </div>
  );
}
