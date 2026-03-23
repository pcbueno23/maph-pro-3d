import { supabase } from "@/lib/supabaseClient";
import type {
  Printer,
  SupplyItem,
  SupplyMovement,
  ProductMaterial,
  ProductAsset,
  ProductionOrder,
  Quote,
  QuoteItem,
} from "@/types";

function mustHaveClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

// =========================
// Impressoras
// =========================

export async function listPrinters(userId: string): Promise<Printer[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("printers")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar equipamentos");
  return data.map(mapPrinterRow);
}

export async function upsertPrinter(
  userId: string,
  input: Omit<Printer, "userId" | "id"> & { id?: string },
): Promise<Printer> {
  const client = mustHaveClient();
  const payload: any = {
    user_id: userId,
    name: input.name,
    model: input.model ?? null,
    power_w: input.powerW,
    energy_rate_brl_kwh: input.energyRateBrlKwh,
    status: input.status,
    purchase_value: input.purchaseValue ?? null,
    useful_life_hours: input.usefulLifeHours ?? null,
    annual_maintenance: input.annualMaintenance ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    payload.id = input.id;
  }
  const { data, error } = await client
    .from("printers")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar equipamento");
  return mapPrinterRow(data);
}

export async function deletePrinter(userId: string, id: string): Promise<void> {
  const client = mustHaveClient();
  const { error } = await client.from("printers").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

function mapPrinterRow(row: any): Printer {
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
    annualMaintenance: row.annual_maintenance == null ? null : Number(row.annual_maintenance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Compat: exports antigos (não usar em código novo)
export async function listEquipments(userId: string) {
  return listPrinters(userId);
}
export async function upsertEquipment(userId: string, input: any) {
  return upsertPrinter(userId, input);
}
export async function deleteEquipment(userId: string, id: string) {
  return deletePrinter(userId, id);
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

export async function upsertSupply(
  userId: string,
  input: Omit<SupplyItem, "userId" | "id"> & { id?: string },
): Promise<SupplyItem> {
  const client = mustHaveClient();
  const payload: any = {
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
  if (input.id) {
    payload.id = input.id;
  }
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
  // product_materials.supply_id → supplies com ON DELETE RESTRICT: precisa limpar o BOM antes.
  const { error: bomError } = await client
    .from("product_materials")
    .delete()
    .eq("user_id", userId)
    .eq("supply_id", id);
  if (bomError) throw bomError;

  const { error } = await client.from("supplies").delete().eq("user_id", userId).eq("id", id);
  if (error) throw error;
}

export async function createSupplyMovement(
  userId: string,
  input: Omit<SupplyMovement, "userId" | "createdAt" | "id">,
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
  input: Omit<ProductMaterial, "userId" | "id"> & { id?: string },
): Promise<ProductMaterial> {
  const client = mustHaveClient();
  const payload: any = {
    user_id: userId,
    product_id: input.productId,
    supply_id: input.supplyId,
    qty: input.qty,
    unit: input.unit ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    payload.id = input.id;
  }
  const { data, error } = await client
    .from("product_materials")
    .upsert(payload, {
      onConflict: "user_id,product_id,supply_id",
    })
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
// Assets (uploads) por produto
// =========================

export async function listProductAssets(userId: string, productId: string): Promise<ProductAsset[]> {
  const client = mustHaveClient();
  const { data, error } = await client
    .from("product_assets")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar anexos do produto");
  return data.map(mapProductAssetRow);
}

export async function listProductAssetsByProductIds(params: {
  userId: string;
  productIds: string[];
  kind?: "image" | "file";
}): Promise<ProductAsset[]> {
  const client = mustHaveClient();
  const { userId, productIds, kind } = params;
  if (!productIds.length) return [];

  let q = client
    .from("product_assets")
    .select("*")
    .eq("user_id", userId)
    .in("product_id", productIds);

  if (kind) q = q.eq("kind", kind);

  const { data, error } = await q.order("created_at", { ascending: false });
  if (error || !data) throw error ?? new Error("Falha ao listar anexos do produto");
  return data.map(mapProductAssetRow);
}

export async function getProductAssetViewUrl(
  asset: ProductAsset,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  const client = mustHaveClient();
  if (asset.publicUrl) return asset.publicUrl;
  const { data, error } = await client.storage
    .from(asset.storageBucket)
    .createSignedUrl(asset.storagePath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function createProductAsset(
  userId: string,
  input: Omit<ProductAsset, "userId" | "id" | "createdAt"> & { id?: string; createdAt?: string },
): Promise<ProductAsset> {
  const client = mustHaveClient();
  const payload: any = {
    user_id: userId,
    product_id: input.productId,
    kind: input.kind,
    file_name: input.fileName,
    mime_type: input.mimeType ?? null,
    size_bytes: input.sizeBytes ?? null,
    storage_bucket: input.storageBucket,
    storage_path: input.storagePath,
    public_url: input.publicUrl ?? null,
    created_at: input.createdAt ?? new Date().toISOString(),
  };
  if (input.id) payload.id = input.id;
  const { data, error } = await client
    .from("product_assets")
    .insert(payload)
    .select("*")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar anexo do produto");
  return mapProductAssetRow(data);
}

export async function uploadProductFile(params: {
  userId: string;
  productId: string;
  kind: "image" | "file";
  file: File;
}): Promise<ProductAsset> {
  const client = mustHaveClient();
  const { userId, productId, kind, file } = params;

  const safeName = (file.name ?? "arquivo").replace(/[^\w.\-() ]+/g, "_");
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `asset_${Date.now()}`;
  const path = `${userId}/${productId}/${id}_${safeName}`;

  const { error: upErr } = await client.storage
    .from("product-assets")
    .upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (upErr) throw upErr;

  const { data } = client.storage.from("product-assets").getPublicUrl(path);
  const publicUrl = data?.publicUrl ?? null;

  return await createProductAsset(userId, {
    id,
    productId,
    kind,
    fileName: file.name ?? safeName,
    mimeType: file.type ?? null,
    sizeBytes: Number.isFinite(file.size) ? file.size : null,
    storageBucket: "product-assets",
    storagePath: path,
    publicUrl,
  });
}

function mapProductAssetRow(row: any): ProductAsset {
  return {
    id: row.id,
    userId: row.user_id,
    productId: row.product_id,
    kind: row.kind,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes == null ? null : Number(row.size_bytes),
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    createdAt: row.created_at,
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
  const payload: any = {
    user_id: userId,
    product_id: input.productId,
    printer_id: input.printerId ?? null,
    quantity: input.quantity,
    due_date: input.dueDate ?? null,
    status: input.status,
    notes: input.notes ?? null,
    printing_started_at: input.printingStartedAt ?? null,
    created_at: input.createdAt,
    updated_at: new Date().toISOString(),
  };
  if (input.id) {
    payload.id = input.id;
  }
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
    printerId: row.printer_id ?? row.equipment_id ?? null,
    quantity: Number(row.quantity ?? 1),
    dueDate: row.due_date,
    status: row.status,
    notes: row.notes,
    printingStartedAt: row.printing_started_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Baixa automática de insumos com base no BOM do produto e quantidade da ordem.
// Registra movimentações de saída e atualiza o estoque atual dos insumos.
export async function consumeSuppliesForOrder(
  userId: string,
  order: ProductionOrder,
): Promise<void> {
  const client = mustHaveClient();

  // Busca materiais do produto (BOM)
  const { data: mats, error: matsError } = await client
    .from("product_materials")
    .select("*")
    .eq("user_id", userId)
    .eq("product_id", order.productId);
  if (matsError) throw matsError;
  if (!mats || mats.length === 0) return;

  const materials: ProductMaterial[] = mats.map(mapProductMaterialRow);
  if (materials.length === 0) return;

  // Carrega insumos atuais para ter o estoque
  const supplies = await listSupplies(userId);
  const suppliesById = new Map(supplies.map((s) => [s.id, s] as const));

  for (const m of materials) {
    const supply = suppliesById.get(m.supplyId);
    if (!supply) continue;

    const totalQty = (m.qty ?? 0) * (order.quantity ?? 1);
    if (!totalQty || totalQty <= 0) continue;

    // Movimento de saída
    await createSupplyMovement(userId, {
      supplyId: supply.id,
      kind: "out",
      qty: totalQty,
      note: `Baixa automática da ordem ${order.id}`,
    });

    // Atualiza estoque do insumo
    const nextStock = Math.max(0, (supply.stockQty ?? 0) - totalQty);
    await upsertSupply(userId, {
      id: supply.id,
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      unitCost: supply.unitCost,
      stockQty: nextStock,
      minStockQty: supply.minStockQty ?? null,
      color: supply.color ?? null,
      purchaseLink: supply.purchaseLink ?? null,
      createdAt: supply.createdAt,
      updatedAt: new Date().toISOString(),
    });
  }
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

