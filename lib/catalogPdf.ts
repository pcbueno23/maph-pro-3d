import jsPDF from "jspdf";
import type { Product, PublicCatalogItem } from "@/types";

function fmtMoney(value: number, currency: string) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
  });
}

/** PDF do catálogo (gestão: produtos do store; público: itens da RPC). */
export function downloadCatalogPdfFromProducts(params: {
  title: string;
  showPrices: boolean;
  products: Product[];
}): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(18);
  doc.text(params.title, 40, y);
  y += 36;
  doc.setFontSize(10);
  const list = [...params.products].sort((a, b) => {
    const sa = a.catalogSort ?? 9999;
    const sb = b.catalogSort ?? 9999;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });
  for (const p of list) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.text(p.name, 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    if (params.showPrices) {
      doc.text(fmtMoney(p.price, p.currency), 40, y);
      y += 12;
    }
    if (p.description) {
      const lines = doc.splitTextToSize(String(p.description), 515);
      doc.text(lines, 40, y);
      y += lines.length * 11 + 8;
    } else {
      y += 6;
    }
    y += 8;
  }
  doc.save(`catalogo-maph-${Date.now()}.pdf`);
}

export function downloadCatalogPdfPublic(params: {
  title: string;
  showPrices: boolean;
  items: PublicCatalogItem[];
}): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  let y = 48;
  doc.setFontSize(18);
  doc.text(params.title, 40, y);
  y += 36;
  doc.setFontSize(10);
  for (const p of params.items) {
    if (y > 760) {
      doc.addPage();
      y = 48;
    }
    doc.setFont("helvetica", "bold");
    doc.text(p.name, 40, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    if (params.showPrices && p.price != null) {
      doc.text(fmtMoney(p.price, p.currency), 40, y);
      y += 12;
    }
    if (p.description) {
      const lines = doc.splitTextToSize(String(p.description), 515);
      doc.text(lines, 40, y);
      y += lines.length * 11 + 8;
    } else {
      y += 6;
    }
    y += 8;
  }
  doc.save(`catalogo-${Date.now()}.pdf`);
}
