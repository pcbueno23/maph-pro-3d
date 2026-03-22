"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import type { Product } from "@/types";
import {
  fetchCatalogSettings,
  upsertCatalogSettings,
} from "@/lib/supabaseCatalog";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import { refreshProductsFromCloud } from "@/lib/productSync";
import { downloadCatalogPdfFromProducts } from "@/lib/catalogPdf";
import { listProductAssetsByProductIds, getProductAssetViewUrl } from "@/lib/supabaseProduction";
import type { CatalogSettings } from "@/types";

export default function CatalogoPage() {
  const user = useAuthStore((s) => s.user);
  const products = useProductsStore((s) => s.products);
  const updateProduct = useProductsStore((s) => s.updateProduct);

  const [settings, setSettings] = useState<CatalogSettings | null>(null);
  const [slugDraft, setSlugDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [thumbById, setThumbById] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      let s = await fetchCatalogSettings(user.id);
      if (!s) {
        s = await upsertCatalogSettings(user.id, {});
      }
      setSettings(s);
      setSlugDraft(s.publicSlug);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao carregar catálogo.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!user?.id) return;
    void refreshProductsFromCloud(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || products.length === 0) return;
    let alive = true;
    void (async () => {
      try {
        const assets = await listProductAssetsByProductIds({
          userId: user.id,
          productIds: products.map((p) => p.id),
          kind: "image",
        });
        const first = new Map<string, (typeof assets)[0]>();
        for (const a of assets) {
          if (!first.has(a.productId)) first.set(a.productId, a);
        }
        const entries: Array<[string, string]> = [];
        for (const [pid, asset] of first.entries()) {
          const url = await getProductAssetViewUrl(asset);
          if (url) entries.push([pid, url]);
        }
        if (alive) setThumbById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      alive = false;
    };
  }, [user?.id, products]);

  const catalogProducts = useMemo(
    () =>
      [...products].sort((a, b) => {
        const sa = a.catalogSort ?? 9999;
        const sb = b.catalogSort ?? 9999;
        if (sa !== sb) return sa - sb;
        return a.name.localeCompare(b.name);
      }),
    [products],
  );

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined" || !settings?.publicSlug) return "";
    return `${window.location.origin}/c/${settings.publicSlug}`;
  }, [settings?.publicSlug]);

  const persistProduct = async (p: Product) => {
    if (!user) return;
    updateProduct(p);
    await upsertProductsForUser(user.id, [p]);
  };

  const toggleVisible = async (p: Product, visible: boolean) => {
    const next: Product = {
      ...p,
      catalogVisible: visible,
      catalogSort: p.catalogSort ?? Date.now() % 100000,
      updatedAt: new Date().toISOString(),
    };
    await persistProduct(next);
    setMsg(null);
  };

  const setSort = async (p: Product, sort: number) => {
    const next: Product = {
      ...p,
      catalogSort: Number.isFinite(sort) ? sort : 0,
      updatedAt: new Date().toISOString(),
    };
    await persistProduct(next);
  };

  const saveShowPrices = async (show: boolean) => {
    if (!user) return;
    try {
      const s = await upsertCatalogSettings(user.id, { showPrices: show });
      setSettings(s);
      setMsg(null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar.");
    }
  };

  const saveSlug = async () => {
    if (!user) return;
    const s = slugDraft.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (s.length < 3) {
      setMsg("Use um link com pelo menos 3 caracteres (letras minúsculas, números ou hífen).");
      return;
    }
    setSavingSlug(true);
    try {
      const next = await upsertCatalogSettings(user.id, { publicSlug: s });
      setSettings(next);
      setSlugDraft(next.publicSlug);
      setMsg(null);
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message
          : "Slug já em uso ou inválido. Tente outro.",
      );
    } finally {
      setSavingSlug(false);
    }
  };

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMsg("Link copiado.");
    } catch {
      setMsg("Não foi possível copiar. Copie manualmente.");
    }
  };

  const exportPdf = async () => {
    const included = products.filter((p) => p.catalogVisible);
    if (included.length === 0) {
      setMsg("Marque ao menos um produto no catálogo.");
      return;
    }
    setMsg("Gerando PDF com imagens…");
    try {
      await downloadCatalogPdfFromProducts({
        title: "Catálogo MAPH PRO 3D",
        showPrices: settings?.showPrices ?? true,
        products: included,
        imageUrlByProductId: thumbById,
      });
      setMsg("PDF gerado.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao gerar o PDF.");
    }
  };

  if (!user) {
    return (
      <p className="text-sm text-slate-400">
        Faça login para montar seu catálogo público.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-400">Carregando configurações do catálogo…</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
          Catálogo
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Escolha quais produtos aparecem no catálogo, se o cliente vê preços e compartilhe por link
          ou PDF.
        </p>
      </div>

      {msg ? (
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-100">
          {msg}
        </div>
      ) : null}

      <div className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-2">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Link público
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">…/c/</span>
            <input
              value={slugDraft}
              onChange={(e) => setSlugDraft(e.target.value)}
              className="min-w-[140px] flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-slate-100"
              placeholder="meu-studio"
            />
            <button
              type="button"
              onClick={() => void saveSlug()}
              disabled={savingSlug}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              {savingSlug ? "Salvando…" : "Salvar link"}
            </button>
          </div>
          {publicUrl ? (
            <p className="break-all text-xs text-slate-500">{publicUrl}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyLink()}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              Copiar link
            </button>
            <a
              href={publicUrl || "#"}
              target="_blank"
              rel="noreferrer"
              className={`rounded-lg border border-cyan-700/50 px-3 py-1.5 text-xs text-cyan-300 hover:bg-cyan-950/40 ${!publicUrl ? "pointer-events-none opacity-50" : ""}`}
            >
              Abrir catálogo
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Exibir preços para o cliente
          </p>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              className="rounded border-slate-600"
              checked={settings?.showPrices ?? true}
              onChange={(e) => void saveShowPrices(e.target.checked)}
            />
            Mostrar valores no link público e no PDF
          </label>
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:from-cyan-500 hover:to-emerald-500"
          >
            Baixar PDF do catálogo
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-slate-200">Produtos no catálogo</h2>
        <p className="mt-1 text-xs text-slate-500">
          Marque os itens que deseja exibir. A ordem numérica é usada na vitrine (menor primeiro).
        </p>
        <ul className="mt-3 space-y-2">
          {catalogProducts.length === 0 ? (
            <li className="rounded-xl border border-dashed border-slate-700 px-3 py-6 text-center text-sm text-slate-500">
              Nenhum produto cadastrado. Crie produtos em{" "}
              <a href="/products" className="text-cyan-400 underline">
                Produtos
              </a>
              .
            </li>
          ) : (
            catalogProducts.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 px-3 py-2"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                  {thumbById[p.id] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumbById[p.id]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-slate-600">
                      —
                    </div>
                  )}
                </div>
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-slate-600"
                    checked={p.catalogVisible === true}
                    onChange={(e) => void toggleVisible(p, e.target.checked)}
                  />
                  <span className="truncate text-sm font-medium text-slate-100">{p.name}</span>
                </label>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <span>Ordem</span>
                  <input
                    type="number"
                    className="w-16 rounded border border-slate-700 bg-slate-950 px-1 py-0.5 text-slate-100"
                    key={`${p.id}-${p.catalogSort ?? ""}`}
                    defaultValue={p.catalogSort ?? ""}
                    placeholder="0"
                    onBlur={(e) => {
                      const v = e.target.value === "" ? NaN : Number(e.target.value);
                      void setSort(p, v);
                    }}
                  />
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
