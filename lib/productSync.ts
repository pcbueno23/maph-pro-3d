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

function ts(p: Product): number {
  const t = new Date(p.updatedAt).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Mesmo id em várias fontes: fica a revisão com updatedAt mais recente. */
function dedupeByNewest(products: Product[]): Product[] {
  const map = new Map<string, Product>();
  for (const p of products) {
    const ex = map.get(p.id);
    if (!ex) {
      map.set(p.id, p);
      continue;
    }
    map.set(p.id, ts(p) >= ts(ex) ? p : ex);
  }
  return Array.from(map.values());
}

/**
 * Base = nuvem; sobrescreve com overlay quando o overlay é mais novo (ou id só existe local).
 * Evita que um fetch antigo (ainda em voo) apague um produto recém salvo na sessão.
 */
function mergeRemoteWithOverlay(remote: Product[], overlay: Product[]): Product[] {
  const map = new Map(remote.map((p) => [p.id, p]));
  for (const p of overlay) {
    const ex = map.get(p.id);
    if (!ex) {
      map.set(p.id, p);
      continue;
    }
    if (ts(p) >= ts(ex)) map.set(p.id, p);
  }
  return Array.from(map.values()).sort((a, b) => ts(b) - ts(a));
}

/**
 * Atualiza o store com o que está no Supabase, preservando produtos só locais e mesclando
 * com a lista atual para não perder salvamentos feitos enquanto o fetch rodava.
 */
export async function refreshProductsFromCloud(userId: string): Promise<void> {
  const remote = await fetchUserProducts(userId);
  const overlay = dedupeByNewest([
    ...useProductsStore.getState().products,
    ...readLocalProducts(),
  ]);
  const merged = mergeRemoteWithOverlay(remote, overlay);
  useProductsStore.getState().hydrateFromCloud(merged);
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

  let remoteProducts = await fetchUserProducts(userId);

  // Nuvem vazia mas há lista local: tenta enviar de novo (ex.: falha de rede/RLS na sessão anterior).
  if (remoteProducts.length === 0 && localProducts.length > 0) {
    await upsertProductsForUser(userId, localProducts);
    remoteProducts = await fetchUserProducts(userId);
  }

  const overlay = dedupeByNewest([
    ...useProductsStore.getState().products,
    ...localProducts,
  ]);

  if (remoteProducts.length > 0) {
    useProductsStore.getState().hydrateFromCloud(mergeRemoteWithOverlay(remoteProducts, overlay));
  } else {
    // Nuvem vazia: mantém o que está no disco/sessão (evita lista zerada após falha de rede/RLS).
    useProductsStore.getState().hydrateFromCloud(mergeRemoteWithOverlay([], overlay));
  }
}

