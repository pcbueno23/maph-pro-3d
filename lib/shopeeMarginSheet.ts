/**
 * "Planilha" de preço/margem por produto Shopee, trazida pro SaaS — mesmo formato de
 * uma planilha real que o usuário já usava (aba "Precos e Margem" + aba "Parametros"),
 * com cupom loja, cenário sem/com oferta relâmpago, e ajuste de preço pra margem alvo.
 *
 * As fórmulas abaixo são um port exato das fórmulas reais da planilha original
 * (conferidas célula a célula no arquivo real do usuário antes de implementar) —
 * não são as mesmas contas do motor principal (lib/engines/shopee/engine.ts), que usa
 * faixas de comissão por preço; aqui é sempre comissão/transação/imposto em % fixo +
 * taxa fixa por venda, igual à aba "Parametros" da planilha.
 *
 * Import/export usam fflate (zip) + DOMParser nativo — mesmo motivo do resto do
 * projeto: a lib "xlsx" (SheetJS) tem CVEs sem correção.
 */
import { unzipSync, strFromU8, zipSync, strToU8 } from "fflate";

export type CupomTier = { min: number; desconto: number; label?: string };

export type MarginParams = {
  comissaoPercent: number; // ex. 20 (%)
  taxaTransacaoPercent: number; // ex. 2 (%)
  impostoPercent: number; // ex. 5 (%)
  taxaFixa: number; // R$ por venda
  margemAlvoPercent: number; // ex. 20 (%)
  cupomTiers: CupomTier[]; // ordenados por "min" crescente
};

export const DEFAULT_MARGIN_PARAMS: MarginParams = {
  comissaoPercent: 20,
  taxaTransacaoPercent: 2,
  impostoPercent: 5,
  taxaFixa: 4.5,
  margemAlvoPercent: 20,
  cupomTiers: [
    { min: 0, desconto: 0, label: "Sem cupom" },
    { min: 15.99, desconto: 1, label: "R$1 OFF acima de R$15,99" },
    { min: 39.9, desconto: 2, label: "R$2 OFF acima de R$39,90" },
    { min: 69.9, desconto: 3, label: "R$3 OFF acima de R$69,90" },
    { min: 89.9, desconto: 5, label: "R$5 OFF acima de R$89,90" },
  ],
};

export type MarginRow = {
  id?: string;
  produto: string;
  variacao: string;
  numVariacoes: number | null;
  precoCadastro: number | null;
  precoPromocaoRede: number | null;
  precoRelampago: number | null;
  custoProducao: number | null;
  embalagemOutros: number | null;
  /** Link do anúncio na Shopee (coluna W, opcional — nem toda planilha importada tem essa coluna). */
  link: string | null;
};

export type ComputedMarginRow = MarginRow & {
  cupomSemRelampago: number | null;
  clientePagaSemRelampago: number | null;
  descontoRealVsCadastro: number | null;
  cupomComRelampago: number | null;
  clientePagaComRelampago: number | null;
  taxasSemRelampago: number | null;
  lucroSemRelampago: number | null;
  margemSemRelampagoPct: number | null;
  taxasComRelampago: number | null;
  lucroComRelampago: number | null;
  margemComRelampagoPct: number | null;
  clienteDevePagarParaMargemAlvo: number | null;
  precoPromocaoParaMargemAlvo: number | null;
  alerta: string;
};

/** LOOKUP(preco, tiers) — maior tier.min que seja <= preco (tiers precisam estar em ordem crescente). */
function cupomFor(preco: number | null, tiers: CupomTier[]): number | null {
  if (preco == null) return null;
  let best: number | null = null;
  for (const t of tiers) {
    if (t.min <= preco) best = t.desconto;
    else break;
  }
  return best;
}

export function computeRow(row: MarginRow, params: MarginParams): ComputedMarginRow {
  const feeRate = (params.comissaoPercent + params.taxaTransacaoPercent + params.impostoPercent) / 100;
  const embalagem = row.embalagemOutros ?? 0;

  const cupomSemRelampago = row.precoPromocaoRede != null ? cupomFor(row.precoPromocaoRede, params.cupomTiers) : null;
  const clientePagaSemRelampago =
    row.precoPromocaoRede != null && cupomSemRelampago != null ? row.precoPromocaoRede - cupomSemRelampago : null;
  const descontoRealVsCadastro =
    row.precoCadastro != null && row.precoCadastro > 0 && clientePagaSemRelampago != null
      ? 1 - clientePagaSemRelampago / row.precoCadastro
      : null;

  const cupomComRelampago = row.precoRelampago != null ? cupomFor(row.precoRelampago, params.cupomTiers) : null;
  const clientePagaComRelampago =
    row.precoRelampago != null && cupomComRelampago != null ? row.precoRelampago - cupomComRelampago : null;

  const taxasSemRelampago = clientePagaSemRelampago != null ? clientePagaSemRelampago * feeRate + params.taxaFixa : null;
  const lucroSemRelampago =
    row.custoProducao != null && clientePagaSemRelampago != null && taxasSemRelampago != null
      ? clientePagaSemRelampago - taxasSemRelampago - row.custoProducao - embalagem
      : null;
  const margemSemRelampagoPct =
    lucroSemRelampago != null && clientePagaSemRelampago ? lucroSemRelampago / clientePagaSemRelampago : null;

  const taxasComRelampago =
    clientePagaComRelampago != null ? clientePagaComRelampago * feeRate + params.taxaFixa : null;
  const lucroComRelampago =
    row.custoProducao != null && clientePagaComRelampago != null && taxasComRelampago != null
      ? clientePagaComRelampago - taxasComRelampago - row.custoProducao - embalagem
      : null;
  const margemComRelampagoPct =
    lucroComRelampago != null && clientePagaComRelampago ? lucroComRelampago / clientePagaComRelampago : null;

  const divisor = 1 - feeRate - params.margemAlvoPercent / 100;
  const clienteDevePagarParaMargemAlvo =
    row.custoProducao != null && divisor > 0
      ? (row.custoProducao + embalagem + params.taxaFixa) / divisor
      : null;
  let precoPromocaoParaMargemAlvo: number | null = null;
  if (clienteDevePagarParaMargemAlvo != null) {
    const inner = cupomFor(clienteDevePagarParaMargemAlvo, params.cupomTiers) ?? 0;
    const outer = cupomFor(clienteDevePagarParaMargemAlvo + inner, params.cupomTiers) ?? 0;
    precoPromocaoParaMargemAlvo = clienteDevePagarParaMargemAlvo + outer;
  }

  let alerta = "";
  if (row.precoRelampago != null && row.precoPromocaoRede != null && row.precoRelampago >= row.precoPromocaoRede) {
    alerta = "Relâmpago mais caro que a promoção";
  } else if (
    precoPromocaoParaMargemAlvo != null &&
    row.precoCadastro != null &&
    precoPromocaoParaMargemAlvo > row.precoCadastro
  ) {
    alerta = "Margem alvo exige preço acima do cadastro";
  }

  return {
    ...row,
    cupomSemRelampago,
    clientePagaSemRelampago,
    descontoRealVsCadastro,
    cupomComRelampago,
    clientePagaComRelampago,
    taxasSemRelampago,
    lucroSemRelampago,
    margemSemRelampagoPct,
    taxasComRelampago,
    lucroComRelampago,
    margemComRelampagoPct,
    clienteDevePagarParaMargemAlvo,
    precoPromocaoParaMargemAlvo,
    alerta,
  };
}

// ---------------------------------------------------------------------------
// IMPORT
// ---------------------------------------------------------------------------

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
    Array.from(si.getElementsByTagName("t")).map((t) => t.textContent ?? "").join(""),
  );
}

/** Lê linhas por NÚMERO REAL de linha (não por posição no XML) — linhas totalmente
 * vazias não aparecem no XML, então indexar por posição desalinha tudo. */
function parseSheetRowsByNumber(xml: string, sharedStrings: string[]): Map<number, string[]> {
  const doc = xmlDoc(xml);
  const rowsByNum = new Map<number, string[]>();
  for (const rowEl of Array.from(doc.getElementsByTagName("row"))) {
    const rNum = parseInt(rowEl.getAttribute("r") ?? "", 10);
    if (!Number.isFinite(rNum)) continue;
    const row: string[] = [];
    for (const cellEl of Array.from(rowEl.getElementsByTagName("c"))) {
      const ref = cellEl.getAttribute("r");
      if (!ref) continue;
      const idx = colRefToIndex(ref);
      const type = cellEl.getAttribute("t");
      let value = "";
      if (type === "s") {
        const v = cellEl.getElementsByTagName("v")[0]?.textContent;
        value = v != null ? sharedStrings[parseInt(v, 10)] ?? "" : "";
      } else if (type === "inlineStr") {
        value = cellEl.getElementsByTagName("t")[0]?.textContent ?? "";
      } else {
        value = cellEl.getElementsByTagName("v")[0]?.textContent ?? "";
      }
      row[idx] = value;
    }
    rowsByNum.set(rNum, row);
  }
  return rowsByNum;
}

function numOrNull(raw: string | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

async function findSheetTarget(zip: Record<string, Uint8Array>, nameContains: string, fallbackPosition: number) {
  const workbookXml = zip["xl/workbook.xml"] ? strFromU8(zip["xl/workbook.xml"]) : null;
  const relsXml = zip["xl/_rels/workbook.xml.rels"] ? strFromU8(zip["xl/_rels/workbook.xml.rels"]) : null;
  if (!workbookXml || !relsXml) throw new Error("Arquivo .xlsx inválido.");
  const doc = xmlDoc(workbookXml);
  const sheets = Array.from(doc.getElementsByTagName("sheet"));
  const match =
    sheets.find((el) => (el.getAttribute("name") ?? "").toLowerCase().includes(nameContains.toLowerCase())) ??
    sheets[fallbackPosition];
  const rId = match?.getAttribute("r:id");
  if (!rId) throw new Error(`Não encontrei a aba "${nameContains}" nesse arquivo.`);
  const relDoc = xmlDoc(relsXml);
  const relEl = Array.from(relDoc.getElementsByTagName("Relationship")).find((el) => el.getAttribute("Id") === rId);
  const target = relEl?.getAttribute("Target");
  if (!target) throw new Error(`Não localizei a planilha da aba "${nameContains}".`);
  return `xl/${target.replace(/^\.?\/?/, "")}`;
}

export type MarginSheetParseResult = { rows: MarginRow[]; params: MarginParams | null };

/** Lê o .xlsx no formato real confirmado: aba "Precos e Margem" (dados a partir da
 * linha 5) + aba "Parametros" (taxas, margem alvo e faixas de cupom). */
export async function parseMarginSheetXlsx(file: File): Promise<MarginSheetParseResult> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = unzipSync(buf);
  const sharedStrings = parseSharedStrings(zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : undefined);

  const dataSheetPath = await findSheetTarget(zip, "Precos e Margem", 0);
  const dataXml = zip[dataSheetPath] ? strFromU8(zip[dataSheetPath]) : null;
  if (!dataXml) throw new Error("Aba de preços e margem não encontrada.");
  const dataRows = parseSheetRowsByNumber(dataXml, sharedStrings);

  const rows: MarginRow[] = [];
  const maxRow = Math.max(0, ...Array.from(dataRows.keys()));
  for (let r = 5; r <= maxRow; r++) {
    const row = dataRows.get(r);
    if (!row) continue;
    const produto = row[0]?.trim();
    const precoCadastro = numOrNull(row[3]);
    if (!produto || precoCadastro == null) continue; // pula linhas de legenda/vazias
    rows.push({
      produto,
      variacao: row[1]?.trim() ?? "",
      numVariacoes: numOrNull(row[2]),
      precoCadastro,
      precoPromocaoRede: numOrNull(row[4]),
      precoRelampago: numOrNull(row[8]),
      custoProducao: numOrNull(row[11]),
      embalagemOutros: numOrNull(row[12]),
      link: row[22]?.trim() || null,
    });
  }

  let params: MarginParams | null = null;
  try {
    const paramsSheetPath = await findSheetTarget(zip, "Parametros", 1);
    const paramsXml = zip[paramsSheetPath] ? strFromU8(zip[paramsSheetPath]) : null;
    if (paramsXml) {
      const pRows = parseSheetRowsByNumber(paramsXml, sharedStrings);
      const comissaoPercent = (numOrNull(pRows.get(4)?.[1]) ?? 0.2) * 100;
      const taxaTransacaoPercent = (numOrNull(pRows.get(5)?.[1]) ?? 0.02) * 100;
      const impostoPercent = (numOrNull(pRows.get(6)?.[1]) ?? 0.05) * 100;
      const taxaFixa = numOrNull(pRows.get(7)?.[1]) ?? 4.5;
      const margemAlvoPercent = (numOrNull(pRows.get(8)?.[1]) ?? 0.2) * 100;

      const cupomTiers: CupomTier[] = [];
      const maxPRow = Math.max(0, ...Array.from(pRows.keys()));
      for (let r = 13; r <= maxPRow; r++) {
        const row = pRows.get(r);
        if (!row) break;
        const min = numOrNull(row[0]);
        const desconto = numOrNull(row[1]);
        if (min == null || desconto == null) break;
        cupomTiers.push({ min, desconto, label: row[2]?.trim() });
      }
      params = {
        comissaoPercent,
        taxaTransacaoPercent,
        impostoPercent,
        taxaFixa,
        margemAlvoPercent,
        cupomTiers: cupomTiers.length > 0 ? cupomTiers : DEFAULT_MARGIN_PARAMS.cupomTiers,
      };
    }
  } catch {
    // aba Parametros não encontrada/ilegível — segue sem atualizar os parâmetros do usuário
  }

  return { rows, params };
}

// ---------------------------------------------------------------------------
// EXPORT
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/></Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Precos e Margem" sheetId="1" r:id="rId1"/><sheet name="Parametros" sheetId="2" r:id="rId2"/></sheets></workbook>`;

// Paleta igual à planilha original: PRODUTO (azul escuro), SEM RELÂMPAGO/RESULTADO (azul
// claro), COM RELÂMPAGO/RESULTADO (verde claro), CUSTOS (amarelo), AJUSTE (pêssego).
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="165" formatCode="&quot;R$ &quot;#,##0.00"/><numFmt numFmtId="166" formatCode="0.0%"/></numFmts>
<fonts count="7">
<font><sz val="11"/><name val="Arial"/></font>
<font><b/><sz val="14"/><name val="Arial"/></font>
<font><i/><sz val="9"/><name val="Arial"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font>
<font><b/><sz val="10"/><name val="Arial"/></font>
<font><sz val="10"/><name val="Arial"/></font>
<font><sz val="10"/><color rgb="FF0000FF"/><name val="Arial"/></font>
</fonts>
<fills count="7">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFDDEBF7"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFE2EFDA"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFFF2CC"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFFCE4D6"/></patternFill></fill>
</fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="16">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"><alignment wrapText="1"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="3" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="4" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="6" borderId="0" xfId="0"><alignment horizontal="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="2" borderId="1" xfId="0"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0"/>
<xf numFmtId="165" fontId="6" fillId="0" borderId="1" xfId="0"/>
<xf numFmtId="165" fontId="5" fillId="0" borderId="1" xfId="0"/>
<xf numFmtId="166" fontId="5" fillId="0" borderId="1" xfId="0"/>
<xf numFmtId="165" fontId="6" fillId="5" borderId="1" xfId="0"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="5" fillId="0" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`;

// índices de estilo (cellXfs acima): mantidos coerentes com os usados no XML gerado abaixo
const S = {
  title: 1,
  note: 2,
  groupBlue: 3,
  groupLightBlue: 4,
  groupLightGreen: 5,
  groupYellow: 6,
  groupPeach: 7,
  colHeader: 8,
  text: 9,
  currencyBlue: 10,
  currency: 11,
  percent: 12,
  currencyYellow: 13,
  legendBold: 14,
  legendNormal: 15,
};

const DATA_HEADERS = [
  "Produto",
  "Variação(ões)",
  "Nº var.",
  "Preço cadastro",
  "Preço promoção (rede)",
  "Cupom loja",
  "Cliente paga (sem relâmpago)",
  "Desconto real vs cadastro",
  "Preço relâmpago",
  "Cupom loja",
  "Cliente paga (com relâmpago)",
  "Custo produção (R$/un)",
  "Embalagem + outros (R$/un)",
  "Taxas Shopee + imposto",
  "Lucro (R$)",
  "Margem %",
  "Taxas Shopee + imposto",
  "Lucro (R$)",
  "Margem %",
  "Cliente deve pagar p/ margem alvo",
  "Preço promoção p/ margem alvo",
  "Alerta",
  "Link do anúncio",
];

const LEGEND_LINES = [
  "Legenda:",
  "• Amarelo = você preenche (custo por unidade). Azul = preço lido da Shopee.",
  "• Cupom loja: o maior cupom que o cliente consegue levando 1 unidade, pela tabela da aba Parametros.",
  "• Taxas = (comissão + transação + imposto) × valor que o cliente paga + taxa fixa por venda. Edite os percentuais na aba Parametros.",
  "• Margem %: compare com a margem alvo definida na aba Parametros.",
  "• 'Preço promoção p/ margem alvo' já soma o cupom que o cliente vai usar naquele valor.",
  "• Se o valor ficar acima do preço de cadastro, o alerta nessa linha avisa.",
];

function numCell(ref: string, value: number | null | undefined, style: number): string {
  if (value == null || !Number.isFinite(value)) return `<c r="${ref}" s="${style}"/>`;
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

function strCell(ref: string, value: string, style: number): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function colLetter(idx: number): string {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function groupHeaderRow(): string {
  const groups: [number, number, string, number][] = [
    [0, 3, "PRODUTO", S.groupBlue],
    [4, 7, "SEM RELÂMPAGO (rede de proteção)", S.groupLightBlue],
    [8, 10, "COM RELÂMPAGO", S.groupLightGreen],
    [11, 12, "CUSTOS (preencher)", S.groupYellow],
    [13, 15, "RESULTADO SEM RELÂMPAGO", S.groupLightBlue],
    [16, 18, "RESULTADO COM RELÂMPAGO", S.groupLightGreen],
    [19, 21, "AJUSTE DE PREÇO", S.groupPeach],
  ];
  const cells = groups
    .map(([start, end, label, style]) => {
      let out = strCell(`${colLetter(start)}3`, label, style);
      for (let i = start + 1; i <= end; i++) out += `<c r="${colLetter(i)}3" s="${style}"/>`;
      return out;
    })
    .join("");
  return `<row r="3">${cells}</row>`;
}

function mergeCellsXml(): string {
  const ranges = [
    "A2:W2",
    "A3:D3",
    "E3:H3",
    "I3:K3",
    "L3:M3",
    "N3:P3",
    "Q3:S3",
    "T3:V3",
  ];
  return `<mergeCells count="${ranges.length}">${ranges.map((r) => `<mergeCell ref="${r}"/>`).join("")}</mergeCells>`;
}

/** Gera o .xlsx de exportação (aba "Precos e Margem" + aba "Parametros"), no mesmo
 * layout visual da planilha original (grupos de cabeçalho coloridos, coluna de custo
 * em amarelo, preços lidos da Shopee em azul). Valores já calculados (sem fórmulas
 * vivas) — é um retrato/base de cálculo, não uma planilha pra editar e recalcular. */
export function buildMarginSheetXlsxBlob(computedRows: ComputedMarginRow[], params: MarginParams): Blob {
  const note =
    "Como usar: preencha as colunas amarelas (custo de produção e embalagem/outros) por linha. " +
    "Exportado do Maph Pro 3D.";

  let dataRowsXml = "";
  computedRows.forEach((r, i) => {
    const rowNum = i + 5;
    const cells = [
      strCell(`A${rowNum}`, r.produto, S.text),
      strCell(`B${rowNum}`, r.variacao, S.text),
      numCell(`C${rowNum}`, r.numVariacoes, S.text),
      numCell(`D${rowNum}`, r.precoCadastro, S.currencyBlue),
      numCell(`E${rowNum}`, r.precoPromocaoRede, S.currencyBlue),
      numCell(`F${rowNum}`, r.cupomSemRelampago, S.currency),
      numCell(`G${rowNum}`, r.clientePagaSemRelampago, S.currency),
      numCell(`H${rowNum}`, r.descontoRealVsCadastro, S.percent),
      numCell(`I${rowNum}`, r.precoRelampago, S.currencyBlue),
      numCell(`J${rowNum}`, r.cupomComRelampago, S.currency),
      numCell(`K${rowNum}`, r.clientePagaComRelampago, S.currency),
      numCell(`L${rowNum}`, r.custoProducao, S.currencyYellow),
      numCell(`M${rowNum}`, r.embalagemOutros, S.currencyYellow),
      numCell(`N${rowNum}`, r.taxasSemRelampago, S.currency),
      numCell(`O${rowNum}`, r.lucroSemRelampago, S.currency),
      numCell(`P${rowNum}`, r.margemSemRelampagoPct, S.percent),
      numCell(`Q${rowNum}`, r.taxasComRelampago, S.currency),
      numCell(`R${rowNum}`, r.lucroComRelampago, S.currency),
      numCell(`S${rowNum}`, r.margemComRelampagoPct, S.percent),
      numCell(`T${rowNum}`, r.clienteDevePagarParaMargemAlvo, S.currency),
      numCell(`U${rowNum}`, r.precoPromocaoParaMargemAlvo, S.currency),
      strCell(`V${rowNum}`, r.alerta, S.text),
      strCell(`W${rowNum}`, r.link ?? "", S.text),
    ].join("");
    dataRowsXml += `<row r="${rowNum}">${cells}</row>`;
  });

  const legendStart = 5 + computedRows.length + 1;
  let legendXml = "";
  LEGEND_LINES.forEach((line, i) => {
    const rowNum = legendStart + i;
    legendXml += `<row r="${rowNum}">${strCell(`A${rowNum}`, line, i === 0 ? S.legendBold : S.legendNormal)}</row>`;
  });
  const lastRow = legendStart + LEGEND_LINES.length - 1;

  const headerCells = DATA_HEADERS.map((h, i) => strCell(`${colLetter(i)}4`, h, S.colHeader)).join("");

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<dimension ref="A1:W${lastRow}"/>
<sheetData>
<row r="1">${strCell("A1", "Preço final ao cliente e margem por produto (1 unidade)", S.title)}</row>
<row r="2">${strCell("A2", note, S.note)}</row>
${groupHeaderRow()}
<row r="4">${headerCells}</row>
${dataRowsXml}
${legendXml}
</sheetData>
${mergeCellsXml()}
</worksheet>`;

  const paramRows = params.cupomTiers
    .map(
      (t, i) =>
        `<row r="${13 + i}">${numCell(`A${13 + i}`, t.min, S.text)}${numCell(`B${13 + i}`, t.desconto, S.text)}${strCell(`C${13 + i}`, t.label ?? "", S.text)}</row>`,
    )
    .join("");
  const sheet2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>
<row r="1">${strCell("A1", "Parâmetros de taxas e cupons", S.title)}</row>
<row r="4">${strCell("A4", "Comissão Shopee (% do preço final)", S.text)}${numCell("B4", params.comissaoPercent / 100, S.text)}</row>
<row r="5">${strCell("A5", "Taxa de transação (%)", S.text)}${numCell("B5", params.taxaTransacaoPercent / 100, S.text)}</row>
<row r="6">${strCell("A6", "Imposto / tributação (%)", S.text)}${numCell("B6", params.impostoPercent / 100, S.text)}</row>
<row r="7">${strCell("A7", "Taxa fixa por venda (R$)", S.text)}${numCell("B7", params.taxaFixa, S.text)}</row>
<row r="8">${strCell("A8", "Margem alvo (% do preço final)", S.text)}${numCell("B8", params.margemAlvoPercent / 100, S.text)}</row>
<row r="11">${strCell("A11", "Cupons de loja ativos (aplicados em 1 unidade)", S.text)}</row>
<row r="12">${strCell("A12", "Pedido mínimo (R$)", S.text)}${strCell("B12", "Desconto (R$)", S.text)}${strCell("C12", "Cupom", S.text)}</row>
${paramRows}
</sheetData>
</worksheet>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "xl/workbook.xml": strToU8(WORKBOOK_XML),
    "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
    "xl/styles.xml": strToU8(STYLES_XML),
    "xl/sharedStrings.xml": strToU8(
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>`,
    ),
    "xl/worksheets/sheet1.xml": strToU8(sheet1Xml),
    "xl/worksheets/sheet2.xml": strToU8(sheet2Xml),
  };
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
