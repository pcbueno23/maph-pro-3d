import { useProductsStore } from "@/store/productsStore";
import type { Product } from "@/types";
import { fetchUserProducts, upsertProductsForUser } from "./supabaseProducts";

const LOCAL_PRODUCTS_KEY = "precifica3d-products";

function readLocalProducts(): Product[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(LOCAL_PRODUCTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Product[];
  } catch {
    return [];
  }
}

export async function syncProductsOnLogin(userId: string): Promise<void> {
  if (typeof window === "undefined") return;

  const migrationKey = `precifica3d-migrated-${userId}`;
  const alreadyMigrated = window.localStorage.getItem(migrationKey) === "true";

  const localProducts = readLocalProducts();

  if (!alreadyMigrated && localProducts.length > 0) {
    await upsertProductsForUser(userId, localProducts);
    window.localStorage.setItem(migrationKey, "true");
  }

  const remoteProducts = await fetchUserProducts(userId);

  if (remoteProducts.length > 0) {
    useProductsStore.getState().hydrateFromCloud(remoteProducts);
  } else if (localProducts.length > 0) {
    // Caso a nuvem ainda esteja vazia, manter o estado local sincronizado
    useProductsStore.getState().hydrateFromCloud(localProducts);
  }
}

