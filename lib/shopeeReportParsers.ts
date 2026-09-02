/**
 * Parsers dos relatórios reais da Shopee (Performance do Produto, Shopee Ads) — feitos
 * a partir de arquivos-modelo reais do usuário, não de suposição sobre o formato.
 *
 * Evitamos a lib "xlsx" (SheetJS) de propósito: a versão publicada no npm tem CVEs
 * conhecidas sem correção (prototype pollution + ReDoS) — em vez disso, lemos o .xlsx
 * como zip com `fflate` (já usado no projeto) e o XML com `DOMParser` nativo do
 * navegador, que não tem essas vulnerabilidades.
 */
import { unzipSync, strFromU8 } from "fflate";

export type PerformanceRow = {
  itemId: string | null;
  productName: string | null;
  variationId: string | null;
  variationName: string | null;
  sku: string | null;
  parentSku: string | null;
  salesOrdered: number | null;
  salesPaid: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  ordersMade: number | null;
  ordersPaid: number | null;
  unitsOrdered: number | null;
  unitsPaid: number | null;
  buyersOrdered: number | null;
  buyersPaid: number | null;
  conversionRateOrdered: number | null;
  conversionRatePaid: number | null;
};

export type AdsRow = {
  adName: string | null;
  status: string | null;
  adType: string | null;
  itemId: string | null;
  bidMethod: string | null;
  placement: string | null;
  adStartDate: string | null;
  adEndDate: string | null;
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

/** "3,33%" / "54,71" (formato de exibição BR do Excel) -> 3.33 / 54.71. "-"/"" -> null. */
function parseBRNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "" || t === "-") return null;
  const cleaned = t.replace("%", "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** "2.17%" / "45.85" (export CSV, decimal com ponto) -> 2.17 / 45.85. "-"/"" -> null. */
function parseUSNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === "" || t === "-") return null;
  const n = parseFloat(t.replace("%", ""));
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(raw: string | undefined): number | null {
  const n = parseBRNumber(raw);
  return n == null ? null : Math.round(n);
}

function nonEmpty(raw: string | undefined): string | null {
  const t = raw?.trim();
  return t && t !== "-" ? t : null;
}

/** "DD/MM/AAAA..." -> "AAAA-MM-DD". Qualquer outra coisa (ex.: "Ilimitado") -> null. */
function parseBRDate(raw: string | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(t);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

/** "AAAAMMDD" -> "AAAA-MM-DD". */
function parseCompactDate(raw: string): string | null {
  if (!/^\d{8}$/.test(raw)) return null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function colRefToIndex(ref: string): number {
  const col = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let idx = 0;
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

function xmlDoc(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const doc = xmlDoc(xml);
  return Array.from(doc.getElementsByTagName("si")).map((si) =>
    Array.from(si.getElementsByTagName("t"))
      .map((t) => t.textContent ?? "")
      .join(""),
  );
}

function parseSheetRows(xml: string, sharedStrings: string[]): string[][] {
  const doc = xmlDoc(xml);
  const rows: string[][] = [];
  for (const rowEl of Array.from(doc.getElementsByTagName("row"))) {
    const row: string[] = [];
    for (const cellEl of Array.from(rowEl.getElementsByTagName("c"))) {
      const ref = cellEl.getAttribute("r");
      if (!ref) continue;
      const idx = colRefToIndex(ref);
      const type = cellEl.getAttribute("t");
      let value = "";
      if (type === "s") {
        const v = cellEl.getElementsByTagName("v")[0]?.textContent;
        value = v != null ? (sharedStrings[parseInt(v, 10)] ?? "") : "";
      } else if (type === "inlineStr") {
        value = cellEl.getElementsByTagName("t")[0]?.textContent ?? "";
      } else {
        value = cellEl.getElementsByTagName("v")[0]?.textContent ?? "";
      }
      row[idx] = value;
    }
    rows.push(row);
  }
  return rows;
}

/** Lê a aba `sheetName` de um .xlsx (real, sem depender da ordem dos arquivos internos). */
async function readXlsxSheetByName(file: File, sheetName: string): Promise<string[][]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = unzipSync(buf);

  const workbookXml = zip["xl/workbook.xml"] ? strFromU8(zip["xl/workbook.xml"]) : null;
  const relsXml = zip["xl/_rels/workbook.xml.rels"] ? strFromU8(zip["xl/_rels/workbook.xml.rels"]) : null;
  if (!workbookXml || !relsXml) throw new Error("Arquivo .xlsx inválido (workbook.xml ausente).");

  const sheetEl = Array.from(xmlDoc(workbookXml).getElementsByTagName("sheet")).find(
    (el) => el.getAttribute("name") === sheetName,
  );
  const rId = sheetEl?.getAttribute("r:id");
  if (!rId) throw new Error(`Aba "${sheetName}" não encontrada nesse arquivo.`);

  const relEl = Array.from(xmlDoc(relsXml).getElementsByTagName("Relationship")).find(
    (el) => el.getAttribute("Id") === rId,
  );
  const target = relEl?.getAttribute("Target");
  if (!target) throw new Error(`Não consegui localizar a planilha da aba "${sheetName}".`);

  const sheetPath = `xl/${target.replace(/^\.?\/?/, "")}`;
  const sheetXml = zip[sheetPath] ? strFromU8(zip[sheetPath]) : null;
  if (!sheetXml) throw new Error(`Planilha "${sheetPath}" não encontrada dentro do arquivo.`);

  const sharedStrings = parseSharedStrings(zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : undefined);
  return parseSheetRows(sheetXml, sharedStrings);
}

function headerIndex(header: string[], name: string): number {
  return header.findIndex((h) => h?.trim() === name);
}

export type PerformanceParseResult = {
  rows: PerformanceRow[];
  periodStart: string | null;
  periodEnd: string | null;
};

/** Aba real confirmada com o usuário: "Produtos com Melhor Desempenho". */
export async function parsePerformanceFile(file: File): Promise<PerformanceParseResult> {
  const table = await readXlsxSheetByName(file, "Produtos com Melhor Desempenho");
  const [header, ...body] = table;
  if (!header) return { rows: [], periodStart: null, periodEnd: null };

  const col = (name: string) => headerIndex(header, name);
  const idx = {
    itemId: col("ID do Item"),
    productName: col("Produto"),
    variationId: col("ID da Variação"),
    variationName: col("Nome da Variação"),
    sku: col("SKU da Variação"),
    parentSku: col("SKU Principle"),
    salesOrdered: col("Vendas (Pedido realizado) (BRL)"),
    salesPaid: col("Vendas (Pedido pago) (BRL)"),
    impressions: col("Impressão do Produto"),
    clicks: col("Cliques Por Produto"),
    ctr: col("CTR"),
    ordersMade: col("Pedido Feito"),
    ordersPaid: col("Produto Pago"),
    unitsOrdered: col("Unidades (Pedido realizado)"),
    unitsPaid: col("Unidades (Pedido pago)"),
    buyersOrdered: col("Compradores (Pedido realizado)"),
    buyersPaid: col("Compradores (Pedidos pago)"),
    conversionRateOrdered: col("Taxa de conversão (Pedido realizado)"),
    conversionRatePaid: col("Taxa de conversão (Pedido pago)"),
  };

  const rows: PerformanceRow[] = body
    .filter((r) => r.some((c) => c != null && c !== ""))
    .map((r) => ({
      itemId: nonEmpty(r[idx.itemId]),
      productName: nonEmpty(r[idx.productName]),
      variationId: nonEmpty(r[idx.variationId]),
      variationName: nonEmpty(r[idx.variationName]),
      sku: nonEmpty(r[idx.sku]),
      parentSku: nonEmpty(r[idx.parentSku]),
      salesOrdered: parseBRNumber(r[idx.salesOrdered]),
      salesPaid: parseBRNumber(r[idx.salesPaid]),
      impressions: parseIntOrNull(r[idx.impressions]),
      clicks: parseIntOrNull(r[idx.clicks]),
      ctr: parseBRNumber(r[idx.ctr]),
      ordersMade: parseIntOrNull(r[idx.ordersMade]),
      ordersPaid: parseIntOrNull(r[idx.ordersPaid]),
      unitsOrdered: parseIntOrNull(r[idx.unitsOrdered]),
      unitsPaid: parseIntOrNull(r[idx.unitsPaid]),
      buyersOrdered: parseIntOrNull(r[idx.buyersOrdered]),
      buyersPaid: parseIntOrNull(r[idx.buyersPaid]),
      conversionRateOrdered: parseBRNumber(r[idx.conversionRateOrdered]),
      conversionRatePaid: parseBRNumber(r[idx.conversionRatePaid]),
    }));

  // Período vem só no nome do arquivo (ex.: parentskudetail.20260830_20260830.xlsx).
  const m = /(\d{8})_(\d{8})/.exec(file.name);
  const periodStart = m ? parseCompactDate(m[1]) : null;
  const periodEnd = m ? parseCompactDate(m[2]) : null;

  return { rows, periodStart, periodEnd };
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // ignora — só marca fim de linha junto com \n
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export type AdsParseResult = {
  rows: AdsRow[];
  periodStart: string | null;
  periodEnd: string | null;
};

/**
 * Todos os exports de "Central de Marketing → Anúncios → Exportar dados" seguem o
 * mesmo formato: 6 linhas de metadado (usuário/loja/período), 1 linha em branco,
 * depois o cabeçalho de verdade começando em "#,<nome da 2ª coluna>,...". A 2ª coluna
 * muda por tipo de relatório (ex.: "Nome do Anúncio" no geral, "Nome do Produto" no
 * GMV Max) — usada aqui pra achar a linha certa sem depender de posição fixa.
 */
function findReportHeader(table: string[][], secondColumnName: string) {
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let headerRowIdx = -1;
  for (let i = 0; i < table.length; i++) {
    const r = table[i];
    if (r[0]?.trim() === "Período" && r[1]) {
      const [start, end] = r[1].split("-").map((s) => s.trim());
      periodStart = parseBRDate(start);
      periodEnd = parseBRDate(end);
    }
    if (r[0]?.trim() === "#" && r[1]?.trim() === secondColumnName) {
      headerRowIdx = i;
      break;
    }
  }
  return { headerRowIdx, periodStart, periodEnd };
}

/**
 * CSV real confirmado: 6 linhas de metadado (usuário/loja/período), 1 linha em branco,
 * depois o cabeçalho de verdade começando em "#,Nome do Anúncio,...".
 */
export async function parseAdsFile(file: File): Promise<AdsParseResult> {
  const text = await file.text();
  const table = parseCsv(text);

  const { headerRowIdx, periodStart, periodEnd } = findReportHeader(table, "Nome do Anúncio");
  if (headerRowIdx === -1) return { rows: [], periodStart, periodEnd };

  const header = table[headerRowIdx];
  const body = table.slice(headerRowIdx + 1).filter((r) => r.some((c) => c != null && c !== ""));

  const col = (name: string) => headerIndex(header, name);
  const idx = {
    adName: col("Nome do Anúncio"),
    status: col("Status"),
    adType: col("Tipos de Anúncios"),
    itemId: col("ID do produto"),
    bidMethod: col("Método de Lance"),
    placement: col("Posicionamento"),
    adStartDate: col("Data de Início"),
    adEndDate: col("Data de Encerramento"),
    impressions: col("Impressões"),
    clicks: col("Cliques"),
    ctr: col("CTR"),
    addToCart: col("Adicionar ao carrinho"),
    conversions: col("Conversões"),
    directConversions: col("Conversões Diretas"),
    conversionRate: col("Taxa de Conversão"),
    directConversionRate: col("Taxa de Conversão Direta"),
    costPerConversion: col("Custo por Conversão"),
    itemsSold: col("Itens Vendidos"),
    itemsSoldDirect: col("Itens Vendidos Diretos"),
    gmv: col("GMV"),
    directRevenue: col("Receita direta"),
    expenses: col("Despesas"),
    roas: col("ROAS"),
    directRoas: col("ROAS Direto"),
    acos: col("ACOS"),
    directAcos: col("ACOS Direto"),
  };

  const rows: AdsRow[] = body.map((r) => ({
    adName: nonEmpty(r[idx.adName]),
    status: nonEmpty(r[idx.status]),
    adType: nonEmpty(r[idx.adType]),
    itemId: nonEmpty(r[idx.itemId]),
    bidMethod: nonEmpty(r[idx.bidMethod]),
    placement: nonEmpty(r[idx.placement]),
    adStartDate: parseBRDate(r[idx.adStartDate]),
    adEndDate: parseBRDate(r[idx.adEndDate]),
    impressions: parseIntOrNull(r[idx.impressions]),
    clicks: parseIntOrNull(r[idx.clicks]),
    ctr: parseUSNumber(r[idx.ctr]),
    addToCart: parseIntOrNull(r[idx.addToCart]),
    conversions: parseIntOrNull(r[idx.conversions]),
    directConversions: parseIntOrNull(r[idx.directConversions]),
    conversionRate: parseUSNumber(r[idx.conversionRate]),
    directConversionRate: parseUSNumber(r[idx.directConversionRate]),
    costPerConversion: parseUSNumber(r[idx.costPerConversion]),
    itemsSold: parseIntOrNull(r[idx.itemsSold]),
    itemsSoldDirect: parseIntOrNull(r[idx.itemsSoldDirect]),
    gmv: parseUSNumber(r[idx.gmv]),
    directRevenue: parseUSNumber(r[idx.directRevenue]),
    expenses: parseUSNumber(r[idx.expenses]),
    roas: parseUSNumber(r[idx.roas]),
    directRoas: parseUSNumber(r[idx.directRoas]),
    acos: parseUSNumber(r[idx.acos]),
    directAcos: parseUSNumber(r[idx.directAcos]),
  }));

  return { rows, periodStart, periodEnd };
}

export type KeywordRow = {
  adName: string | null;
  status: string | null;
  adType: string | null;
  itemId: string | null;
  bidMethod: string | null;
  placement: string | null;
  keywordOrLocation: string | null;
  matchType: string | null;
  /** true quando a Shopee escolhe a segmentação sozinha (GMV Max) — não é uma palavra-chave otimizável. */
  isAutomatic: boolean;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  conversions: number | null;
  directConversions: number | null;
  conversionRate: number | null;
  directConversionRate: number | null;
  costPerConversion: number | null;
  costPerConversionDirect: number | null;
  itemsSold: number | null;
  itemsSoldDirect: number | null;
  gmv: number | null;
  directRevenue: number | null;
  expenses: number | null;
  roas: number | null;
  directRoas: number | null;
  acos: number | null;
  directAcos: number | null;
  productImpressions: number | null;
  productClicks: number | null;
  productCtr: number | null;
};

export type KeywordParseResult = { rows: KeywordRow[]; periodStart: string | null; periodEnd: string | null };

/** Export "Dados em nível de palavra-chave e performance". Em contas que usam só GMV Max
 * (lance automático), a Shopee escolhe a segmentação sozinha e essa coluna vem "-" ou
 * "Selecionado Automaticamente" em todo mundo — não há palavra-chave manual pra otimizar. */
export async function parseKeywordFile(file: File): Promise<KeywordParseResult> {
  const text = await file.text();
  const table = parseCsv(text);
  const { headerRowIdx, periodStart, periodEnd } = findReportHeader(table, "Nome do Anúncio");
  if (headerRowIdx === -1) return { rows: [], periodStart, periodEnd };

  const header = table[headerRowIdx];
  const body = table.slice(headerRowIdx + 1).filter((r) => r.some((c) => c != null && c !== ""));
  const col = (name: string) => headerIndex(header, name);
  const idx = {
    adName: col("Nome do Anúncio"),
    status: col("Status"),
    adType: col("Tipos de Anúncios"),
    itemId: col("ID do produto"),
    bidMethod: col("Método de Lance"),
    placement: col("Posicionamento"),
    keywordOrLocation: col("Palavra-chave/Localização"),
    matchType: col("Tipo de combinação"),
    impressions: col("Impressões"),
    clicks: col("Cliques"),
    ctr: col("CTR"),
    conversions: col("Conversões"),
    directConversions: col("Conversões Diretas"),
    conversionRate: col("Taxa de Conversão"),
    directConversionRate: col("Taxa de Conversão Direta"),
    costPerConversion: col("Custo por Conversão"),
    costPerConversionDirect: col("Custo por Conversão Direta"),
    itemsSold: col("Itens Vendidos"),
    itemsSoldDirect: col("Itens Vendidos Diretos"),
    gmv: col("GMV"),
    directRevenue: col("Receita direta"),
    expenses: col("Despesas"),
    roas: col("ROAS"),
    directRoas: col("ROAS Direto"),
    acos: col("ACOS"),
    directAcos: col("ACOS Direto"),
    productImpressions: col("Impressões do Produto"),
    productClicks: col("Cliques de Produtos"),
    productCtr: col("CTR do Produto"),
  };

  const rows: KeywordRow[] = body.map((r) => {
    const keywordOrLocation = nonEmpty(r[idx.keywordOrLocation]);
    return {
      adName: nonEmpty(r[idx.adName]),
      status: nonEmpty(r[idx.status]),
      adType: nonEmpty(r[idx.adType]),
      itemId: nonEmpty(r[idx.itemId]),
      bidMethod: nonEmpty(r[idx.bidMethod]),
      placement: nonEmpty(r[idx.placement]),
      keywordOrLocation,
      matchType: nonEmpty(r[idx.matchType]),
      isAutomatic: keywordOrLocation == null || keywordOrLocation === "Selecionado Automaticamente",
      impressions: parseIntOrNull(r[idx.impressions]),
      clicks: parseIntOrNull(r[idx.clicks]),
      ctr: parseUSNumber(r[idx.ctr]),
      conversions: parseIntOrNull(r[idx.conversions]),
      directConversions: parseIntOrNull(r[idx.directConversions]),
      conversionRate: parseUSNumber(r[idx.conversionRate]),
      directConversionRate: parseUSNumber(r[idx.directConversionRate]),
      costPerConversion: parseUSNumber(r[idx.costPerConversion]),
      costPerConversionDirect: parseUSNumber(r[idx.costPerConversionDirect]),
      itemsSold: parseIntOrNull(r[idx.itemsSold]),
      itemsSoldDirect: parseIntOrNull(r[idx.itemsSoldDirect]),
      gmv: parseUSNumber(r[idx.gmv]),
      directRevenue: parseUSNumber(r[idx.directRevenue]),
      expenses: parseUSNumber(r[idx.expenses]),
      roas: parseUSNumber(r[idx.roas]),
      directRoas: parseUSNumber(r[idx.directRoas]),
      acos: parseUSNumber(r[idx.acos]),
      directAcos: parseUSNumber(r[idx.directAcos]),
      productImpressions: parseIntOrNull(r[idx.productImpressions]),
      productClicks: parseIntOrNull(r[idx.productClicks]),
      productCtr: parseUSNumber(r[idx.productCtr]),
    };
  });

  return { rows, periodStart, periodEnd };
}

export type GmvMaxRow = {
  productName: string | null;
  itemId: string | null;
  /** true na linha-resumo "GMV Max da Loja" (item_id "-") — não é um produto real. */
  isStoreTotal: boolean;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  conversions: number | null;
  directConversions: number | null;
  conversionRate: number | null;
  directConversionRate: number | null;
  costPerConversion: number | null;
  costPerConversionDirect: number | null;
  itemsSold: number | null;
  itemsSoldDirect: number | null;
  gmv: number | null;
  directRevenue: number | null;
  expenses: number | null;
  roas: number | null;
  directRoas: number | null;
  acos: number | null;
  directAcos: number | null;
  voucherAmount: number | null;
  voucheredSales: number | null;
};

export type GmvMaxParseResult = { rows: GmvMaxRow[]; periodStart: string | null; periodEnd: string | null };

/** Export "Dados Detalhados do GMV Max da Loja" — quebra a linha única "GMV Max da Loja"
 * do relatório geral em cada produto individual dentro dessa campanha automática. */
export async function parseGmvMaxFile(file: File): Promise<GmvMaxParseResult> {
  const text = await file.text();
  const table = parseCsv(text);
  const { headerRowIdx, periodStart, periodEnd } = findReportHeader(table, "Nome do Produto");
  if (headerRowIdx === -1) return { rows: [], periodStart, periodEnd };

  const header = table[headerRowIdx];
  const body = table.slice(headerRowIdx + 1).filter((r) => r.some((c) => c != null && c !== ""));
  const col = (name: string) => headerIndex(header, name);
  const idx = {
    productName: col("Nome do Produto"),
    itemId: col("ID do produto"),
    impressions: col("Impressões"),
    clicks: col("Cliques"),
    ctr: col("CTR"),
    conversions: col("Conversões"),
    directConversions: col("Conversões Diretas"),
    conversionRate: col("Taxa de Conversão"),
    directConversionRate: col("Taxa de Conversão Direta"),
    costPerConversion: col("Custo por Conversão"),
    costPerConversionDirect: col("Custo por Conversão Direta"),
    itemsSold: col("Itens Vendidos"),
    itemsSoldDirect: col("Itens Vendidos Diretos"),
    gmv: col("GMV"),
    directRevenue: col("Receita direta"),
    expenses: col("Despesas"),
    roas: col("ROAS"),
    directRoas: col("ROAS Direto"),
    acos: col("ACOS"),
    directAcos: col("ACOS Direto"),
    voucherAmount: col("Voucher Amount"),
    voucheredSales: col("Vouchered Sales"),
  };

  const rows: GmvMaxRow[] = body.map((r) => {
    const itemId = nonEmpty(r[idx.itemId]);
    return {
      productName: nonEmpty(r[idx.productName]),
      itemId,
      isStoreTotal: itemId == null,
      impressions: parseIntOrNull(r[idx.impressions]),
      clicks: parseIntOrNull(r[idx.clicks]),
      ctr: parseUSNumber(r[idx.ctr]),
      conversions: parseIntOrNull(r[idx.conversions]),
      directConversions: parseIntOrNull(r[idx.directConversions]),
      conversionRate: parseUSNumber(r[idx.conversionRate]),
      directConversionRate: parseUSNumber(r[idx.directConversionRate]),
      costPerConversion: parseUSNumber(r[idx.costPerConversion]),
      costPerConversionDirect: parseUSNumber(r[idx.costPerConversionDirect]),
      itemsSold: parseIntOrNull(r[idx.itemsSold]),
      itemsSoldDirect: parseIntOrNull(r[idx.itemsSoldDirect]),
      gmv: parseUSNumber(r[idx.gmv]),
      directRevenue: parseUSNumber(r[idx.directRevenue]),
      expenses: parseUSNumber(r[idx.expenses]),
      roas: parseUSNumber(r[idx.roas]),
      directRoas: parseUSNumber(r[idx.directRoas]),
      acos: parseUSNumber(r[idx.acos]),
      directAcos: parseUSNumber(r[idx.directAcos]),
      voucherAmount: parseUSNumber(r[idx.voucherAmount]),
      voucheredSales: parseUSNumber(r[idx.voucheredSales]),
    };
  });

  return { rows, periodStart, periodEnd };
}

export type AdGroupRow = {
  adName: string | null;
  status: string | null;
  adType: string | null;
  itemId: string | null;
  bidMethod: string | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  conversions: number | null;
  directConversions: number | null;
  conversionRate: number | null;
  directConversionRate: number | null;
  costPerConversion: number | null;
  costPerConversionDirect: number | null;
  itemsSold: number | null;
  itemsSoldDirect: number | null;
  gmv: number | null;
  directRevenue: number | null;
  expenses: number | null;
  roas: number | null;
  directRoas: number | null;
  acos: number | null;
  directAcos: number | null;
  voucherAmount: number | null;
  voucheredSales: number | null;
};

export type AdGroupParseResult = { rows: AdGroupRow[]; periodStart: string | null; periodEnd: string | null };

/** Export "Dados de Todos os Grupos de Anúncios". Contas que só usam GMV Max (sem
 * campanhas manuais agrupadas) vêm com esse arquivo vazio — é esperado, não é erro. */
export async function parseAdGroupFile(file: File): Promise<AdGroupParseResult> {
  const text = await file.text();
  const table = parseCsv(text);
  const { headerRowIdx, periodStart, periodEnd } = findReportHeader(table, "Anúncio / Nome do Produto");
  if (headerRowIdx === -1) return { rows: [], periodStart, periodEnd };

  const header = table[headerRowIdx];
  const body = table.slice(headerRowIdx + 1).filter((r) => r.some((c) => c != null && c !== ""));
  const col = (name: string) => headerIndex(header, name);
  const idx = {
    adName: col("Anúncio / Nome do Produto"),
    status: col("Status"),
    adType: col("Tipos de Anúncios"),
    itemId: col("ID do produto"),
    bidMethod: col("Método de Lance"),
    impressions: col("Impressões"),
    clicks: col("Cliques"),
    ctr: col("CTR"),
    conversions: col("Conversões"),
    directConversions: col("Conversões Diretas"),
    conversionRate: col("Taxa de Conversão"),
    directConversionRate: col("Taxa de Conversão Direta"),
    costPerConversion: col("Custo por Conversão"),
    costPerConversionDirect: col("Custo por Conversão Direta"),
    itemsSold: col("Itens Vendidos"),
    itemsSoldDirect: col("Itens Vendidos Diretos"),
    gmv: col("GMV"),
    directRevenue: col("Receita direta"),
    expenses: col("Despesas"),
    roas: col("ROAS"),
    directRoas: col("ROAS Direto"),
    acos: col("ACOS"),
    directAcos: col("ACOS Direto"),
    voucherAmount: col("Voucher Amount"),
    voucheredSales: col("Vouchered Sales"),
  };

  const rows: AdGroupRow[] = body.map((r) => ({
    adName: nonEmpty(r[idx.adName]),
    status: nonEmpty(r[idx.status]),
    adType: nonEmpty(r[idx.adType]),
    itemId: nonEmpty(r[idx.itemId]),
    bidMethod: nonEmpty(r[idx.bidMethod]),
    impressions: parseIntOrNull(r[idx.impressions]),
    clicks: parseIntOrNull(r[idx.clicks]),
    ctr: parseUSNumber(r[idx.ctr]),
    conversions: parseIntOrNull(r[idx.conversions]),
    directConversions: parseIntOrNull(r[idx.directConversions]),
    conversionRate: parseUSNumber(r[idx.conversionRate]),
    directConversionRate: parseUSNumber(r[idx.directConversionRate]),
    costPerConversion: parseUSNumber(r[idx.costPerConversion]),
    costPerConversionDirect: parseUSNumber(r[idx.costPerConversionDirect]),
    itemsSold: parseIntOrNull(r[idx.itemsSold]),
    itemsSoldDirect: parseIntOrNull(r[idx.itemsSoldDirect]),
    gmv: parseUSNumber(r[idx.gmv]),
    directRevenue: parseUSNumber(r[idx.directRevenue]),
    expenses: parseUSNumber(r[idx.expenses]),
    roas: parseUSNumber(r[idx.roas]),
    directRoas: parseUSNumber(r[idx.directRoas]),
    acos: parseUSNumber(r[idx.acos]),
    directAcos: parseUSNumber(r[idx.directAcos]),
    voucherAmount: parseUSNumber(r[idx.voucherAmount]),
    voucheredSales: parseUSNumber(r[idx.voucheredSales]),
  }));

  return { rows, periodStart, periodEnd };
}
