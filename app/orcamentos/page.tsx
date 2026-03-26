"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import type { Product } from "@/types";
import type { QuoteItem } from "@/types";
import type { QuoteStatus } from "@/types";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import {
  listQuotes,
  listQuoteItems,
  upsertQuote,
  upsertQuoteItem,
  deleteQuote,
} from "@/lib/supabaseProduction";
import type { Quote } from "@/types";
import { rasterizeCompanyLogoForPdf } from "@/lib/companyLogoPdf";
import { supabase } from "@/lib/supabaseClient";

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatDateInput(d: Date) {
  // YYYY-MM-DD
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Dados salvos na aba Conta (Supabase Auth user_metadata). */
type CompanyBrandingPdf = {
  logoDataUrl: string;
  name: string;
  document: string;
  email: string;
  phone: string;
};

function getCompanyBrandingFromMetadata(
  metadata: Record<string, unknown> | undefined | null,
): CompanyBrandingPdf | null {
  if (!metadata) return null;
  const logo = String(
    metadata.company_logo_url ?? metadata.company_logo ?? metadata.avatar_url ?? "",
  ).trim();
  const name = String(metadata.company_name ?? "").trim();
  const document = String(metadata.company_document ?? "").trim();
  const email = String(metadata.company_email ?? "").trim();
  const phone = String(metadata.company_phone ?? "").trim();
  if (!logo && !name && !document && !email && !phone) return null;
  return { logoDataUrl: logo, name, document, email, phone };
}

type WizardStep = 1 | 2 | 3 | 4;

export default function OrcamentosPage() {
  const { user } = useAuthStore();

  const [step, setStep] = useState<WizardStep>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);

  // Lista de orçamentos existentes (para reabrir/editar no futuro)
  const [quotes, setQuotes] = useState<Quote[]>([]);

  // Wizard: estado
  const [quoteId, setQuoteId] = useState<string>(() => generateUuid());
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => formatDateInput(new Date()));
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [notes, setNotes] = useState("");

  // Itens (produtos + quantidades + unit price)
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [items, setItems] = useState<QuoteItem[]>([]);

  // Valores
  const [discountPercent, setDiscountPercent] = useState<number | "">(0);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);
  const unitPriceForProduct = (productId: string) => productsById.get(productId)?.price ?? 0;

  const subtotal = useMemo(() => items.reduce((acc, it) => acc + (it.lineTotal ?? it.unitPrice * it.quantity), 0), [items]);
  const discountAmount = useMemo(() => (subtotal * Math.max(0, discountPercent === "" ? 0 : discountPercent)) / 100, [subtotal, discountPercent]);
  const total = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);

  const quoteStatus: QuoteStatus = "draft";

  const canGoStep2 = items.length > 0;
  const canGoStep3 = clientName.trim().length > 0 && canGoStep2;

  async function handleDownloadPdf() {
    if (!items.length) {
      setError("Adicione pelo menos 1 item antes de gerar o PDF.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const mod = await import("jspdf");
      const { jsPDF } = mod;
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      const marginX = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const marginRight = marginX;
      let y = 48;

      let metaForBranding: Record<string, unknown> | undefined =
        user?.user_metadata as Record<string, unknown> | undefined;
      if (supabase) {
        const { data: fresh } = await supabase.auth.getUser();
        if (fresh.user?.user_metadata) {
          metaForBranding = fresh.user.user_metadata as Record<string, unknown>;
        }
      }

      const branding = getCompanyBrandingFromMetadata(metaForBranding);

      if (branding) {
        let logoRendered = false;
        if (branding.logoDataUrl) {
          const raster = await rasterizeCompanyLogoForPdf(branding.logoDataUrl);
          if (raster) {
            try {
              doc.addImage(raster.data, raster.format, marginX, y, 56, 56);
              logoRendered = true;
            } catch {
              // Logo inválido — segue só com texto
            }
          }
        }

        const textColumnX = marginX + (logoRendered ? 72 : 0);
        const companyTitle = branding.name || "Empresa";

        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(companyTitle, textColumnX, y + 14);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);

        let ty = y + 28;
        if (branding.document) {
          doc.text(`CNPJ/CPF: ${branding.document}`, textColumnX, ty);
          ty += 12;
        }
        if (branding.email) {
          doc.text(branding.email, textColumnX, ty);
          ty += 12;
        }
        if (branding.phone) {
          doc.text(`Tel: ${branding.phone}`, textColumnX, ty);
          ty += 12;
        }

        const headerBottom = Math.max(logoRendered ? y + 56 : y, ty + 4);
        y = headerBottom + 10;

        doc.setDrawColor(180);
        doc.line(marginX, y, pageW - marginRight, y);
        y += 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Orçamento", marginX, y);
      y += 18;
      doc.setFont("helvetica", "normal");

      doc.setFontSize(10);
      doc.text(`Cliente: ${clientName.trim()}`, marginX, y);
      y += 14;
      if (clientPhone.trim()) {
        doc.text(`Telefone: ${clientPhone.trim()}`, marginX, y);
        y += 14;
      }
      doc.text(`Data: ${quoteDate}${deliveryDate ? ` · Entrega: ${deliveryDate}` : ""}`, marginX, y);
      y += 22;

      doc.setFontSize(10);
      doc.text("Itens", marginX, y);
      y += 14;

      const startY = y;
      const rowH = 16;
      const colProdutoW = 190;
      const colQtdW = 60;
      const colUnitW = 95;
      const colTotalW = 90;

      const xProduto = marginX;
      const xQtd = marginX + colProdutoW;
      const xUnit = xQtd + colQtdW;
      const xTotal = xUnit + colUnitW;

      // Header
      doc.setFontSize(9);
      doc.text("Produto", xProduto, y);
      doc.text("Qtd", xQtd, y);
      doc.text("Preço/un", xUnit, y);
      doc.text("Total", xTotal, y);
      y += 10;

      doc.setDrawColor(150);
      doc.line(marginX, y, marginX + colProdutoW + colQtdW + colUnitW + colTotalW, y);
      y += 6;

      doc.setFontSize(9);
      for (const it of items) {
        const p = productsById.get(it.productId);
        const label = p?.name ?? it.productId;
        // evita overflow: trunca texto
        const safe = label.length > 24 ? `${label.slice(0, 22)}...` : label;
        doc.text(safe, xProduto, y);
        doc.text(String(it.quantity), xQtd, y);
        doc.text(formatBRL(it.unitPrice), xUnit, y);
        doc.text(formatBRL(it.quantity * it.unitPrice), xTotal, y);
        y += rowH;
        if (y > 760) {
          // pagina extra simples
          doc.addPage();
          y = 54;
        }
      }

      y = Math.max(y, startY + rowH);
      y += 10;

      doc.setFontSize(10);
      doc.text(`Subtotal: ${formatBRL(subtotal)}`, marginX, y);
      y += 14;
      doc.text(`Desconto: -${formatBRL(discountAmount)}`, marginX, y);
      y += 14;
      doc.setFontSize(12);
      doc.text(`Total: ${formatBRL(total)}`, marginX, y);
      y += 22;

      if (notes.trim()) {
        doc.setFontSize(10);
        doc.text("Notas:", marginX, y);
        y += 14;
        doc.setFontSize(9);
        const noteLines = doc.splitTextToSize(notes.trim(), 500);
        for (const line of noteLines.slice(0, 8)) {
          doc.text(String(line), marginX, y);
          y += 12;
        }
      }

      const totalPages = doc.getNumberOfPages();
      const pageH = doc.internal.pageSize.getHeight();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(
          `Documento gerado em ${new Date().toLocaleString("pt-BR")} · Página ${p}/${totalPages}`,
          marginX,
          pageH - 28,
        );
        doc.setTextColor(0);
      }

      doc.save(`orcamento_${quoteId}.pdf`);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao gerar PDF.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [prods, qs] = await Promise.all([
          fetchUserProducts(user.id),
          listQuotes(user.id),
        ]);
        if (!alive) return;
        setProducts(prods);
        setQuotes(qs);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Falha ao carregar orçamentos.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id]);

  function resetWizard() {
    setStep(1);
    setQuoteId(generateUuid());
    setClientName("");
    setClientPhone("");
    setQuoteDate(formatDateInput(new Date()));
    setDeliveryDate("");
    setNotes("");
    setItems([]);
    setSelectedProductId("");
    setSelectedQty(1);
    setDiscountPercent(0);
    setError(null);
  }

  function addItem() {
    if (!selectedProductId) return;
    const p = productsById.get(selectedProductId);
    if (!p) return;

    const qty = Math.max(1, Number(selectedQty) || 1);
    const unitPrice = unitPriceForProduct(selectedProductId);
    const lineTotal = unitPrice * qty;

    setItems((prev) => {
      // Se já existir item para o produto, apenas soma quantidade
      const existing = prev.find((x) => x.productId === selectedProductId);
      if (existing) {
        return prev.map((x) =>
          x.productId === selectedProductId
            ? {
                ...x,
                quantity: x.quantity + qty,
                unitPrice,
                lineTotal: x.quantity * unitPrice + qty * unitPrice,
              }
            : x,
        );
      }
      return [
        ...prev,
        {
          id: generateUuid(),
          userId: user!.id,
          quoteId,
          productId: selectedProductId,
          quantity: qty,
          unitPrice,
          lineTotal,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    });
  }

  function removeItem(itemId: string) {
    setItems((prev) => prev.filter((x) => x.id !== itemId));
  }

  async function handleSave() {
    if (!user) return;
    if (!clientName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (items.length === 0) {
      setError("Adicione pelo menos 1 produto.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      const payload: Omit<Quote, "userId"> = {
        id: quoteId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || null,
        quoteDate,
        deliveryDate: deliveryDate ? deliveryDate : null,
        status: quoteStatus,
        notes: notes.trim() || null,
        subtotal,
        discount: discountAmount,
        total,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await upsertQuote(user.id, payload);

      // Salva itens (upsert por id)
      for (const it of items) {
        const itemPayload = {
          id: it.id,
          quoteId,
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          lineTotal: it.quantity * it.unitPrice,
          createdAt: it.createdAt,
          updatedAt: nowIso,
        } satisfies Omit<QuoteItem, "userId">;
        await upsertQuoteItem(user.id, itemPayload);
      }

      const freshQuotes = await listQuotes(user.id);
      setQuotes(freshQuotes);
      // Mantém o wizard aberto na Etapa 4 para permitir download do PDF.
      setStep(4);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar orçamento.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLoadQuote(q: Quote) {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const its = await listQuoteItems(user.id, q.id);
      setQuoteId(q.id);
      setClientName(q.clientName);
      setClientPhone(q.clientPhone ?? "");
      setQuoteDate(q.quoteDate);
      setDeliveryDate(q.deliveryDate ?? "");
      setNotes(q.notes ?? "");
      setItems(
        its.map((it) => ({
          ...it,
          // alinhamento de campos extras caso venha null/undefined
          lineTotal: it.lineTotal ?? it.unitPrice * it.quantity,
        })),
      );
      // desconto percent calculado de forma aproximada
      const perc = q.subtotal > 0 ? (q.discount / q.subtotal) * 100 : 0;
      setDiscountPercent(Math.max(0, perc));
      setStep(4);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar orçamento.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteQuote(q: Quote) {
    if (!user) return;
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Excluir o orçamento de "${q.clientName}" (${q.quoteDate})?\nEsta ação não pode ser desfeita.`,
          )
        : false;
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deleteQuote(user.id, q.id);
      setQuotes((prev) => prev.filter((x) => x.id !== q.id));
      if (quoteId === q.id) {
        resetWizard();
      }
    } catch (e: any) {
      setError(e?.message ?? "Falha ao remover orçamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Orçamentos
          </h1>
          <p className="mt-1 text-sm text-slate-400">Wizard: cliente → itens → valores → resumo.</p>
        </div>
        <button
          type="button"
          onClick={resetWizard}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
          disabled={loading}
        >
          Novo orçamento
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Etapa {step} / 4
            </p>
            <p className="text-xs text-slate-500">{loading ? "Processando..." : ""}</p>
          </div>

          {step === 1 && (
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Cliente</label>
                <input
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Telefone (opcional)</label>
                <input
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(DDD) 9XXXX-XXXX"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Data do orçamento</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Entrega (opcional)</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Notas (opcional)</label>
                <textarea
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Produto</label>
                  <select
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    disabled={products.length === 0}
                  >
                    <option value="">Selecione</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({Number(p.weight).toFixed(0)}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Qtd</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={selectedQty}
                    onChange={(e) => setSelectedQty(Number(e.target.value) || 1)}
                    disabled={!selectedProductId}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={addItem}
                disabled={loading || !selectedProductId}
                className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                Adicionar item
              </button>

              {items.length === 0 ? (
                <p className="text-xs text-slate-500 pt-2">Nenhum item adicionado.</p>
              ) : (
                <div className="overflow-x-auto pt-1">
                  <table className="min-w-full text-left text-xs">
                    <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Produto</th>
                        <th className="px-2 py-2">Qtd</th>
                        <th className="px-2 py-2">Preço/un</th>
                        <th className="px-2 py-2">Total</th>
                        <th className="px-2 py-2 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {items.map((it) => {
                        const p = productsById.get(it.productId);
                        return (
                          <tr key={it.id} className="hover:bg-slate-900/60">
                            <td className="px-2 py-2 text-slate-100">{p?.name ?? it.productId}</td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={1}
                                step={1}
                                className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                value={it.quantity}
                                onChange={(e) => {
                                  const qty = Math.max(1, Number(e.target.value) || 1);
                                  setItems((prev) =>
                                    prev.map((x) =>
                                      x.id === it.id
                                        ? {
                                            ...x,
                                            quantity: qty,
                                            lineTotal: qty * x.unitPrice,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                min={0}
                                step={0.01}
                                className="w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                value={it.unitPrice}
                                onChange={(e) => {
                                  const unitPrice = Math.max(0, Number(e.target.value) || 0);
                                  setItems((prev) =>
                                    prev.map((x) =>
                                      x.id === it.id
                                        ? {
                                            ...x,
                                            unitPrice,
                                            lineTotal: x.quantity * unitPrice,
                                          }
                                        : x,
                                    ),
                                  );
                                }}
                              />
                            </td>
                            <td className="px-2 py-2 text-emerald-300">
                              {(it.quantity * it.unitPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </td>
                            <td className="px-2 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removeItem(it.id)}
                                className="text-xs text-rose-400 hover:text-rose-300"
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">Desconto (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Valores</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Subtotal:{" "}
                    <span className="font-semibold text-slate-100">
                      {subtotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Desconto:{" "}
                    <span className="font-semibold text-rose-300">
                      -{discountAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Total:{" "}
                    <span className="font-semibold text-emerald-300">
                      {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Resumo do orçamento
                </p>
                <p className="mt-2 text-sm text-slate-100">
                  Cliente: <span className="font-semibold text-slate-50">{clientName.trim() || "—"}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Data: {quoteDate} {deliveryDate ? `· Entrega: ${deliveryDate}` : ""}
                </p>
                <p className="mt-2 text-xs text-slate-300">
                  Total:{" "}
                  <span className="font-semibold text-emerald-300">
                    {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </p>
              </div>

              <div className="overflow-x-auto pt-1">
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-2 py-2">Produto</th>
                      <th className="px-2 py-2">Qtd</th>
                      <th className="px-2 py-2">Preço/un</th>
                      <th className="px-2 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {items.map((it) => {
                      const p = productsById.get(it.productId);
                      return (
                        <tr key={it.id} className="hover:bg-slate-900/60">
                          <td className="px-2 py-2 text-slate-100">{p?.name ?? it.productId}</td>
                          <td className="px-2 py-2 text-slate-200">{it.quantity}</td>
                          <td className="px-2 py-2 text-slate-200">
                            {it.unitPrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                          <td className="px-2 py-2 text-emerald-300">
                            {(it.quantity * it.unitPrice).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-between gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s))}
              disabled={loading || step === 1}
              className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:opacity-60"
            >
              Voltar
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 1 && !clientName.trim()) {
                    setError("Informe o nome do cliente.");
                    return;
                  }
                  if (step === 2 && !canGoStep2) {
                    setError("Adicione pelo menos 1 item.");
                    return;
                  }
                  // Como esse botão só aparece quando step < 4,
                  // o step + 1 nunca passa de 4.
                  setStep((step + 1) as WizardStep);
                }}
                disabled={loading || (step === 2 && !canGoStep2)}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                Próximo
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={loading || items.length === 0}
                  className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:opacity-60"
                >
                  Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                >
                  Salvar orçamento
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Orçamentos existentes
          </p>

          {quotes.length === 0 ? (
            <p className="mt-4 text-xs text-slate-500">Nenhum orçamento salvo ainda.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {quotes.slice(0, 8).map((q) => (
                <div
                  key={q.id}
                  className="flex items-stretch gap-1 rounded-xl border border-slate-800 bg-slate-950/40 transition hover:border-slate-700"
                >
                  <button
                    type="button"
                    onClick={() => handleLoadQuote(q)}
                    className="min-w-0 flex-1 p-3 text-left transition hover:bg-slate-900/60"
                    disabled={loading}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-100 truncate">{q.clientName}</p>
                      <p className="shrink-0 text-[11px] text-emerald-300">
                        {q.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {q.quoteDate} · {q.status}
                    </p>
                  </button>
                  <button
                    type="button"
                    title="Excluir orçamento"
                    aria-label={`Excluir orçamento de ${q.clientName}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDeleteQuote(q);
                    }}
                    disabled={loading}
                    className="flex shrink-0 items-center justify-center rounded-r-xl border-l border-slate-800 px-3 text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

