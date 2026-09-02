import { callShop } from "./client";

export type ShopeeOrderItem = {
  title: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

export type ShopeeOrder = {
  orderSn: string;
  status: string;
  createTime: string;
  totalAmount: number;
  items: ShopeeOrderItem[];
};

/** Lista os order_sn de um período (a Shopee limita a janela de get_order_list a
 * 15 dias por chamada) — pagina via cursor até acabar. */
export async function shopeeListOrderSns(
  accessToken: string,
  shopId: number,
  timeFromSec: number,
  timeToSec: number,
): Promise<{ ok: true; orderSns: string[] } | { ok: false; status: number; body: string }> {
  const orderSns: string[] = [];
  let cursor = "";
  for (let page = 0; page < 20; page++) {
    const result = await callShop("/api/v2/order/get_order_list", accessToken, shopId, {
      time_range_field: "create_time",
      time_from: String(timeFromSec),
      time_to: String(timeToSec),
      page_size: "100",
      cursor,
      order_status: "COMPLETED",
    });
    if (!result.ok) return result;
    const list = Array.isArray(result.json?.response?.order_list) ? result.json.response.order_list : [];
    for (const o of list) if (o?.order_sn) orderSns.push(String(o.order_sn));
    const more = Boolean(result.json?.response?.more);
    const nextCursor = result.json?.response?.next_cursor ?? "";
    if (!more || !nextCursor) break;
    cursor = nextCursor;
  }
  return { ok: true, orderSns };
}

/** get_order_detail aceita até 50 order_sn por chamada. */
export async function shopeeFetchOrderDetails(
  accessToken: string,
  shopId: number,
  orderSns: string[],
): Promise<{ ok: true; orders: ShopeeOrder[] } | { ok: false; status: number; body: string }> {
  const orders: ShopeeOrder[] = [];
  for (let i = 0; i < orderSns.length; i += 50) {
    const chunk = orderSns.slice(i, i + 50);
    const result = await callShop("/api/v2/order/get_order_detail", accessToken, shopId, {
      order_sn_list: chunk.join(","),
      response_optional_fields: "item_list,total_amount,order_status,create_time",
    });
    if (!result.ok) return result;
    const list = Array.isArray(result.json?.response?.order_list) ? result.json.response.order_list : [];
    for (const o of list) {
      const items = Array.isArray(o?.item_list) ? o.item_list : [];
      orders.push({
        orderSn: String(o.order_sn),
        status: o.order_status ?? "UNKNOWN",
        createTime: new Date((Number(o.create_time) || 0) * 1000).toISOString(),
        totalAmount: Number(o.total_amount) || 0,
        items: items.map((it: any) => ({
          title: it.item_name ?? it.model_name ?? "Item sem título",
          sku: it.model_sku || it.item_sku || null,
          quantity: Number(it.model_quantity_purchased ?? it.quantity_purchased) || 1,
          unitPrice: Number(it.model_discounted_price ?? it.model_original_price ?? it.discounted_price) || 0,
        })),
      });
    }
  }
  return { ok: true, orders };
}
