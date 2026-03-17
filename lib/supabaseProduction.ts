import { supabase } from "@/lib/supabaseClient";
import type {
  Equipment,
  SupplyItem,
  SupplyMovement,
  ProductMaterial,
  ProductionOrder,
  Quote,
  QuoteItem,
} from "@/types";

function mustHaveClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

// =========================
// Equipamentos
// =========================

export async function listEquipments(userId: string): Promise<Equipment[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("equipments")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar equipamentos");
  return data.map(mapEquipmentRow);
}

export async function upsertEquipment(userId: string, input: Omit<Equipment, "userId">): Promise<Equipment> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    name: input.name,
    model: input.model ?? null,
    power_w: input.powerW,
    energy_rate_brl_kwh: input.energyRateBrlKwh,
    status: input.status,
    purchase_value: input.purchaseValue ?? null,
    useful_life_hours: input.usefulLifeHours ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("equipments")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar equipamento");
  return mapEquipmentRow(data);
}

export async function deleteEquipment(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("equipments").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

function mapEquipmentRow(row: any): Equipment {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    model: row.model,
    powerW: Number(row.power_w ?? 0),
    energyRateBrlKwh: Number(row.energy_rate_brl_kwh ?? 0),
    status: row.status,
    purchaseValue: row.purchase_value == null ? null : Number(row.purchase_value),
    usefulLifeHours: row.useful_life_hours == null ? null : Number(row.useful_life_hours),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================
// Insumos + movimentações
// =========================

export async function listSupplies(userId: string): Promise<SupplyItem[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("supplies")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar insumos");
  return data.map(mapSupplyRow);
}

export async function upsertSupply(userId: string, input: Omit<SupplyItem, "userId">): Promise<SupplyItem> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    name: input.name,
    category: input.category,
    unit: input.unit,
    unit_cost: input.unitCost,
    stock_qty: input.stockQty,
    min_stock_qty: input.minStockQty ?? null,
    color: input.color ?? null,
    purchase_link: input.purchaseLink ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("supplies")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar insumo");
  return mapSupplyRow(data);
}

export async function deleteSupply(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("supplies").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function createSupplyMovement(
  userId: string,
  input: Omit<SupplyMovement, "userId" | "createdAt">,
): Promise<SupplyMovement> {
  const client = mustHaveClient();
  const payload = {
    user_id: userId,
    supply_id: input.supplyId,
    kind: input.kind,
    qty: input.qty,
    note: input.note ?? null,
  };
  const { data, error } = await client.from("supply_movements").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("Falha ao criar movimentação");
  return mapSupplyMovementRow(data);
}

export async function listSupplyMovements(userId: string, supplyId?: string): Promise<SupplyMovement[]> {
  const client = mustHaveClient();
  let q = client.from("supply_movements").select("*").eq("user_id", userId);
  if (supplyId) q = q.eq("supply_id", supplyId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar movimentações");
  return data.map(mapSupplyMovementRow);
}

function mapSupplyRow(row: any): SupplyItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    unitCost: Number(row.unit_cost ?? 0),
    stockQty: Number(row.stock_qty ?? 0),
    minStockQty: row.min_stock_qty == null ? null : Number(row.min_stock_qty),
    color: row.color,
    purchaseLink: row.purchase_link,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSupplyMovementRow(row: any): SupplyMovement {
  return {
    id: row.id,
    userId: row.user_id,
    supplyId: row.supply_id,
    kind: row.kind,
    qty: Number(row.qty ?? 0),
    note: row.note,
    createdAt: row.created_at,
  };
}

// =========================
// BOM (materiais por produto)
// =========================

export async function listProductMaterials(userId: string, productId: string): Promise<ProductMaterial[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("product_materials")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar materiais do produto");
  return data.map(mapProductMaterialRow);
}

export async function upsertProductMaterial(
  userId: string,
  input: Omit<ProductMaterial, "userId">,
): Promise<ProductMaterial> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    product_id: input.productId,
    supply_id: input.supplyId,
    qty: input.qty,
    unit: input.unit ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("product_materials")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar material do produto");
  return mapProductMaterialRow(data);
}

export async function deleteProductMaterial(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("product_materials").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

function mapProductMaterialRow(row: any): ProductMaterial {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    supplyId: row.supply_id,
    qty: Number(row.qty ?? 0),
    unit: row.unit,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================
// Ordens de Produção
// =========================

export async function listProductionOrders(userId: string): Promise<ProductionOrder[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("production_orders")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar ordens de produção");
  return data.map(mapProductionOrderRow);
}

export async function upsertProductionOrder(
  userId: string,
  input: Omit<ProductionOrder, "userId">,
): Promise<ProductionOrder> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    product_id: input.productId,
    equipment_id: input.equipmentId ?? null,
    quantity: input.quantity,
    due_date: input.dueDate ?? null,
    status: input.status,
    notes: input.notes ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("production_orders")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar ordem de produção");
  return mapProductionOrderRow(data);
}

export async function deleteProductionOrder(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("production_orders").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

function mapProductionOrderRow(row: any): ProductionOrder {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    equipmentId: row.equipment_id,
    quantity: Number(row.quantity ?? 1),
    dueDate: row.due_date,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =========================
// Orçamentos
// =========================

export async function listQuotes(userId: string): Promise<Quote[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("quotes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar orçamentos");
  return data.map(mapQuoteRow);
}

export async function upsertQuote(userId: string, input: Omit<Quote, "userId">): Promise<Quote> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    client_name: input.clientName,
    client_phone: input.clientPhone ?? null,
    quote_date: input.quoteDate,
    delivery_date: input.deliveryDate ?? null,
    status: input.status,
    notes: input.notes ?? null,
    subtotal: input.subtotal,
    discount: input.discount,
    total: input.total,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client.from("quotes").upsert(payload, { onConflict: "id" }).select("*").single();
  if (error || !data) throw error ?? new Error("Falha ao salvar orçamento");
  return mapQuoteRow(data);
}

export async function deleteQuote(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("quotes").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function listQuoteItems(userId: string, quoteId: string): Promise<QuoteItem[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("quote_items")
    .select("*")
    .eq("user_id", userId)
    .eq("quote_id", quoteId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar itens do orçamento");
  return data.map(mapQuoteItemRow);
}

export async function upsertQuoteItem(userId: string, input: Omit<QuoteItem, "userId">): Promise<QuoteItem> {
  const client = mustHaveClient();
  const payload = {
    id: input.id,
    user_id: userId,
    quote_id: input.quoteId,
    product_id: input.productId,
    quantity: input.quantity,
    unit_price: input.unitPrice,
    line_total: input.lineTotal,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("quote_items")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar item do orçamento");
  return mapQuoteItemRow(data);
}

export async function deleteQuoteItem(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("quote_items").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

function mapQuoteRow(row: any): Quote {
  return {
    id: row.id,
    userId: row.user_id,
    clientName: row.client_name,
    clientPhone: row.client_phone,
    quoteDate: row.quote_date,
    deliveryDate: row.delivery_date,
    status: row.status,
    notes: row.notes,
    subtotal: Number(row.subtotal ?? 0),
    discount: Number(row.discount ?? 0),
    total: Number(row.total ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuoteItemRow(row: any): QuoteItem {
  return {
    id: row.id,
    userId: row.user_id,
    quoteId: row.quote_id,
    productId: row.product_id,
    quantity: Number(row.quantity ?? 1),
    unitPrice: Number(row.unit_price ?? 0),
    lineTotal: Number(row.line_total ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

