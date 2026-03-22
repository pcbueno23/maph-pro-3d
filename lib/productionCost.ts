import type { Product, Printer, ProductionOrder } from "@/types";
import { computeDefaultDirectSaleDesiredMargin } from "@/lib/calculatorFormDefaults";
import { calculatorMarketplaceFromProductChannel } from "@/lib/productMarketplace";
import { calculateAllWithPrinter } from "@/lib/calculations";
import { defaultSettings, useSettingsStore } from "@/store/settingsStore";
import { supabase } from "@/lib/supabaseClient";

// Calcula custo unitário completo (material + energia + depreciação + embalagem)
// para um produto, usando impressora padrão e tempo estimado quando disponíveis.
export async function computeProductUnitCost(userId: string, product: Product): Promise<{
  totalCost: number;
  materialCost: number;
  energyCost: number;
  depreciationCost: number;
  packagingCost: number;
}> {
  if (!supabase) {
    return {
      totalCost: product.totalCost ?? 0,
      materialCost: 0,
      energyCost: 0,
      depreciationCost: 0,
      packagingCost: 0,
    };
  }

  const settings = useSettingsStore.getState().settings ?? defaultSettings;
  const packagingCost = settings.defaults.packaging;

  // BOM / materiais — sempre (relatórios e ordens precisam do custo mesmo sem impressora no cadastro).
  const { data: bomRows } = await supabase
    .from("product_materials")
    .select(
      `
      qty,
      supply:supplies (
        unit_cost
      )
    `,
    )
    .eq("user_id", userId)
    .eq("product_id", product.id);

  const materialCost =
    bomRows?.reduce((acc: number, row: any) => {
      const unitCost = Number(row.supply?.unit_cost ?? 0);
      return acc + Number(row.qty ?? 0) * unitCost;
    }, 0) ?? 0;

  // Busca impressora padrão
  let printer: Printer | null = null;
  if (product.defaultPrinterId) {
    const { data } = await supabase
      .from("printers")
      .select("*")
      .eq("user_id", userId)
      .eq("id", product.defaultPrinterId)
      .maybeSingle();
    if (data) {
      printer = {
        id: data.id,
        userId: data.user_id,
        name: data.name,
        model: data.model,
        powerW: Number(data.power_w ?? 0),
        energyRateBrlKwh: Number(data.energy_rate_brl_kwh ?? settings.defaults.kwhPrice),
        status: data.status,
        purchaseValue:
          data.purchase_value == null ? null : Number(data.purchase_value),
        usefulLifeHours:
          data.useful_life_hours == null ? null : Number(data.useful_life_hours),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    }
  }

  // Sem impressora ou tempo: material (BOM) + embalagem, ou custo salvo no produto se não houver BOM.
  if (!printer || !product.printTimeMinutes || product.printTimeMinutes <= 0) {
    const totalCost =
      materialCost > 0 ? materialCost + packagingCost : (product.totalCost ?? 0);
    return {
      totalCost,
      materialCost,
      energyCost: 0,
      depreciationCost: 0,
      packagingCost,
    };
  }

  // Monta um "snapshot" mínimo da calculadora para usar o motor existente.
  const hours = product.printTimeMinutes / 60;
  const formValues = {
    productName: product.name,
    material: {
      weight: product.weight,
      plateWeight: undefined,
      pricePerKg: 0, // custo de material vem do BOM abaixo
      type: "PLA" as const,
      // Neste contexto não usamos o preset de insumo da calculadora,
      // apenas o BOM; fornecemos uma string vazia para satisfazer o tipo.
      supplyId: "",
    },
    time: {
      hours,
      powerW: printer.powerW,
      unitsPerBatch: 1,
    },
    costs: {
      kwhPrice: printer.energyRateBrlKwh ?? settings.defaults.kwhPrice,
      printerCost: printer.purchaseValue ?? settings.defaults.printerCost,
      lifetimeHours: printer.usefulLifeHours ?? settings.defaults.lifetimeHours,
      residualValue: settings.defaults.residualValue ?? 0,
      annualMaintenance: settings.defaults.annualMaintenance ?? 0,
      infrastructureYear: settings.defaults.infrastructureYear ?? 0,
      yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
      packaging: settings.defaults.packaging,
    },
    pricing: {
      marketplace: calculatorMarketplaceFromProductChannel(product.marketplace),
      personType: "CPF" as const,
      marketplaceFee: settings.defaults.shopeeBaseCommission,
      desiredMargin: settings.defaults.desiredMargin,
      directSaleDesiredMargin: computeDefaultDirectSaleDesiredMargin(
        settings.defaults.desiredMargin,
        settings.defaults.directMarginExtraPoints ?? 10,
      ),
      shippingEstimate: settings.defaults.shippingEstimateDefault ?? 0,
      taxPercent: 0,
      taxMode: settings.defaults.taxMode ?? "net_marketplace",
      mlClassic: settings.defaults.mlClassic ?? false,
      freeShipping: settings.defaults.shopeeFreeShippingDefault ?? false,
      discountPercent: 0,
      cardFeePercent: settings.defaults.cardFeePercent ?? 0,
      comparePrice: undefined,
    },
    advanced: {
      taxaFalha: 0,
      maoDeObraTipo: "fixo" as const,
      maoDeObraValor: 0,
      tempoManualMin: 0,
      descontoPercentual: 0,
    },
  } satisfies any;

  // Usamos o motor com impressora para energia/depreciação; o material vem do BOM acima.
  const result = calculateAllWithPrinter({
    input: {
      ...formValues,
      material: {
        ...formValues.material,
        pricePerKg: 0,
      },
    },
    printer,
    residualValue: settings.defaults.residualValue ?? 0,
    annualMaintenance: settings.defaults.annualMaintenance ?? 0,
    infrastructureYear: settings.defaults.infrastructureYear ?? 0,
    yearlyPrintHours: settings.defaults.yearlyPrintHours ?? 1000,
  });

  const energyCost = result.energyCost;
  const depreciationCost = result.depreciationCost;
  const totalCost = materialCost + energyCost + depreciationCost + packagingCost;

  return {
    totalCost,
    materialCost,
    energyCost,
    depreciationCost,
    packagingCost,
  };
}

// Cálculo de custo total de uma ordem (produto × quantidade).
export async function computeOrderTotalCost(
  userId: string,
  order: ProductionOrder,
  product: Product,
): Promise<number> {
  const unit = await computeProductUnitCost(userId, product);
  return unit.totalCost * order.quantity;
}

