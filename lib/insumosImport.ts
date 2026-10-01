/**
 * Import/export de planilha de estoque de insumos (filamentos) em massa.
 *
 * Formato real confirmado num arquivo de exemplo do usuário ("Estoque de Filamentos
 * Corrigido.xlsx", gerado por outra ferramenta — Google Sheets/similar, por isso os
 * elementos XML vêm com prefixo de namespace "x:", diferente do resto do projeto):
 * aba "Estoque", cabeçalho na linha 1 (Material, Marca, Cor, Quantidade (g),
 * Quantidade (kg)), dados a partir da linha 2. O parser detecta o cabeçalho pelo texto
 * (não por posição fixa) e é tolerante a namespace prefixado ou não, pra funcionar tanto
 * com esse arquivo real quanto com o modelo gerado por buildInsumosTemplateXlsxBlob().
 *
 * Mesma stratação do resto do projeto: fflate (zip) + DOMParser nativo, nunca a lib
 * "xlsx"/SheetJS (CVEs sem correção).
 */
import { unzipSync, strFromU8, zipSync, strToU8 } from "fflate";
import type { SupplyCategory } from "@/types";

const SML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

export type ParsedInsumoRow = {
  name: string;
  material: string;
  marca: string;
  cor: string;
  category: SupplyCategory;
  unit: string;
  stockQty: number;
};

function xmlDoc(xml: string): Document {
  return new DOMParser().parseFromString(xml, "application/xml");
}

function colRefToIndex(ref: string): number {
  const col = /^[A-Z]+/.exec(ref)?.[0] ?? "A";
  let idx = 0;
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

/** Primeiro filho com esse nome local, ignorando prefixo de namespace (ex.: "x:v" ou "v"). */
function firstChildNS(el: Element, local: string): Element | null {
  const found = el.getElementsByTagNameNS(SML_NS, local);
  return found.length > 0 ? found[0] : null;
}

function parseSharedStrings(xml: string | undefined): string[] {
  if (!xml) return [];
  const doc = xmlDoc(xml);
  return Array.from(doc.getElementsByTagNameNS(SML_NS, "si")).map((si) =>
    Array.from(si.getElementsByTagNameNS(SML_NS, "t")).map((t) => t.textContent ?? "").join(""),
  );
}

/** Lê linhas por NÚMERO REAL de linha (atributo r="N") — robusto a namespace prefixado. */
function parseSheetRowsByNumber(xml: string, sharedStrings: string[]): Map<number, string[]> {
  const doc = xmlDoc(xml);
  const rowsByNum = new Map<number, string[]>();
  for (const rowEl of Array.from(doc.getElementsByTagNameNS(SML_NS, "row"))) {
    const rNum = parseInt(rowEl.getAttribute("r") ?? "", 10);
    if (!Number.isFinite(rNum)) continue;
    const row: string[] = [];
    for (const cellEl of Array.from(rowEl.getElementsByTagNameNS(SML_NS, "c"))) {
      const ref = cellEl.getAttribute("r");
      if (!ref) continue;
      const idx = colRefToIndex(ref);
      const type = cellEl.getAttribute("t");
      let value = "";
      if (type === "s") {
        const v = firstChildNS(cellEl, "v")?.textContent;
        value = v != null ? sharedStrings[parseInt(v, 10)] ?? "" : "";
      } else if (type === "inlineStr") {
        value = firstChildNS(cellEl, "t")?.textContent ?? "";
      } else {
        // cobre t="str" (texto direto em <v>, usado por esse formato) e t="n" (número)
        value = firstChildNS(cellEl, "v")?.textContent ?? "";
      }
      row[idx] = value;
    }
    rowsByNum.set(rNum, row);
  }
  return rowsByNum;
}

async function findSheetXmlByName(zip: Record<string, Uint8Array>, nameContains: string): Promise<string> {
  const workbookXml = zip["xl/workbook.xml"] ? strFromU8(zip["xl/workbook.xml"]) : null;
  const relsXml = zip["xl/_rels/workbook.xml.rels"] ? strFromU8(zip["xl/_rels/workbook.xml.rels"]) : null;
  if (!workbookXml || !relsXml) throw new Error("Arquivo .xlsx inválido.");
  const doc = xmlDoc(workbookXml);
  const sheets = Array.from(doc.getElementsByTagNameNS(SML_NS, "sheet"));
  const match =
    sheets.find((el) => (el.getAttribute("name") ?? "").toLowerCase().includes(nameContains.toLowerCase())) ??
    sheets[0];
  if (!match) throw new Error("Não encontrei nenhuma aba nesse arquivo.");
  const rId = match.getAttribute("r:id");
  if (!rId) throw new Error("Não encontrei a referência da aba.");
  const relDoc = xmlDoc(relsXml);
  const relEl = Array.from(relDoc.getElementsByTagName("Relationship")).find((el) => el.getAttribute("Id") === rId);
  let target = relEl?.getAttribute("Target");
  if (!target) throw new Error("Não localizei a planilha dessa aba.");
  target = target.replace(/^\//, "");
  if (!target.startsWith("xl/")) target = `xl/${target.replace(/^\.?\/?/, "")}`;
  return target;
}

function numOrNull(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = parseFloat(raw.trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

type HeaderMatch = { headerRow: number; material: number; marca: number; cor: number; gramas: number | null; kg: number | null };

/** Acha a linha de cabeçalho pelo TEXTO das colunas (não por posição fixa), procurando
 * nas primeiras linhas — assim funciona tanto com o arquivo real quanto com variações. */
function findHeaderRow(rowsByNum: Map<number, string[]>): HeaderMatch | null {
  const maxRow = Math.max(0, ...Array.from(rowsByNum.keys()));
  for (let r = 1; r <= Math.min(maxRow, 15); r++) {
    const row = rowsByNum.get(r);
    if (!row) continue;
    const norm = row.map((c) => (c ?? "").toLowerCase().trim());
    const material = norm.findIndex((c) => c.includes("material"));
    const marca = norm.findIndex((c) => c.includes("marca"));
    const cor = norm.findIndex((c) => c === "cor" || c.startsWith("cor"));
    const gramas = norm.findIndex((c) => c.includes("(g)") || c.includes("gramas"));
    const kg = norm.findIndex((c) => c.includes("(kg)") || c.includes("quilo"));
    if (material >= 0 && marca >= 0 && (gramas >= 0 || kg >= 0)) {
      return { headerRow: r, material, marca, cor, gramas: gramas >= 0 ? gramas : null, kg: kg >= 0 ? kg : null };
    }
  }
  return null;
}

/** Lê a planilha de estoque de filamentos (aba "Estoque"): Material, Marca, Cor,
 * Quantidade (g) ou (kg). Não tem custo — fica para o usuário preencher no app.
 * Nome do insumo = "marca material cor" (minúsculo), mesmo padrão já usado na página. */
export async function parseInsumosXlsx(file: File): Promise<ParsedInsumoRow[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const zip = unzipSync(buf);
  const sharedStrings = parseSharedStrings(
    zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : undefined,
  );

  const sheetPath = await findSheetXmlByName(zip, "estoque");
  const sheetXml = zip[sheetPath] ? strFromU8(zip[sheetPath]) : null;
  if (!sheetXml) throw new Error("Não consegui ler a aba de estoque desse arquivo.");
  const rowsByNum = parseSheetRowsByNumber(sheetXml, sharedStrings);

  const header = findHeaderRow(rowsByNum);
  if (!header) {
    throw new Error(
      'Não encontrei as colunas esperadas (Material, Marca, Cor, Quantidade (g) ou (kg)). Baixe o modelo e confira o formato.',
    );
  }

  const rows: ParsedInsumoRow[] = [];
  const maxRow = Math.max(0, ...Array.from(rowsByNum.keys()));
  for (let r = header.headerRow + 1; r <= maxRow; r++) {
    const row = rowsByNum.get(r);
    if (!row) continue;
    const material = row[header.material]?.trim() ?? "";
    const marca = row[header.marca]?.trim() ?? "";
    const cor = header.cor >= 0 ? row[header.cor]?.trim() ?? "" : "";
    if (!material && !marca && !cor) continue;

    let stockQty = header.gramas != null ? numOrNull(row[header.gramas]) : null;
    if (stockQty == null && header.kg != null) {
      const kgVal = numOrNull(row[header.kg]);
      stockQty = kgVal != null ? kgVal * 1000 : null;
    }
    if (stockQty == null) continue;

    const name = [marca, material, cor].filter(Boolean).join(" ").trim().toLowerCase();
    if (!name) continue;

    rows.push({ name, material, marca, cor, category: "filament", unit: "g", stockQty: Math.max(0, stockQty) });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// MODELO PARA DOWNLOAD
// ---------------------------------------------------------------------------

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function strCell(ref: string, value: string, style: number): string {
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
}

function numCell(ref: string, value: number, style: number): string {
  return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
}

const TEMPLATE_CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;

const TEMPLATE_ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

const TEMPLATE_WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

const TEMPLATE_WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Estoque" sheetId="1" r:id="rId1"/></sheets></workbook>`;

const TEMPLATE_STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><i/><sz val="9"/><color rgb="FF595959"/><name val="Arial"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3864"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="3">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="1" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/>
</cellXfs>
</styleSheet>`;

/** Gera um .xlsx de modelo (aba "Estoque", mesmo formato lido por parseInsumosXlsx) com
 * 2 linhas de exemplo, pro usuário baixar, preencher com seu estoque real e importar. */
export function buildInsumosTemplateXlsxBlob(): Blob {
  const headers = ["Material", "Marca", "Cor", "Quantidade (g)", "Quantidade (kg)"];
  const headerCells = headers.map((h, i) => strCell(`${colLetter(i)}1`, h, 1)).join("");

  const examples: Array<[string, string, string, number]> = [
    ["PLA", "Marca Exemplo", "Branco", 1000],
    ["PETG", "Marca Exemplo", "Preto", 500],
  ];
  let dataRows = "";
  examples.forEach(([material, marca, cor, g], i) => {
    const r = i + 2;
    dataRows += `<row r="${r}">${strCell(`A${r}`, material, 0)}${strCell(`B${r}`, marca, 0)}${strCell(`C${r}`, cor, 0)}${numCell(`D${r}`, g, 0)}${numCell(`E${r}`, Math.round((g / 1000) * 1000) / 1000, 0)}</row>`;
  });

  const noteRow = 2 + examples.length + 1;
  const note =
    "Preencha Material, Marca, Cor e Quantidade (g) (ou Quantidade (kg)) — uma linha por filamento. " +
    "O custo por unidade não entra aqui: é preenchido depois dentro do app, na página Insumos.";

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="10" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/><col min="3" max="3" width="20" customWidth="1"/><col min="4" max="4" width="16" customWidth="1"/><col min="5" max="5" width="16" customWidth="1"/></cols>
<sheetData>
<row r="1">${headerCells}</row>
${dataRows}
<row r="${noteRow}">${strCell(`A${noteRow}`, note, 2)}</row>
</sheetData>
</worksheet>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(TEMPLATE_CONTENT_TYPES),
    "_rels/.rels": strToU8(TEMPLATE_ROOT_RELS),
    "xl/workbook.xml": strToU8(TEMPLATE_WORKBOOK_XML),
    "xl/_rels/workbook.xml.rels": strToU8(TEMPLATE_WORKBOOK_RELS),
    "xl/styles.xml": strToU8(TEMPLATE_STYLES_XML),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml),
  };
  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped as unknown as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
