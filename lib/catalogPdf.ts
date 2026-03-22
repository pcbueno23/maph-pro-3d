import jsPDF from "jspdf";
import type { Product, PublicCatalogItem } from "@/types";

const PDF_MARGIN = 40;
const CONTENT_W = 515;
const IMG_W = 120;
const IMG_H = 90;
const GAP = 14;
const PAGE_BOTTOM = 760;

function fmtMoney(value: number, currency: string) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
  });
}

type PdfImageFormat = "JPEG" | "PNG" | "WEBP";

/** Carrega URL (ex.: Supabase) com CORS e devolve data URL para o jsPDF. */
async function loadImageForPdf(
  url: string,
): Promise<{ dataUrl: string; format: PdfImageFormat } | null> {
  try {
    if (url.startsWith("data:image/")) {
      let format: PdfImageFormat = "JPEG";
      if (url.startsWith("data:image/png")) format = "PNG";
      else if (url.startsWith("data:image/webp")) format = "WEBP";
      else if (!url.startsWith("data:image/jpeg") && !url.startsWith("data:image/jpg"))
        return null;
      return { dataUrl: url, format };
    }

    const res = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type.toLowerCase();
    if (!type.startsWith("image/")) return null;
    if (type.includes("svg")) return null;

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error("read"));
      r.readAsDataURL(blob);
    });

    let format: PdfImageFormat = "JPEG";
    if (type.includes("png")) format = "PNG";
    else if (type.includes("webp")) format = "WEBP";
    else if (type.includes("jpeg") || type.includes("jpg")) format = "JPEG";
    else if (dataUrl.startsWith("data:image/png")) format = "PNG";
    else if (dataUrl.startsWith("data:image/webp")) format = "WEBP";
    else if (dataUrl.startsWith("data:image/jpeg")) format = "JPEG";
    else return null;

    return { dataUrl, format };
  } catch {
    return null;
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  let next = y;
  if (next + needed > PAGE_BOTTOM) {
    doc.addPage();
    next = 48;
  }
  return next;
}

/** PDF do catálogo (gestão): passa URLs das thumbs em `imageUrlByProductId`. */
export async function downloadCatalogPdfFromProducts(params: {
  title: string;
  showPrices: boolean;
  products: Product[];
  imageUrlByProductId?: Record<string, string | undefined>;
}): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(18);
  doc.text(params.title, PDF_MARGIN, y);
  y += 36;
  doc.setFontSize(10);

  const list = [...params.products].sort((a, b) => {
    const sa = a.catalogSort ?? 9999;
    const sb = b.catalogSort ?? 9999;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const byId = params.imageUrlByProductId ?? {};

  for (const p of list) {
    const url = byId[p.id];
    const img = url ? await loadImageForPdf(url) : null;

    let textX = PDF_MARGIN;
    let textW = CONTENT_W;
    if (img) {
      textX = PDF_MARGIN + IMG_W + GAP;
      textW = CONTENT_W - IMG_W - GAP;
    }

    const desc = p.description ? String(p.description) : "";
    const descLines = desc ? doc.splitTextToSize(desc, textW) : [];
    const priceLines = params.showPrices ? 1 : 0;
    const textH = 14 + (params.showPrices ? 12 : 0) + descLines.length * 11 + 8;
    const blockH = Math.max(img ? IMG_H : 0, textH);

    y = ensureSpace(doc, y, blockH + 12);

    const blockTop = y;
    if (img) {
      doc.addImage(img.dataUrl, img.format, PDF_MARGIN, blockTop, IMG_W, IMG_H);
    }

    let ly = blockTop + 12;
    doc.setFont("helvetica", "bold");
    doc.text(p.name, textX, ly);
    ly += 14;
    doc.setFont("helvetica", "normal");
    if (params.showPrices) {
      doc.text(fmtMoney(p.price, p.currency), textX, ly);
      ly += 12;
    }
    if (descLines.length > 0) {
      doc.text(descLines, textX, ly);
    }

    y = blockTop + blockH + 8;
  }

  doc.save(`catalogo-maph-${Date.now()}.pdf`);
}

export async function downloadCatalogPdfPublic(params: {
  title: string;
  showPrices: boolean;
  items: PublicCatalogItem[];
}): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(18);
  doc.text(params.title, PDF_MARGIN, y);
  y += 36;
  doc.setFontSize(10);

  for (const p of params.items) {
    const img = p.imageUrl ? await loadImageForPdf(p.imageUrl) : null;

    let textX = PDF_MARGIN;
    let textW = CONTENT_W;
    if (img) {
      textX = PDF_MARGIN + IMG_W + GAP;
      textW = CONTENT_W - IMG_W - GAP;
    }

    const desc = p.description ? String(p.description) : "";
    const descLines = desc ? doc.splitTextToSize(desc, textW) : [];
    const textH =
      14 +
      (params.showPrices && p.price != null ? 12 : 0) +
      descLines.length * 11 +
      8;
    const blockH = Math.max(img ? IMG_H : 0, textH);

    y = ensureSpace(doc, y, blockH + 12);

    const blockTop = y;
    if (img) {
      doc.addImage(img.dataUrl, img.format, PDF_MARGIN, blockTop, IMG_W, IMG_H);
    }

    let ly = blockTop + 12;
    doc.setFont("helvetica", "bold");
    doc.text(p.name, textX, ly);
    ly += 14;
    doc.setFont("helvetica", "normal");
    if (params.showPrices && p.price != null) {
      doc.text(fmtMoney(p.price, p.currency), textX, ly);
      ly += 12;
    }
    if (descLines.length > 0) {
      doc.text(descLines, textX, ly);
    }

    y = blockTop + blockH + 8;
  }

  doc.save(`catalogo-${Date.now()}.pdf`);
}
