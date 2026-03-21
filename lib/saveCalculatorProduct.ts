import type { CalculatorFormValues, CalculatorResults, Product, SettingsValues } from "@/types";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { listSupplies, upsertProductMaterial } from "@/lib/supabaseProduction";
import { useProductsStore } from "@/store/productsStore";

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type SaveCalculatorProductResult = "saved" | "user_cancelled";

export type SaveCalculatorProductDeps = {
  lastInput: CalculatorFormValues;
  lastResults: CalculatorResults;
  settings: SettingsValues;
  user: { id: string } | null;
  addProduct: (p: Product) => void;
  router: { push: (path: string) => void };
};

/**
 * Mesmo fluxo do botão "Salvar produto" da Calculadora de markup:
 * confirmação de risco, cria produto, Supabase e redireciona para /products.
 */
export async function saveCalculatorProductFromSnapshot(
  deps: SaveCalculatorProductDeps,
): Promise<SaveCalculatorProductResult> {
  const { lastInput, lastResults, settings, user, addProduct, router } = deps;

  const desiredMargin = lastInput.pricing.desiredMargin ?? settings.defaults.desiredMargin;
  const adjustedCost = lastResults.custoTotalAjustado;
  const directPrice =
    lastResults.suggestedPriceDirectCash ??
    lastResults.suggestedPriceDirectCard ??
    lastResults.suggestedPrice;
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
    if (!ok) return "user_cancelled";
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
    printTimeMinutes: minutesFromHours,
    defaultPrinterId:
      (lastInput.time as { printerId?: string }).printerId ||
      settings.printer?.defaultPrinterId ||
      null,
  };

  addProduct(product);

  if (user && typeof window !== "undefined") {
    const list = useProductsStore.getState().products;
    await upsertProductsForUser(user.id, list).catch(() => {});

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

  router.push("/products");
  return "saved";
}
