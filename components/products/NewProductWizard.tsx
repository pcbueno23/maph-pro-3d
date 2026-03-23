"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useProductsStore } from "@/store/productsStore";
import type {
  CalculatorFormValues,
  Printer,
  Product,
  ProductMarketplaceChannel,
  SupplyItem,
} from "@/types";
import {
  listPrinters,
  listSupplies,
  listProductMaterials,
  uploadProductFile,
  upsertProductMaterial,
  deleteProductMaterial,
} from "@/lib/supabaseProduction";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { InputPanel } from "@/components/calculator/InputPanel";
import {
  calcEnergyCostFromPrinter,
  calcDepreciationFromPrinter,
  calcSuggestedPrice,
} from "@/lib/calculations";
import {
  applySettingsToCalculatorForm,
  getPrinterSettingsSlice,
} from "@/lib/calculatorFormDefaults";
import {
  buildLabPrintingFormDefaults,
  LAB_PRINTING_SUPPLY_FALLBACK_ID,
  isPlaceholderSupplyId,
} from "@/lib/calculatorLabDefaults";
import {
  getShopeeSuggestedPrice,
  getMLSuggestedPrice,
  getShopeeFeeBreakdown,
  getMLFeeBreakdown,
} from "@/lib/marketplaceFees";
import { ContributionMarginPanel } from "@/components/calculator/ContributionMarginPanel";
import type { LabMarketplace } from "@/lib/pricingLocal";
import {
  computePricingFromFormValues,
  safeParseCalculatorValues,
} from "@/lib/pricingEngine";
import { calculatorSchema } from "@/types";
const STEPS = [
  { id: 1, label: "Informações" },
  { id: 2, label: "Materiais" },
  { id: 3, label: "Uploads" },
  { id: 4, label: "Preço" },
] as const;

type BomLine = {
  /** ID da linha em `product_materials` ao editar produto existente */
  materialRowId?: string;
  materialCreatedAt?: string;
  supplyId: string;
  name: string;
  unit: string;
  unitCost: number;
  qty: number;
  /** Linha gerada automaticamente a partir da aba Informações (calculadora). */
  autoFromCalculator?: boolean;
};

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface NewProductWizardProps {
  open: boolean;
  onClose: () => void;
  /** Se informado, abre o mesmo fluxo do novo produto com dados preenchidos (ex.: vindo da calculadora). */
  initialProduct?: Product | null;
}

function resetWizardForm(params: {
  defaultMargin: number;
  setStep: (n: number) => void;
  setName: (s: string) => void;
  setSku: (s: string) => void;
  setDescription: (s: string) => void;
  setPrintHours: (v: number | "") => void;
  setPrintMinutes: (v: number | "") => void;
  setDefaultPrinterId: (v: string | null) => void;
  setMaterials: (m: BomLine[]) => void;
  setMainImage: (f: File | null) => void;
  setExtraFiles: (f: File[]) => void;
  setMarginPercent: (v: number | "") => void;
  setPrice: (n: number) => void;
  setMarketplace: (m: ProductMarketplaceChannel) => void;
  setError: (e: string | null) => void;
}) {
  params.setStep(1);
  params.setName("");
  params.setSku("");
  params.setDescription("");
  params.setPrintHours(0);
  params.setPrintMinutes(0);
  params.setDefaultPrinterId(null);
  params.setMaterials([]);
  params.setMainImage(null);
  params.setExtraFiles([]);
  params.setMarginPercent(params.defaultMargin);
  params.setPrice(0);
  params.setMarketplace("Shopee");
  params.setError(null);
}

export function NewProductWizard({ open, onClose, initialProduct = null }: NewProductWizardProps) {
  const user = useAuthStore((s) => s.user);
  const { settings } = useSettingsStore();
  const { addProduct, updateProduct } = useProductsStore();
  const [mounted, setMounted] = useState(false);

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [printHours, setPrintHours] = useState<number | "">(0);
  const [printMinutes, setPrintMinutes] = useState<number | "">(0);
  const [defaultPrinterId, setDefaultPrinterId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<BomLine[]>([]);
  const [addSupplyId, setAddSupplyId] = useState("");
  const [addQty, setAddQty] = useState<number | "">("");
  const [mainImage, setMainImage] = useState<File | null>(null);
  const [extraFiles, setExtraFiles] = useState<File[]>([]);
  const defaultMargin = Number(settings?.defaults?.desiredMargin ?? 45);
  const [marginPercent, setMarginPercent] = useState<number | "">(defaultMargin);
  const [price, setPrice] = useState<number>(0);
  const [marketplace, setMarketplace] = useState<ProductMarketplaceChannel>("Shopee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [panelProductCost, setPanelProductCost] = useState("0");
  const [panelPackaging, setPanelPackaging] = useState("0");
  const [simulatedSnapshot, setSimulatedSnapshot] = useState<{
    price: number;
    marginPercent: number;
    marketplace: LabMarketplace;
  } | null>(null);

  const isEditMode = Boolean(initialProduct?.id);
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
  const watchedPrinting = printingForm.watch();

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  useEffect(() => {
    const calcName = printingForm.getValues("productName")?.trim() ?? "";
    if (calcName && !isEditMode) {
      setName(calcName);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printingForm.watch("productName"), isEditMode]);

  useEffect(() => {
    if (!user || !open) return;
    let alive = true;
    Promise.all([listPrinters(user.id), listSupplies(user.id)])
      .then(([p, s]) => {
        if (!alive) return;
        setPrinters(p);
        setSupplies(s);
      })
      .catch(() => {
        if (!alive) return;
        setPrinters([]);
        setSupplies([]);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, open]);

  /** Novo produto (vazio) ou edição (preencher a partir do produto + BOM). */
  useEffect(() => {
    if (!open || !mounted) return;

    if (!initialProduct) {
      resetWizardForm({
        defaultMargin,
        setStep,
        setName,
        setSku,
        setDescription,
        setPrintHours,
        setPrintMinutes,
        setDefaultPrinterId,
        setMaterials,
        setMainImage,
        setExtraFiles,
        setMarginPercent,
        setPrice,
        setMarketplace,
        setError,
      });
      printingForm.reset(printingDefaults);
      setLoadingInitial(false);
      return;
    }

    if (!user) {
      setError("Faça login para editar o produto com materiais e uploads.");
      setLoadingInitial(false);
      return;
    }

    let alive = true;
    setLoadingInitial(true);
    setError(null);

    void (async () => {
      try {
        const p = initialProduct;
        const mins = p.printTimeMinutes ?? 0;
        setStep(1);
        setName(p.name);
        setSku(p.sku ?? "");
        setDescription(p.description ?? "");
        setPrintHours(Math.floor(mins / 60));
        setPrintMinutes(mins % 60);
        setDefaultPrinterId(p.defaultPrinterId ?? null);
        setPrice(p.price);
        setMarketplace(p.marketplace);
        setMarginPercent(
          p.margin != null && Number.isFinite(p.margin) ? p.margin : defaultMargin,
        );
        setMainImage(null);
        setExtraFiles([]);

        const [supRows, mats] = await Promise.all([
          listSupplies(user.id),
          listProductMaterials(user.id, p.id),
        ]);
        if (!alive) return;
        const supMap = new Map(supRows.map((s) => [s.id, s] as const));
        const bom: BomLine[] = mats.map((m) => {
          const s = supMap.get(m.supplyId);
          return {
            materialRowId: m.id,
            materialCreatedAt: m.createdAt,
            supplyId: m.supplyId,
            name: s?.name ?? "Insumo",
            unit: s?.unit ?? "un",
            unitCost: s?.unitCost ?? 0,
            qty: m.qty,
          };
        });
        setMaterials(bom);

        const firstMat = mats[0];
        const firstSupply = firstMat ? supMap.get(firstMat.supplyId) : null;
        const unit = (firstSupply?.unit ?? "").toLowerCase();
        const pricePerKg =
          firstSupply && Number.isFinite(Number(firstSupply.unitCost))
            ? unit === "g"
              ? Number(firstSupply.unitCost) * 1000
              : Number(firstSupply.unitCost)
            : 0;
        const timeHours =
          p.printTimeMinutes != null && Number.isFinite(p.printTimeMinutes)
            ? Math.max(0, p.printTimeMinutes / 60)
            : 0;
        const merged = applySettingsToCalculatorForm(
          {
            ...printingDefaults,
            productName: p.name ?? "",
            material: {
              ...printingDefaults.material,
              supplyId:
                firstMat?.supplyId && firstMat.supplyId.trim()
                  ? firstMat.supplyId
                  : LAB_PRINTING_SUPPLY_FALLBACK_ID,
              weight:
                typeof p.weight === "number" && Number.isFinite(p.weight)
                  ? Math.max(0, p.weight)
                  : 0,
              pricePerKg:
                pricePerKg > 0
                  ? pricePerKg
                  : printingDefaults.material.pricePerKg,
              plateWeight: undefined,
            },
            time: {
              ...printingDefaults.time,
              hours: timeHours,
              printerId: p.defaultPrinterId ?? undefined,
              unitsPerBatch: 1,
            },
            costs: {
              ...printingDefaults.costs,
              packaging:
                typeof settings.defaults.packaging === "number"
                  ? settings.defaults.packaging
                  : printingDefaults.costs.packaging,
            },
          },
          settings,
          printerSettings,
        );
        printingForm.reset(merged);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Falha ao carregar o produto.");
      } finally {
        if (alive) setLoadingInitial(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    open,
    mounted,
    initialProduct?.id,
    user?.id,
    defaultMargin,
    printingForm,
    printingDefaults,
    settings,
    printerSettings,
  ]);

  const selectedPrinter = useMemo(
    () => (defaultPrinterId ? printers.find((p) => p.id === defaultPrinterId) ?? null : null),
    [printers, defaultPrinterId],
  );

  const printTimeHours = useMemo(() => {
    const h = typeof printHours === "number" && Number.isFinite(printHours) ? printHours : 0;
    const m = typeof printMinutes === "number" && Number.isFinite(printMinutes) ? printMinutes : 0;
    return h + m / 60;
  }, [printHours, printMinutes]);

  const materialCost = useMemo(
    () => materials.reduce((acc, m) => acc + m.qty * m.unitCost, 0),
    [materials],
  );

  const { energyCost, depreciationCost, packagingCost, totalCost } = useMemo(() => {
    const def = settings?.defaults;
    const packaging = Number(def?.packaging ?? 3);

    if (!selectedPrinter || printTimeHours <= 0) {
      const total = materialCost + packaging;
      return {
        energyCost: 0,
        depreciationCost: 0,
        packagingCost: packaging,
        totalCost: total,
      };
    }

    const energyCost = calcEnergyCostFromPrinter({
      printer: selectedPrinter,
      printHours: printTimeHours,
    });
    const depreciationCost = calcDepreciationFromPrinter({
      printer: selectedPrinter,
      printHours: printTimeHours,
      residualValue: def?.residualValue ?? 0,
      annualMaintenance: def?.annualMaintenance ?? 0,
      infrastructureYear: def?.infrastructureYear ?? 0,
      yearlyPrintHours: def?.yearlyPrintHours ?? 1000,
    });
    const totalCost = materialCost + energyCost + depreciationCost + packaging;
    return { energyCost, depreciationCost, packagingCost: packaging, totalCost };
  }, [selectedPrinter, printTimeHours, materialCost, settings?.defaults]);

  const lastEditedByRef = useRef<"margin" | "price" | null>(null);

  const pricingFromMargin = useMemo(() => {
    const margin = typeof marginPercent === "number" && Number.isFinite(marginPercent) ? marginPercent : 0;
    const shippingAmount = Number(settings?.defaults?.shippingEstimateDefault ?? 0);
    const taxPercent = 0;
    const freeShipping = settings?.defaults?.shopeeFreeShippingDefault ?? false;
    const classic = settings?.defaults?.mlClassic ?? false;
    const personType = "CPF" as const;

    if (marketplace === "Venda Direta") {
      const directSuggested = calcSuggestedPrice({
        totalCost,
        marketplaceFeePercent: 0,
        desiredMarginPercent: margin,
        shippingAmount,
        taxPercent,
      });
      const shopeeSuggested = getShopeeSuggestedPrice({
        totalCost,
        shippingAmount,
        taxPercent,
        desiredMarginPercent: margin,
        freeShipping,
        personType,
      });
      const mlSuggested = getMLSuggestedPrice({
        totalCost,
        shippingAmount,
        taxPercent,
        desiredMarginPercent: margin,
        personType,
        classic,
      });
      return {
        shopeeSuggested,
        mlSuggested,
        directSuggested,
        worstSuggested: directSuggested,
      };
    }

    const shopeeSuggested = getShopeeSuggestedPrice({
      totalCost,
      shippingAmount,
      taxPercent,
      desiredMarginPercent: margin,
      freeShipping,
      personType,
    });

    const mlSuggested = getMLSuggestedPrice({
      totalCost,
      shippingAmount,
      taxPercent,
      desiredMarginPercent: margin,
      personType,
      classic,
    });

    const directSuggested = calcSuggestedPrice({
      totalCost,
      marketplaceFeePercent: 0,
      desiredMarginPercent: margin,
      shippingAmount,
      taxPercent,
    });

    return {
      shopeeSuggested,
      mlSuggested,
      directSuggested,
      worstSuggested: Math.max(shopeeSuggested, mlSuggested),
    };
  }, [totalCost, marginPercent, settings?.defaults, marketplace]);

  useEffect(() => {
    if (step !== 4) return;
    if (totalCost <= 0) return;
    if (lastEditedByRef.current === "price") return;
    // Ao abrir/editar produto, mantém o preço salvo até o usuário mudar parâmetros na etapa de preço.
    if (isEditMode && lastEditedByRef.current !== "margin") return;
    setPrice(pricingFromMargin.worstSuggested);
  }, [pricingFromMargin.worstSuggested, step, totalCost, marketplace, isEditMode]);

  useEffect(() => {
    const parsed = safeParseCalculatorValues(watchedPrinting);
    if (!parsed) return;
    const result = computePricingFromFormValues(parsed);
    const packaging = Number(parsed.costs.packaging ?? 0);
    const productOnly = Math.max(0, result.custoTotalAjustado - packaging);
    setPanelProductCost(String(Math.round(productOnly * 100) / 100));
    setPanelPackaging(String(Math.round(packaging * 100) / 100));
  }, [watchedPrinting]);

  useEffect(() => {
    if (step !== 2) return;
    const parsed = safeParseCalculatorValues(printingForm.getValues());
    if (!parsed) return;
    const supplyId = parsed.material.supplyId;
    const qty = Number(parsed.material.weight ?? 0);
    if (!supplyId || isPlaceholderSupplyId(supplyId) || !(qty > 0)) return;
    const supply = supplies.find((s) => s.id === supplyId);
    if (!supply) return;

    setMaterials((prev) => {
      const existing = prev.find((m) => m.supplyId === supplyId);
      if (existing) {
        // Se a linha já veio da calculadora, mantém sincronizada com o peso da aba Informações.
        if (existing.autoFromCalculator) {
          return prev.map((m) =>
            m.supplyId === supplyId
              ? {
                  ...m,
                  qty,
                  name: supply.name,
                  unit: supply.unit ?? "un",
                  unitCost: supply.unitCost ?? 0,
                }
              : m,
          );
        }
        return prev;
      }
      return [
        {
          supplyId,
          name: supply.name,
          unit: supply.unit ?? "un",
          unitCost: supply.unitCost ?? 0,
          qty,
          autoFromCalculator: true,
        },
        ...prev,
      ];
    });
  }, [step, supplies, printingForm, watchedPrinting]);

  useEffect(() => {
    if (step === 4 && totalCost > 0 && (marginPercent === "" || marginPercent === 0)) {
      setMarginPercent(defaultMargin);
    }
  }, [step, totalCost, marginPercent, defaultMargin]);

  const computeWorstMarginForPrice = (sellingPrice: number): number => {
    if (sellingPrice <= 0 || totalCost <= 0) return 0;

    const shippingAmount = Number(settings?.defaults?.shippingEstimateDefault ?? 0);
    const taxPercent = 0;
    const taxMode = settings?.defaults?.taxMode ?? "net_marketplace";
    const freeShipping = settings?.defaults?.shopeeFreeShippingDefault ?? false;
    const classic = settings?.defaults?.mlClassic ?? false;
    const personType = "CPF" as const;

    const computeTaxAmount = (priceForTax: number, commissionRateDecimal: number): number => {
      if (taxPercent <= 0 || priceForTax <= 0) return 0;
      const rate = taxPercent / 100;
      if (taxMode === "net_marketplace") {
        const netBase = priceForTax * (1 - commissionRateDecimal);
        return netBase * rate;
      }
      return priceForTax * rate;
    };

    if (marketplace === "Venda Direta") {
      const taxAmt = computeTaxAmount(sellingPrice, 0);
      const netProfit = sellingPrice - shippingAmount - taxAmt - totalCost;
      return sellingPrice > 0 ? (netProfit / sellingPrice) * 100 : 0;
    }

    const sh = getShopeeFeeBreakdown(sellingPrice, personType, freeShipping);
    const shTax = computeTaxAmount(sellingPrice, sh.commissionRateDecimal);
    const shFeeAmount = sh.commissionAmount + sh.fixedFeeAmount;
    const shNetProfit = sellingPrice - shFeeAmount - shippingAmount - shTax - totalCost;
    const shMargin = (shNetProfit / sellingPrice) * 100;

    const ml = getMLFeeBreakdown(sellingPrice, personType, classic);
    const mlTax = computeTaxAmount(sellingPrice, ml.commissionRateDecimal);
    const mlFeeAmount = ml.commissionAmount + ml.fixedFeeAmount;
    const mlNetProfit = sellingPrice - mlFeeAmount - shippingAmount - mlTax - totalCost;
    const mlMargin = (mlNetProfit / sellingPrice) * 100;

    return Math.min(shMargin, mlMargin);
  };

  const outrosCustosFromPrice = useMemo(() => {
    if (price <= 0) return 0;

    const shippingAmount = Number(settings?.defaults?.shippingEstimateDefault ?? 0);
    const taxPercent = 0;
    const taxMode = settings?.defaults?.taxMode ?? "net_marketplace";
    const freeShipping = settings?.defaults?.shopeeFreeShippingDefault ?? false;
    const classic = settings?.defaults?.mlClassic ?? false;
    const personType = "CPF" as const;

    const computeTaxAmount = (priceForTax: number, commissionRateDecimal: number): number => {
      if (taxPercent <= 0 || priceForTax <= 0) return 0;
      const rate = taxPercent / 100;
      if (taxMode === "net_marketplace") {
        const netBase = priceForTax * (1 - commissionRateDecimal);
        return netBase * rate;
      }
      return priceForTax * rate;
    };

    if (marketplace === "Venda Direta") {
      const taxAmt = computeTaxAmount(price, 0);
      return shippingAmount + taxAmt;
    }

    const sh = getShopeeFeeBreakdown(price, personType, freeShipping);
    const shTax = computeTaxAmount(price, sh.commissionRateDecimal);
    const shOther = (sh.commissionAmount + sh.fixedFeeAmount) + shippingAmount + shTax;

    const ml = getMLFeeBreakdown(price, personType, classic);
    const mlTax = computeTaxAmount(price, ml.commissionRateDecimal);
    const mlOther = (ml.commissionAmount + ml.fixedFeeAmount) + shippingAmount + mlTax;

    return Math.max(shOther, mlOther);
  }, [price, settings?.defaults, marketplace]);

  function handleAddMaterial() {
    const supply = supplies.find((s) => s.id === addSupplyId);
    if (!supply || addQty === "" || Number(addQty) <= 0) return;
    const qty = Number(addQty);
    if (materials.some((m) => m.supplyId === supply.id)) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.supplyId === supply.id ? { ...m, qty: m.qty + qty } : m,
        ),
      );
    } else {
      setMaterials((prev) => [
        ...prev,
        {
          supplyId: supply.id,
          name: supply.name,
          unit: supply.unit ?? "un",
          unitCost: supply.unitCost ?? 0,
          qty,
        },
      ]);
    }
    setAddSupplyId("");
    setAddQty("");
  }

  function removeMaterial(supplyId: string) {
    setMaterials((prev) => prev.filter((m) => m.supplyId !== supplyId));
  }

  function handleMarginChange(value: number | "") {
    lastEditedByRef.current = "margin";
    setMarginPercent(value);
  }

  function handlePriceChange(value: number) {
    lastEditedByRef.current = "price";
    setPrice(value);
    setMarginPercent(computeWorstMarginForPrice(value));
  }

  async function handleCreate() {
    setError(null);
    const parsedCalc = safeParseCalculatorValues(printingForm.getValues());
    if (!parsedCalc) {
      setError("Preencha os campos da calculadora antes de salvar.");
      return;
    }
    const calcName = (parsedCalc.productName ?? "").trim();
    const finalName = name.trim() || calcName;
    if (!finalName) {
      setError("Informe o nome do produto.");
      return;
    }
    const calcResults = computePricingFromFormValues(parsedCalc);
    const unitsPerBatch =
      typeof parsedCalc.time.unitsPerBatch === "number" &&
      parsedCalc.time.unitsPerBatch > 0
        ? parsedCalc.time.unitsPerBatch
        : 1;
    const effectiveWeightPerUnit =
      typeof parsedCalc.material.plateWeight === "number" &&
      parsedCalc.material.plateWeight > 0 &&
      unitsPerBatch > 0
        ? parsedCalc.material.plateWeight / unitsPerBatch
        : parsedCalc.material.weight;

    const finalPrice =
      simulatedSnapshot && simulatedSnapshot.price > 0 ? simulatedSnapshot.price : price;
    const finalMargin =
      simulatedSnapshot &&
      Number.isFinite(simulatedSnapshot.marginPercent)
        ? simulatedSnapshot.marginPercent
        : typeof marginPercent === "number" && Number.isFinite(marginPercent)
          ? marginPercent
          : null;
    const finalMarketplace: ProductMarketplaceChannel =
      simulatedSnapshot?.marketplace === "direct"
        ? "Venda Direta"
        : simulatedSnapshot?.marketplace === "mercado_livre"
          ? "Mercado Livre"
          : simulatedSnapshot?.marketplace === "shopee"
            ? "Shopee"
            : marketplace;

    setSaving(true);
    const nowIso = new Date().toISOString();
    const productId = initialProduct?.id ?? generateUuid();

    const product: Product = {
      id: productId,
      name: finalName,
      sku: sku.trim() || null,
      description: description.trim() || null,
      weight: effectiveWeightPerUnit || 0,
      price: finalPrice,
      margin: finalMargin,
      marketplace: finalMarketplace,
      currency: "BRL",
      createdAt: initialProduct?.createdAt ?? nowIso,
      updatedAt: nowIso,
      totalCost: calcResults.custoTotalAjustado,
      suggestedPriceShopee: calcResults.suggestedPriceShopee,
      suggestedPriceML: calcResults.suggestedPriceML,
      suggestedPriceDirect:
        calcResults.suggestedPriceDirectCash ?? calcResults.suggestedPrice,
      printTimeMinutes: Math.round(parsedCalc.time.hours * 60) || null,
      defaultPrinterId: parsedCalc.time.printerId ?? null,
    };

    if (initialProduct) {
      updateProduct(product);
    } else {
      addProduct(product);
    }

    if (user) {
      try {
        const list = useProductsStore.getState().products;
        await upsertProductsForUser(user.id, list);

        const autoBomQty =
          typeof parsedCalc.material.weight === "number" &&
          Number.isFinite(parsedCalc.material.weight)
            ? parsedCalc.material.weight
            : 0;
        const autoBomSupplyId = parsedCalc.material.supplyId;
        const canAutoBom =
          !isPlaceholderSupplyId(autoBomSupplyId) &&
          typeof autoBomSupplyId === "string" &&
          autoBomQty > 0;

        if (initialProduct) {
          const existing = await listProductMaterials(user.id, productId);
          for (const ex of existing) {
            if (!materials.some((m) => m.materialRowId === ex.id)) {
              await deleteProductMaterial(user.id, ex.id);
            }
          }
          for (const m of materials) {
            await upsertProductMaterial(user.id, {
              id: m.materialRowId,
              productId,
              supplyId: m.supplyId,
              qty: m.qty,
              unit: m.unit,
              createdAt: m.materialCreatedAt ?? nowIso,
              updatedAt: nowIso,
            });
          }
          if (canAutoBom && !materials.some((m) => m.supplyId === autoBomSupplyId)) {
            await upsertProductMaterial(user.id, {
              id: generateUuid(),
              productId,
              supplyId: autoBomSupplyId,
              qty: autoBomQty,
              unit: "g",
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        } else {
          if (materials.length > 0) {
            for (const m of materials) {
              await upsertProductMaterial(user.id, {
                id: generateUuid(),
                productId,
                supplyId: m.supplyId,
                qty: m.qty,
                unit: m.unit,
                createdAt: nowIso,
                updatedAt: nowIso,
              });
            }
          } else if (canAutoBom) {
            await upsertProductMaterial(user.id, {
              id: generateUuid(),
              productId,
              supplyId: autoBomSupplyId,
              qty: autoBomQty,
              unit: "g",
              createdAt: nowIso,
              updatedAt: nowIso,
            });
          }
        }

        const uploads: Array<Promise<unknown>> = [];
        if (mainImage) {
          uploads.push(
            uploadProductFile({
              userId: user.id,
              productId,
              kind: "image",
              file: mainImage,
            }),
          );
        }
        for (const f of extraFiles) {
          uploads.push(
            uploadProductFile({
              userId: user.id,
              productId,
              kind: "file",
              file: f,
            }),
          );
        }
        if (uploads.length > 0) {
          await Promise.all(uploads);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onClose();
    resetWizardForm({
      defaultMargin,
      setStep,
      setName,
      setSku,
      setDescription,
      setPrintHours,
      setPrintMinutes,
      setDefaultPrinterId,
      setMaterials,
      setMainImage,
      setExtraFiles,
      setMarginPercent,
      setPrice,
      setMarketplace,
      setError,
    });
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] grid place-items-center bg-slate-950/80 p-2 md:p-4">
      <div className="flex h-[95dvh] w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl md:h-[min(94dvh,980px)]">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-50">
            {isEditMode ? "Editar produto" : "Novo produto"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Fechar"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-800 px-4 py-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                step === s.id
                  ? "bg-cyan-500/20 text-cyan-300"
                  : step > s.id
                    ? "text-emerald-400"
                    : "text-slate-500"
              }`}
            >
              {step > s.id ? (
                <span className="text-emerald-400">✓</span>
              ) : (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                    step === s.id ? "bg-cyan-500 text-slate-900" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {s.id}
                </span>
              )}
              {s.label}
            </div>
          ))}
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto p-4">
          {loadingInitial && initialProduct ? (
            <div className="absolute inset-0 z-10 grid place-items-center rounded-xl bg-slate-950/70 backdrop-blur-sm">
              <p className="text-sm text-slate-300">Carregando produto…</p>
            </div>
          ) : null}
          {error && (
            <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-100">
                <p className="font-semibold">Dica</p>
                <p>
                  Preencha os mesmos campos da Calculadora margem certa (passo a
                  passo). Assim o produto salvo fica coerente com a simulação.
                </p>
              </div>
              <InputPanel
                form={printingForm}
                hidePricingSection
                materialSupplyFallbackId={LAB_PRINTING_SUPPLY_FALLBACK_ID}
              />
              <div>
                <label className="mb-1 block text-xs text-slate-400">SKU (opcional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: PROD-001"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o produto"
                  rows={2}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-300">
                <p className="font-semibold text-slate-200">Opcional</p>
                <p>
                  Adicione uma imagem para destacar seu produto e arquivos como STL, 3MF, OBJ,
                  GCODE ou documentação.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Imagem principal</label>
                <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-slate-500">
                  {mainImage ? mainImage.name : 'Clique em "Selecionar Imagem" para adicionar'}
                </div>
                <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                  Selecionar Imagem
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setMainImage(f);
                    }}
                  />
                </label>
                {mainImage ? (
                  <button
                    type="button"
                    onClick={() => setMainImage(null)}
                    className="ml-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Remover
                  </button>
                ) : null}
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Arquivos adicionais (3MF, STL, GCODE, PDF, etc.)
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                  Adicionar Arquivos
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length > 0) setExtraFiles((prev) => [...prev, ...files]);
                    }}
                  />
                </label>
                {extraFiles.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">Nenhum arquivo adicionado</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    {extraFiles.map((f, idx) => (
                      <li key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2">
                        <span className="truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setExtraFiles((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Adicione os materiais (insumos) necessários para produzir este produto.
              </p>
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-[10px] text-slate-500">Insumo</label>
                    <select
                      value={addSupplyId}
                      onChange={(e) => setAddSupplyId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                    >
                      <option value="">Digite para pesquisar...</option>
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-[10px] text-slate-500">
                      Quantidade (em {supplies.find((s) => s.id === addSupplyId)?.unit ?? "—"})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={addQty}
                      onChange={(e) =>
                        setAddQty(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Ex: 250"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                  >
                    + Adicionar Material
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-slate-400">Materiais adicionados</p>
                {materials.length === 0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 py-6 text-center text-sm text-slate-500">
                    Nenhum material adicionado
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {materials.map((m) => (
                      <li
                        key={m.supplyId}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-200">
                          {m.name} — {m.qty.toLocaleString("pt-BR")} {m.unit} × {formatBRL(m.unitCost)} ={" "}
                          {formatBRL(m.qty * m.unitCost)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMaterial(m.supplyId)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-rose-400"
                        >
                          🗑
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                <span className="font-semibold">Custo Total de Material:</span>{" "}
                <span className="font-bold text-amber-300">{formatBRL(materialCost)}</span>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-300">
                Esta etapa serve para complementar materiais, se precisar. O material
                principal preenchido na aba Informações já entra automaticamente.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <ContributionMarginPanel
                sectionTitle="Simulação de preço (igual à margem certa)"
                productCostStr={panelProductCost}
                packagingStr={panelPackaging}
                setProductCost={setPanelProductCost}
                setPackaging={setPanelPackaging}
                showCostInputs
                costInputsReadOnly
                stickyResultPanel
                defaultTargetMarginPercent={settings.defaults.desiredMargin}
                directMarginExtraPoints={settings.defaults.directMarginExtraPoints ?? 10}
                topHint={
                  <p className="mb-2 text-[11px] leading-relaxed text-slate-500">
                    Esta etapa usa os mesmos campos da calculadora margem certa. O produto
                    será salvo com o preço exibido na simulação atual.
                  </p>
                }
                onSimulationChange={(snap) => {
                  setSimulatedSnapshot(snap);
                  if (snap.price > 0) {
                    setPrice(snap.price);
                    setMarginPercent(snap.marginPercent);
                  }
                }}
              />
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Resumo da produção</p>
                <ul className="mt-1 space-y-0.5 text-sm text-slate-300">
                  <li>Custo de Materiais: {formatBRL(materialCost)}</li>
                  <li>Custo de Energia: {formatBRL(energyCost)}</li>
                  <li>Custo de Depreciação: {formatBRL(depreciationCost)}</li>
                  <li>Embalagem: {formatBRL(packagingCost)}</li>
                  <li>
                    Custo Total de Produção: <strong>{formatBRL(totalCost)}</strong>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-between gap-2 border-t border-slate-800 px-4 py-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !name.trim()) || loadingInitial}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || loadingInitial}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? "Salvando…" : isEditMode ? "Salvar alterações" : "Criar produto"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
