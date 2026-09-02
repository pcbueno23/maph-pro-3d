import type { SupabaseClient } from "@supabase/supabase-js";
import { mlFetchOrders, mlRefreshToken, type MlOrder } from "./mercadoLivre";
import { getEffectiveMarketplaceFeePercent } from "./marketplaceFees";
import type { Sale } from "@/store/salesStore";

/** Primeira sincronização (sem last_order_date salvo) só busca os últimos 90 dias,
 * pra não trazer o histórico inteiro de uma vez numa conta com muitas vendas antigas. */
const FIRST_SYNC_DAYS = 90;
const MAX_PAGES = 10;
const PAGE_SIZE = 50;

export type MlAccountRow = {
  user_id: string;
  ml_user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  last_order_date: string | null;
};

export type MlSyncResult =
  | { ok: true; ordersFound: number; salesImported: number; matched: number; unmatched: number }
  | { ok: false; error: string };

/** Sincroniza pedidos pagos de uma conta ML pro user_sales — usado tanto pelo botão
 * "Sincronizar agora" (app/api/ml/sync) quanto pelo cron diário (app/api/cron/ml-sync). */
export async function syncMlAccountOrders(
  admin: SupabaseClient,
  account: MlAccountRow,
): Promise<MlSyncResult> {
  let accessToken = account.access_token;
  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now() + 60_000) {
    const refreshed = await mlRefreshToken(account.refresh_token);
    if (!refreshed.ok) {
      return { ok: false, error: `Falha ao renovar o token do Mercado Livre (${refreshed.status}).` };
    }
    accessToken = refreshed.accessToken;
    await admin
      .from("ml_accounts")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        token_expires_at: new Date(Date.now() + refreshed.expiresInSec * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", account.user_id);
  }

  const sinceIso: string = account.last_order_date
    ? new Date(account.last_order_date).toISOString()
    : new Date(Date.now() - FIRST_SYNC_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const allOrders: MlOrder[] = [];
  let offset = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await mlFetchOrders(accessToken, account.ml_user_id, { sinceIso, offset, limit: PAGE_SIZE });
    if (!result.ok) {
      return { ok: false, error: `Falha ao buscar pedidos no Mercado Livre (${result.status}).` };
    }
    allOrders.push(...result.orders);
    offset += PAGE_SIZE;
    if (offset >= result.total || result.orders.length === 0) break;
  }

  const [{ data: products }, { data: settingsRow }, { data: salesRow }] = await Promise.all([
    admin.from("products").select("id, sku, name, total_cost").eq("user_id", account.user_id),
    admin.from("user_settings").select("data").eq("user_id", account.user_id).maybeSingle(),
    admin.from("user_sales").select("data").eq("user_id", account.user_id).maybeSingle(),
  ]);

  const productBySku = new Map(
    ((products as any[]) ?? []).filter((p) => p.sku).map((p) => [String(p.sku).trim().toLowerCase(), p]),
  );
  const mlClassic = Boolean((settingsRow?.data as any)?.defaults?.mlClassic);
  const existingSales: Sale[] = Array.isArray(salesRow?.data) ? (salesRow!.data as Sale[]) : [];
  const existingIds = new Set(existingSales.map((s) => s.id));

  const newSales: Sale[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let maxDateSeen = account.last_order_date ? new Date(account.last_order_date).getTime() : 0;

  for (const order of allOrders) {
    const orderTime = new Date(order.dateClosed).getTime();
    if (Number.isFinite(orderTime) && orderTime > maxDateSeen) maxDateSeen = orderTime;

    order.items.forEach((item, idx) => {
      const id = `ml_${order.id}_${idx}`;
      if (existingIds.has(id)) return;

      const product = item.sku ? productBySku.get(item.sku.trim().toLowerCase()) : undefined;
      if (product) matchedCount++;
      else unmatchedCount++;

      const revenue = item.unitPrice * item.quantity;
      const feePercent = getEffectiveMarketplaceFeePercent("Mercado Livre", "CPF", item.unitPrice, {
        classicML: mlClassic,
      });
      const marketplaceFeeAmount = (revenue * feePercent) / 100;
      const unitProductionCost = product?.total_cost != null ? Number(product.total_cost) : 0;
      const grossProfit = revenue - unitProductionCost * item.quantity;
      const netProfit = grossProfit - marketplaceFeeAmount;

      newSales.push({
        id,
        date: order.dateClosed,
        itemId: product?.id ?? "",
        productName: product?.name ?? item.title,
        sku: item.sku ?? "",
        channel: "ML",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        revenue,
        unitProductionCost,
        grossProfit,
        marketplaceFeeAmount,
        taxAmount: 0,
        netProfit,
      });
    });
  }

  if (newSales.length > 0) {
    const merged = [...existingSales, ...newSales];
    const { error: saveErr } = await admin.from("user_sales").upsert(
      { user_id: account.user_id, data: merged, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (saveErr) return { ok: false, error: saveErr.message };
  }

  await admin
    .from("ml_accounts")
    .update({
      last_synced_at: new Date().toISOString(),
      last_order_date: maxDateSeen > 0 ? new Date(maxDateSeen).toISOString() : account.last_order_date,
    })
    .eq("user_id", account.user_id);

  return {
    ok: true,
    ordersFound: allOrders.length,
    salesImported: newSales.length,
    matched: matchedCount,
    unmatched: unmatchedCount,
  };
}
