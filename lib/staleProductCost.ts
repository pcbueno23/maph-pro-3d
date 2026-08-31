import { supabase } from "./supabaseClient";
import type { Product } from "@/types";

/**
 * Produtos cujo BOM usa um insumo que teve o preço alterado DEPOIS do último
 * cálculo de custo salvo — "recálculo em cascata" de verdade custaria reescrever
 * o motor de custo pra rodar sozinho; isso aqui é o sinal honesto de "confira de
 * novo", que é o que o dossiê pede como primeiro passo.
 *
 * Compara `products.total_cost_updated_at` (só muda quando o VALOR de total_cost
 * muda de verdade, via trigger — updated_at normal é tocado por qualquer save,
 * inclusive os que não mexem em custo) contra `supplies.unit_cost_updated_at`
 * (mesma lógica, só muda quando unit_cost muda de valor).
 */
export async function fetchStaleCostProductIds(
  userId: string,
  products: Product[],
): Promise<Set<string>> {
  if (!supabase || products.length === 0) return new Set();

  const { data, error } = await supabase
    .from("product_materials")
    .select("product_id, supply:supplies(unit_cost_updated_at)")
    .eq("user_id", userId);
  if (error || !data) return new Set();

  const latestSupplyChangeByProduct = new Map<string, number>();
  for (const row of data as unknown as {
    product_id: string;
    supply: { unit_cost_updated_at: string }[] | { unit_cost_updated_at: string } | null;
  }[]) {
    const supply = Array.isArray(row.supply) ? row.supply[0] : row.supply;
    const changedAt = supply?.unit_cost_updated_at;
    if (!changedAt) continue;
    const t = new Date(changedAt).getTime();
    const prev = latestSupplyChangeByProduct.get(row.product_id) ?? 0;
    if (t > prev) latestSupplyChangeByProduct.set(row.product_id, t);
  }

  const stale = new Set<string>();
  for (const p of products) {
    if (!p.totalCost || p.totalCost <= 0 || !p.totalCostUpdatedAt) continue;
    const latestSupplyChange = latestSupplyChangeByProduct.get(p.id);
    if (latestSupplyChange == null) continue;
    if (latestSupplyChange > new Date(p.totalCostUpdatedAt).getTime()) {
      stale.add(p.id);
    }
  }
  return stale;
}
