import type { Product } from "@/types";
import { supabase } from "./supabaseClient";

export async function fetchUserProducts(userId: string): Promise<Product[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("products")
    .select(
      `
        id,
        name,
        weight,
        price,
        margin,
        marketplace,
        currency,
        created_at,
        updated_at
      `,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error || !data) {
    // eslint-disable-next-line no-console
    console.error("Erro ao buscar produtos do Supabase:", error);
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    weight: row.weight,
    price: row.price,
    margin: row.margin,
    marketplace: row.marketplace,
    currency: row.currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  })) as Product[];
}

export async function upsertProductsForUser(
  userId: string,
  products: Product[],
): Promise<void> {
  if (!supabase || products.length === 0) return;

  const payload = products.map((p) => ({
    id: p.id,
    user_id: userId,
    name: p.name,
    weight: p.weight,
    price: p.price,
    margin: p.margin,
    marketplace: p.marketplace,
    currency: p.currency,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  }));

  const { error } = await supabase.from("products").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Erro ao sincronizar produtos com Supabase:", error);
  }
}

