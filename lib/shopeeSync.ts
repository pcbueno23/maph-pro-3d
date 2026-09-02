import type { SupabaseClient } from "@supabase/supabase-js";
import { shopeeRefreshToken } from "./shopee/auth";
import { shopeeListOrderSns, shopeeFetchOrderDetails, type ShopeeOrder } from "./shopee/orders";
import { getEffectiveMarketplaceFeePercent } from "./marketplaceFees";
import type { Sale } from "@/store/salesStore";

/** Primeira sincronização (sem last_order_time salvo) só busca os últimos 90 dias. */
const FIRST_SYNC_DAYS = 90;
/** A Shopee limita get_order_list a uma janela de 15 dias por chamada. */
const WINDOW_DAYS = 15;

export type ShopeeConnectionRow = {
  user_id: string;
  shop_id: number;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  last_order_time: number | null;
};

export type ShopeeSyncResult =
  | { ok: true; ordersFound: number; salesImported: number; matched: number; unmatched: number }
  | { ok: false; error: string };

export async function syncShopeeConnectionOrders(
  admin: SupabaseClient,
  conn: ShopeeConnectionRow,
): Promise<ShopeeSyncResult> {
  let accessToken = conn.access_token;
  const expiresAt = new Date(conn.access_token_expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt < Date.now() + 60_000) {
    const refreshed = await shopeeRefreshToken(conn.refresh_token, conn.shop_id);
    if (!refreshed.ok) {
      return { ok: false, error: `Falha ao renovar o token da Shopee (${refreshed.status}).` };
    }
    accessToken = refreshed.accessToken;
    await admin
      .from("shopee_shop_connections")
      .update({
        access_token: refreshed.accessToken,
        refresh_token: refreshed.refreshToken,
        access_token_expires_at: new Date(Date.now() + refreshed.expireInSec * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", conn.user_id);
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = conn.last_order_time ?? nowSec - FIRST_SYNC_DAYS * 24 * 60 * 60;

  const allOrderSns: string[] = [];
  for (let winStart = startSec; winStart < nowSec; winStart += WINDOW_DAYS * 24 * 60 * 60) {
    const winEnd = Math.min(winStart + WINDOW_DAYS * 24 * 60 * 60, nowSec);
    const result = await shopeeListOrderSns(accessToken, conn.shop_id, winStart, winEnd);
    if (!result.ok) {
      return { ok: false, error: `Falha ao listar pedidos da Shopee (${result.status}).` };
    }
    allOrderSns.push(...result.orderSns);
  }

  let orders: ShopeeOrder[] = [];
  if (allOrderSns.length > 0) {
    const detailResult = await shopeeFetchOrderDetails(accessToken, conn.shop_id, allOrderSns);
    if (!detailResult.ok) {
      return { ok: false, error: `Falha ao buscar detalhes dos pedidos da Shopee (${detailResult.status}).` };
    }
    orders = detailResult.orders;
  }

  const [{ data: products }, { data: settingsRow }, { data: salesRow }] = await Promise.all([
    admin.from("products").select("id, sku, name, total_cost").eq("user_id", conn.user_id),
    admin.from("user_settings").select("data").eq("user_id", conn.user_id).maybeSingle(),
    admin.from("user_sales").select("data").eq("user_id", conn.user_id).maybeSingle(),
  ]);

  const productBySku = new Map(
    ((products as any[]) ?? []).filter((p) => p.sku).map((p) => [String(p.sku).trim().toLowerCase(), p]),
  );
  const freeShipping = Boolean((settingsRow?.data as any)?.defaults?.shopeeFreeShippingDefault);
  const existingSales: Sale[] = Array.isArray(salesRow?.data) ? (salesRow!.data as Sale[]) : [];
  const existingIds = new Set(existingSales.map((s) => s.id));

  const newSales: Sale[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;
  let maxTimeSeen = conn.last_order_time ?? 0;

  for (const order of orders) {
    const orderSec = Math.floor(new Date(order.createTime).getTime() / 1000);
    if (Number.isFinite(orderSec) && orderSec > maxTimeSeen) maxTimeSeen = orderSec;

    order.items.forEach((item, idx) => {
      const id = `shopee_${order.orderSn}_${idx}`;
      if (existingIds.has(id)) return;

      const product = item.sku ? productBySku.get(item.sku.trim().toLowerCase()) : undefined;
      if (product) matchedCount++;
      else unmatchedCount++;

      const revenue = item.unitPrice * item.quantity;
      const feePercent = getEffectiveMarketplaceFeePercent("Shopee", "CPF", item.unitPrice, { freeShipping });
      const marketplaceFeeAmount = (revenue * feePercent) / 100;
      const unitProductionCost = product?.total_cost != null ? Number(product.total_cost) : 0;
      const grossProfit = revenue - unitProductionCost * item.quantity;
      const netProfit = grossProfit - marketplaceFeeAmount;

      newSales.push({
        id,
        date: order.createTime,
        itemId: product?.id ?? "",
        productName: product?.name ?? item.title,
        sku: item.sku ?? "",
        channel: "Shopee",
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
      { user_id: conn.user_id, data: merged, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
    if (saveErr) return { ok: false, error: saveErr.message };
  }

  await admin
    .from("shopee_shop_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_order_time: maxTimeSeen > 0 ? maxTimeSeen : conn.last_order_time,
    })
    .eq("user_id", conn.user_id);

  return {
    ok: true,
    ordersFound: orders.length,
    salesImported: newSales.length,
    matched: matchedCount,
    unmatched: unmatchedCount,
  };
}
