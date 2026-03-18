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
        sku,
        description,
        print_time_minutes,
        default_printer_id,
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
    sku: row.sku ?? null,
    description: row.description ?? null,
    printTimeMinutes: row.print_time_minutes ?? null,
    defaultPrinterId: row.default_printer_id ?? null,
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
    sku: p.sku ?? null,
    description: p.description ?? null,
    print_time_minutes: p.printTimeMinutes ?? null,
    default_printer_id: p.defaultPrinterId ?? null,
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

export async function deleteProduct(userId: string, productId: string): Promise<void> {
  if (!supabase) return;

  // O schema usa ON DELETE RESTRICT em alguns relacionamentos (ex.: quote_items e production_orders).
  // Para permitir deletar o produto, removemos primeiro as referências do usuário.
  const steps: Array<{
    table: "quote_items" | "production_orders" | "product_materials" | "products";
    filters: Record<string, string>;
  }> = [
    { table: "quote_items", filters: { user_id: userId, product_id: productId } },
    { table: "production_orders", filters: { user_id: userId, product_id: productId } },
    // product_materials tem ON DELETE CASCADE no produto, mas mantemos por consistência.
    { table: "product_materials", filters: { user_id: userId, product_id: productId } },
  ];

  for (const step of steps) {
    const payload = Object.entries(step.filters);
    let q = supabase.from(step.table).delete();
    for (const [k, v] of payload) q = q.eq(k, v);
    const { error } = await q;
    if (error) throw error;
  }

  const { error: productsError } = await supabase
    .from("products")
    .delete()
    .eq("user_id", userId)
    .eq("id", productId);

  if (productsError) throw productsError;
}

