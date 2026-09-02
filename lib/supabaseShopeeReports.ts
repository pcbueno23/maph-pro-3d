import { supabase } from "./supabaseClient";
import { parsePerformanceFile, parseAdsFile } from "./shopeeReportParsers";

export type ShopeeReportType = "performance_produto" | "shopee_ads" | "minha_renda";

export type ShopeeImportSummary = {
  id: string;
  fileName: string;
  periodStart: string | null;
  periodEnd: string | null;
  rowCount: number;
  matchedCount: number;
  importedAt: string;
};

export type ImportOutcome =
  | { ok: true; summary: ShopeeImportSummary }
  | { ok: false; message: string };

export type PerformanceProductRow = {
  itemId: string | null;
  productName: string | null;
  sku: string | null;
  matchedProductId: string | null;
  salesPaid: number | null;
  salesOrdered: number | null;
  unitsPaid: number | null;
  ordersPaid: number | null;
  conversionRatePaid: number | null;
  ctr: number | null;
};

export type AdsRowSummary = {
  adName: string | null;
  itemId: string | null;
  matchedProductId: string | null;
  matchedProductCost: number | null;
  status: string | null;
  adType: string | null;
  placement: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  addToCart: number | null;
  conversions: number | null;
  directConversions: number | null;
  conversionRate: number | null;
  directConversionRate: number | null;
  costPerConversion: number | null;
  itemsSold: number | null;
  itemsSoldDirect: number | null;
  gmv: number | null;
  directRevenue: number | null;
  expenses: number | null;
  roas: number | null;
  directRoas: number | null;
  acos: number | null;
  directAcos: number | null;
};

type ProductLookup = { id: string; sku: string | null; shopeeItemId: string | null };

async function fetchProductLookup(userId: string): Promise<ProductLookup[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, shopee_item_id")
    .eq("user_id", userId);
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id, sku: r.sku ?? null, shopeeItemId: r.shopee_item_id ?? null }));
}

/** Insere em lotes — o Supabase/PostgREST recusa payloads muito grandes de uma vez. */
async function insertInBatches(table: string, rows: Record<string, unknown>[], batchSize = 500) {
  if (!supabase || rows.length === 0) return;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(error.message);
  }
}

export async function importPerformanceReport(userId: string, file: File): Promise<ImportOutcome> {
  if (!supabase) return { ok: false, message: "Supabase não configurado." };

  let parsed;
  try {
    parsed = await parsePerformanceFile(file);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao ler o arquivo." };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, message: 'Não encontrei a aba "Produtos com Melhor Desempenho" com dados nesse arquivo.' };
  }

  const products = await fetchProductLookup(userId);
  const bySku = new Map(products.filter((p) => p.sku).map((p) => [p.sku as string, p]));

  const { data: importRow, error: importErr } = await supabase
    .from("shopee_report_imports")
    .insert({
      user_id: userId,
      report_type: "performance_produto",
      file_name: file.name,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      row_count: parsed.rows.length,
    })
    .select("id")
    .single();
  if (importErr || !importRow) {
    return { ok: false, message: importErr?.message ?? "Falha ao registrar a importação." };
  }

  let matchedCount = 0;
  const productsToLink = new Map<string, string>(); // productId -> itemId

  const childRows = parsed.rows.map((r) => {
    // A linha do produto-pai não tem SKU próprio — só as variações têm; casa pelo SKU
    // principal (parentSku) quando a linha específica não tiver.
    const matchSku = r.sku ?? r.parentSku;
    const match = matchSku ? bySku.get(matchSku) : undefined;
    if (match) {
      matchedCount += 1;
      if (r.itemId && !match.shopeeItemId) productsToLink.set(match.id, r.itemId);
    }
    return {
      user_id: userId,
      import_id: importRow.id,
      item_id: r.itemId,
      product_name: r.productName,
      variation_id: r.variationId,
      variation_name: r.variationName,
      sku: r.sku,
      parent_sku: r.parentSku,
      matched_product_id: match?.id ?? null,
      sales_ordered: r.salesOrdered,
      sales_paid: r.salesPaid,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      orders_made: r.ordersMade,
      orders_paid: r.ordersPaid,
      units_ordered: r.unitsOrdered,
      units_paid: r.unitsPaid,
      buyers_ordered: r.buyersOrdered,
      buyers_paid: r.buyersPaid,
      conversion_rate_ordered: r.conversionRateOrdered,
      conversion_rate_paid: r.conversionRatePaid,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
    };
  });

  try {
    await insertInBatches("shopee_product_performance", childRows);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao salvar os dados do relatório." };
  }

  // Ensina o item_id da Shopee pros produtos casados por SKU — isso é o que depois
  // permite casar o relatório de Ads (só tem item_id, sem SKU) automaticamente.
  await Promise.all(
    Array.from(productsToLink.entries()).map(([productId, itemId]) =>
      supabase!.from("products").update({ shopee_item_id: itemId }).eq("id", productId),
    ),
  );

  return {
    ok: true,
    summary: {
      id: importRow.id,
      fileName: file.name,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rowCount: parsed.rows.length,
      matchedCount,
      importedAt: new Date().toISOString(),
    },
  };
}

export async function importAdsReport(userId: string, file: File): Promise<ImportOutcome> {
  if (!supabase) return { ok: false, message: "Supabase não configurado." };

  let parsed;
  try {
    parsed = await parseAdsFile(file);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao ler o arquivo." };
  }
  if (parsed.rows.length === 0) {
    return { ok: false, message: "Não encontrei a tabela de anúncios nesse arquivo." };
  }

  const products = await fetchProductLookup(userId);
  const byItemId = new Map(products.filter((p) => p.shopeeItemId).map((p) => [p.shopeeItemId as string, p]));

  const { data: importRow, error: importErr } = await supabase
    .from("shopee_report_imports")
    .insert({
      user_id: userId,
      report_type: "shopee_ads",
      file_name: file.name,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
      row_count: parsed.rows.length,
    })
    .select("id")
    .single();
  if (importErr || !importRow) {
    return { ok: false, message: importErr?.message ?? "Falha ao registrar a importação." };
  }

  let matchedCount = 0;
  const childRows = parsed.rows.map((r) => {
    const match = r.itemId ? byItemId.get(r.itemId) : undefined;
    if (match) matchedCount += 1;
    return {
      user_id: userId,
      import_id: importRow.id,
      ad_name: r.adName,
      status: r.status,
      ad_type: r.adType,
      item_id: r.itemId,
      matched_product_id: match?.id ?? null,
      bid_method: r.bidMethod,
      placement: r.placement,
      ad_start_date: r.adStartDate,
      ad_end_date: r.adEndDate,
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      add_to_cart: r.addToCart,
      conversions: r.conversions,
      direct_conversions: r.directConversions,
      conversion_rate: r.conversionRate,
      direct_conversion_rate: r.directConversionRate,
      cost_per_conversion: r.costPerConversion,
      items_sold: r.itemsSold,
      items_sold_direct: r.itemsSoldDirect,
      gmv: r.gmv,
      direct_revenue: r.directRevenue,
      expenses: r.expenses,
      roas: r.roas,
      direct_roas: r.directRoas,
      acos: r.acos,
      direct_acos: r.directAcos,
      period_start: parsed.periodStart,
      period_end: parsed.periodEnd,
    };
  });

  try {
    await insertInBatches("shopee_ads_performance", childRows);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Falha ao salvar os dados do relatório." };
  }

  return {
    ok: true,
    summary: {
      id: importRow.id,
      fileName: file.name,
      periodStart: parsed.periodStart,
      periodEnd: parsed.periodEnd,
      rowCount: parsed.rows.length,
      matchedCount,
      importedAt: new Date().toISOString(),
    },
  };
}

export async function fetchLatestImport(
  userId: string,
  reportType: ShopeeReportType,
): Promise<ShopeeImportSummary | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("shopee_report_imports")
    .select("id, file_name, period_start, period_end, row_count, imported_at")
    .eq("user_id", userId)
    .eq("report_type", reportType)
    .order("imported_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  const table = reportType === "shopee_ads" ? "shopee_ads_performance" : "shopee_product_performance";
  let matchedCount = 0;
  if (reportType !== "minha_renda") {
    const { count } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("import_id", data.id)
      .not("matched_product_id", "is", null);
    matchedCount = count ?? 0;
  }

  return {
    id: data.id,
    fileName: data.file_name,
    periodStart: data.period_start,
    periodEnd: data.period_end,
    rowCount: data.row_count,
    matchedCount,
    importedAt: data.imported_at,
  };
}

/**
 * Uma linha por produto (ignora as linhas de variação — elas já somam no total do
 * produto-pai) — é o que alimenta o painel didático dentro da aba, ordenado do que
 * mais vendeu pro que menos vendeu.
 */
export async function fetchPerformanceProductRows(importId: string): Promise<PerformanceProductRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shopee_product_performance")
    .select(
      "item_id, product_name, sku, matched_product_id, sales_paid, sales_ordered, units_paid, orders_paid, conversion_rate_paid, ctr",
    )
    .eq("import_id", importId)
    .is("variation_id", null)
    .order("sales_paid", { ascending: false, nullsFirst: false });
  if (error || !data) return [];
  return data.map((r) => ({
    itemId: r.item_id,
    productName: r.product_name,
    sku: r.sku,
    matchedProductId: r.matched_product_id,
    salesPaid: r.sales_paid != null ? Number(r.sales_paid) : null,
    salesOrdered: r.sales_ordered != null ? Number(r.sales_ordered) : null,
    unitsPaid: r.units_paid,
    ordersPaid: r.orders_paid,
    conversionRatePaid: r.conversion_rate_paid != null ? Number(r.conversion_rate_paid) : null,
    ctr: r.ctr != null ? Number(r.ctr) : null,
  }));
}

/** Uma linha por anúncio/produto, ordenada do que mais gastou pro que menos gastou. */
export async function fetchAdsRows(importId: string): Promise<AdsRowSummary[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("shopee_ads_performance")
    .select(
      "ad_name, item_id, matched_product_id, status, ad_type, placement, impressions, clicks, ctr, " +
        "add_to_cart, conversions, direct_conversions, conversion_rate, direct_conversion_rate, " +
        "cost_per_conversion, items_sold, items_sold_direct, gmv, direct_revenue, expenses, roas, " +
        "direct_roas, acos, direct_acos, products:matched_product_id(total_cost)",
    )
    .eq("import_id", importId)
    .order("expenses", { ascending: false, nullsFirst: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    adName: r.ad_name,
    itemId: r.item_id,
    matchedProductId: r.matched_product_id,
    matchedProductCost: r.products?.total_cost != null ? Number(r.products.total_cost) : null,
    status: r.status,
    adType: r.ad_type,
    placement: r.placement,
    impressions: r.impressions,
    clicks: r.clicks,
    ctr: r.ctr != null ? Number(r.ctr) : null,
    addToCart: r.add_to_cart,
    conversions: r.conversions,
    directConversions: r.direct_conversions,
    conversionRate: r.conversion_rate != null ? Number(r.conversion_rate) : null,
    directConversionRate: r.direct_conversion_rate != null ? Number(r.direct_conversion_rate) : null,
    costPerConversion: r.cost_per_conversion != null ? Number(r.cost_per_conversion) : null,
    itemsSold: r.items_sold,
    itemsSoldDirect: r.items_sold_direct,
    gmv: r.gmv != null ? Number(r.gmv) : null,
    directRevenue: r.direct_revenue != null ? Number(r.direct_revenue) : null,
    expenses: r.expenses != null ? Number(r.expenses) : null,
    roas: r.roas != null ? Number(r.roas) : null,
    directRoas: r.direct_roas != null ? Number(r.direct_roas) : null,
    acos: r.acos != null ? Number(r.acos) : null,
    directAcos: r.direct_acos != null ? Number(r.direct_acos) : null,
  }));
}

/** Despesa total com Ads no período mais recente importado — usado no dashboard. */
export async function fetchLatestAdsSpendTotal(userId: string): Promise<{ total: number; periodStart: string | null; periodEnd: string | null } | null> {
  if (!supabase) return null;
  const latest = await fetchLatestImport(userId, "shopee_ads");
  if (!latest) return null;
  const { data, error } = await supabase
    .from("shopee_ads_performance")
    .select("expenses")
    .eq("import_id", latest.id);
  if (error || !data) return null;
  const total = data.reduce((sum, r) => sum + (Number(r.expenses) || 0), 0);
  return { total, periodStart: latest.periodStart, periodEnd: latest.periodEnd };
}
