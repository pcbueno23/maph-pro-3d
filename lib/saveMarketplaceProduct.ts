import type { Product, SettingsValues } from "@/types";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { refreshProductsFromCloud } from "@/lib/productSync";

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

export type MarketplaceProductPayload = {
  name: string;
  weightGrams: number;
  /** Preço final do canal (o que será usado em `price`). */
  channelPrice: number;
  /** Margem líquida em % do canal (pode ser null se não houver). */
  channelMarginPercent: number | null;
  marketplace: Product["marketplace"];
  /** Preços sugeridos por canal (para dashboards). */
  suggestedPriceShopee?: number;
  suggestedPriceML?: number;
  suggestedPriceDirect?: number;
  /** Custo unitário base (custo 3D) */
  totalCost?: number;
};

export async function saveMarketplaceProduct(params: {
  payload: MarketplaceProductPayload;
  settings: SettingsValues;
  user: { id: string } | null;
  addProduct: (p: Product) => void;
  router: { push: (path: string) => void };
}) {
  const { payload, settings, user, addProduct, router } = params;

  const now = new Date().toISOString();
  const product: Product = {
    id: generateUuid(),
    name: payload.name,
    weight: Math.max(0, payload.weightGrams),
    price: payload.channelPrice,
    margin: payload.channelMarginPercent,
    marketplace: payload.marketplace,
    currency: settings.currency ?? "BRL",
    createdAt: now,
    updatedAt: now,
    suggestedPriceShopee: payload.suggestedPriceShopee,
    suggestedPriceML: payload.suggestedPriceML,
    suggestedPriceDirect: payload.suggestedPriceDirect,
    totalCost: payload.totalCost,
  };

  addProduct(product);

  if (user && typeof window !== "undefined") {
    const sync = await upsertProductsForUser(user.id, [product]);
    if (sync.ok) {
      try {
        await refreshProductsFromCloud(user.id);
      } catch {
        // ignore
      }
    } else {
      window.alert(
        `Ocorreu um erro ao sincronizar com o servidor: ${sync.message}\n\nVerifique sua conexão e tente novamente.`,
      );
    }
  }

  router.push("/products");
}

