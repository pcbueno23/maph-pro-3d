"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getCatalogPublicBySlug } from "@/lib/supabaseCatalog";
import { downloadCatalogPdfPublic } from "@/lib/catalogPdf";
import type { PublicCatalogItem } from "@/types";

function fmtMoney(value: number, currency: string) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "BRL",
  });
}

export default function PublicCatalogPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [emptyOk, setEmptyOk] = useState(false);
  const [showPrices, setShowPrices] = useState(true);
  const [items, setItems] = useState<PublicCatalogItem[]>([]);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setNotFound(true);
      setEmptyOk(false);
      setItems([]);
      return;
    }
    let alive = true;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      setEmptyOk(false);
      const res = await getCatalogPublicBySlug(slug);
      if (!alive) return;
      if (!res.ok) {
        setNotFound(true);
        setItems([]);
      } else {
        setShowPrices(res.showPrices);
        setItems(res.products);
        setEmptyOk(res.products.length === 0);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const downloadPdf = async () => {
    await downloadCatalogPdfPublic({
      title: "Catálogo",
      showPrices,
      items,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-400">
        Carregando catálogo…
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
        <p className="text-slate-300">Catálogo não encontrado ou link inválido.</p>
      </div>
    );
  }

  if (emptyOk) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <h1 className="text-2xl font-semibold text-slate-50">Catálogo</h1>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center">
          <p className="text-slate-300">
            Nenhum produto público no momento. O dono do catálogo pode marcar itens em Catálogo no
            app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-50">Catálogo</h1>
        <button
          type="button"
          onClick={downloadPdf}
          className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Baixar PDF
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => (
          <li
            key={p.id}
            className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg"
          >
            <div className="aspect-[4/3] w-full bg-slate-800">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-slate-600">
                  Sem foto
                </div>
              )}
            </div>
            <div className="space-y-1 p-3">
              <p className="font-semibold text-slate-100">{p.name}</p>
              {showPrices && p.price != null ? (
                <p className="text-lg text-emerald-400">{fmtMoney(p.price, p.currency)}</p>
              ) : null}
              {p.description ? (
                <p className="line-clamp-4 text-xs text-slate-400">{p.description}</p>
              ) : null}
              {p.printTimeMinutes != null ? (
                <p className="text-[11px] text-slate-500">Tempo: ~{p.printTimeMinutes} min</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
