import type { CalculatorFormValues, CalculatorResults, Product, SettingsValues } from "@/types";
import {
  productMarketplaceFromSaveChannel,
  type SaveProductChannel,
} from "@/lib/productMarketplace";
import { refreshProductsFromCloud } from "@/lib/productSync";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { listSupplies, upsertProductMaterial } from "@/lib/supabaseProduction";
import { isPlaceholderSupplyId } from "@/lib/supplyPlaceholders";

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
  /** Canal cujo preço e margem serão gravados no produto. */
  channel: SaveProductChannel;
};

function netMarginPercentDirectPix(
  lastResults: CalculatorResults,
  lastInput: CalculatorFormValues,
): number {
  const price = lastResults.suggestedPriceDirectCash ?? 0;
  if (price <= 0) return 0;
  const shipping = lastInput.pricing.shippingEstimate ?? 0;
  const taxRate = (lastInput.pricing.taxPercent ?? 0) / 100;
  const taxAmount = price * taxRate;
  const custo = lastResults.custoTotalAjustado;
  const net = price - shipping - taxAmount - custo;
  return (net / price) * 100;
}

/**
 * Mesmo fluxo do botão "Salvar produto" da Calculadora de markup:
 * confirmação de risco, cria produto, Supabase e redireciona para /products.
 */
export async function saveCalculatorProductFromSnapshot(
  deps: SaveCalculatorProductDeps,
): Promise<SaveCalculatorProductResult> {
  const { lastInput, lastResults, settings, user, addProduct, router, channel } = deps;

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

  if (user && typeof window !== "undefined" && isPlaceholderSupplyId(lastInput.material.supplyId)) {
    const ok = window.confirm(
      "Nenhum filamento (insumo) foi selecionado na calculadora. O produto será salvo sem vínculo de material na lista de insumos.\n\nDeseja continuar?",
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

  const marketplaceLabel = productMarketplaceFromSaveChannel(channel);
  const priceForChannel =
    channel === "shopee"
      ? lastResults.suggestedPriceShopee
      : channel === "mercado_livre"
        ? lastResults.suggestedPriceML
        : (lastResults.suggestedPriceDirectCash ?? lastResults.suggestedPrice);
  const marginForChannel =
    channel === "shopee"
      ? lastResults.cascataShopee.marginPercent
      : channel === "mercado_livre"
        ? lastResults.cascataML.marginPercent
        : netMarginPercentDirectPix(lastResults, lastInput);

  const product: Product = {
    id: generateUuid(),
    name,
    weight: effectiveWeightPerUnit,
    price: priceForChannel,
    margin: marginForChannel,
    marketplace: marketplaceLabel,
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
    // Sincroniza só o produto novo (evita upsert em massa do catálogo inteiro neste fluxo).
    const syncResult = await upsertProductsForUser(user.id, [product]);

    const supplyId = lastInput.material.supplyId;
    const productIdIsUuid = /^[0-9a-fA-F-]{36}$/.test(product.id);
    const canPersistBom =
      productIdIsUuid &&
      !isPlaceholderSupplyId(supplyId) &&
      typeof supplyId === "string";

    // BOM referencia products(id): só grava após o produto existir no Supabase (evita FK 23503).
    if (syncResult.ok && canPersistBom) {
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
        } else if (typeof window !== "undefined") {
          window.alert(
            "Filamento não encontrado na lista de insumos (pode ter sido removido). O produto foi salvo, mas o material não foi vinculado — adicione o material na lista de produtos.",
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("Falha ao gravar material do produto (BOM):", e);
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "";
        if (typeof window !== "undefined") {
          window.alert(
            msg
              ? `Não foi possível salvar o vínculo com o filamento: ${msg}`
              : "Não foi possível salvar o vínculo com o filamento. Tente de novo ou adicione o material na lista de produtos.",
          );
        }
      }
    } else if (!syncResult.ok && typeof window !== "undefined") {
      const detail = syncResult.message ? ` ${syncResult.message}` : "";
      window.alert(
        `Ocorreu um erro ao sincronizar com o servidor.${detail}\n\nPor favor, verifique sua conexão e tente novamente.${
          canPersistBom ? "\n\nO vínculo com o filamento não pôde ser gravado enquanto o produto não existir na nuvem." : ""
        }`,
      );
    }

    if (syncResult.ok) {
      try {
        await refreshProductsFromCloud(user.id);
      } catch {
        // Lista local já foi atualizada com addProduct; refresh é melhoria de consistência.
      }
    }
  }

  router.push("/products");
  return "saved";
}
