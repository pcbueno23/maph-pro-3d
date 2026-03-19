"use client";

import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Printer, Product, ProductAsset } from "@/types";
import { MARKETPLACES } from "@/lib/constants";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { deleteProduct, upsertProductsForUser } from "@/lib/supabaseProducts";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import type { ProductMaterial, SupplyItem } from "@/types";
import {
  deleteProductMaterial,
  listProductMaterials,
  listProductAssets,
  listProductAssetsByProductIds,
  getProductAssetViewUrl,
  uploadProductFile,
  listSupplies,
  upsertProductMaterial,
} from "@/lib/supabaseProduction";
import { computeProductUnitCost } from "@/lib/productionCost";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  products: Product[];
}

function newId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${prefix}_${Date.now()}`;
}

export function ProductTable({ products }: Props) {
  const router = useRouter();
  const removeProduct = useProductsStore((s) => s.removeProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const { user } = useAuthStore();
  useInventoryStore();
  useSuppliesStore();

  const [bomOpen, setBomOpen] = useState(false);
  const [bomProduct, setBomProduct] = useState<Product | null>(null);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState<string | null>(null);
  const [addSupplyId, setAddSupplyId] = useState<string>("");
  const [addQty, setAddQty] = useState<number>(0);

  // ficha técnica
  const [techOpen, setTechOpen] = useState(false);
  const [techPrinters, setTechPrinters] = useState<Printer[]>([]);
  const [techProduct, setTechProduct] = useState<Product | null>(null);
  const [techSku, setTechSku] = useState("");
  const [techTimeMinutes, setTechTimeMinutes] = useState<number | null>(null);
  const [techDefaultPrinterId, setTechDefaultPrinterId] = useState<string>("");

  // Modal "Abrir" com todas as informações do produto (sem ir para /calculator)
  const [infoOpen, setInfoOpen] = useState(false);
  const [infoProduct, setInfoProduct] = useState<Product | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoSupplies, setInfoSupplies] = useState<SupplyItem[]>([]);
  const [infoMaterials, setInfoMaterials] = useState<ProductMaterial[]>([]);
  const [infoAssets, setInfoAssets] = useState<ProductAsset[]>([]);
  const [infoUploadBusy, setInfoUploadBusy] = useState(false);
  const [infoEditOpen, setInfoEditOpen] = useState(false);
  const [infoDraft, setInfoDraft] = useState<Partial<Product> | null>(null);
  const [infoSaveBusy, setInfoSaveBusy] = useState(false);

  const [productThumbById, setProductThumbById] = useState<Record<string, string>>({});

  useEffect(() => {
    const userId = user?.id as string | undefined;
    if (!userId) return;
    let alive = true;

    async function loadThumbs() {
      try {
        const ids = products.map((p) => p.id);
        if (!ids.length) {
          if (alive) setProductThumbById({});
          return;
        }
        const assets = await listProductAssetsByProductIds({
          userId: userId!,
          productIds: ids,
          kind: "image",
        });

        const firstByProduct = new Map<string, ProductAsset>();
        for (const a of assets) {
          if (!firstByProduct.has(a.productId)) firstByProduct.set(a.productId, a);
        }

        const entries: Array<[string, string]> = [];
        for (const [productId, asset] of firstByProduct.entries()) {
          const url = await getProductAssetViewUrl(asset);
          if (url) entries.push([productId, url]);
        }
        if (!alive) return;
        setProductThumbById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
      } catch {
        // ignora
      }
    }

    loadThumbs();
    return () => {
      alive = false;
    };
  }, [products, user?.id]);
  const [
    infoCost,
    setInfoCost,
  ] = useState<{
    totalCost: number;
    materialCost: number;
    energyCost: number;
    depreciationCost: number;
    packagingCost: number;
  } | null>(null);

  async function openProductInfo(product: Product) {
    if (!user) {
      if (typeof window !== "undefined") {
        window.alert("Faça login para abrir as informações do produto.");
      }
      return;
    }

    setInfoOpen(true);
    setInfoProduct(product);
    setInfoLoading(true);
    setInfoError(null);
    setInfoSupplies([]);
    setInfoMaterials([]);
    setInfoAssets([]);
    setInfoCost(null);
    setInfoEditOpen(false);
    setInfoDraft(null);

    try {
      const [sups, mats, assets, cost] = await Promise.all([
        listSupplies(user.id),
        listProductMaterials(user.id, product.id),
        listProductAssets(user.id, product.id),
        computeProductUnitCost(user.id, product),
      ]);
      setInfoSupplies(sups);
      setInfoMaterials(mats);
      setInfoAssets(assets);
      setInfoCost(cost);
    } catch (e: any) {
      setInfoError(e?.message ?? "Falha ao carregar informações do produto.");
    } finally {
      setInfoLoading(false);
    }
  }

  async function uploadMainImageForInfo(file: File) {
    if (!user || !infoProduct) return;
    setInfoUploadBusy(true);
    setInfoError(null);
    try {
      await uploadProductFile({ userId: user.id, productId: infoProduct.id, kind: "image", file });
      const assets = await listProductAssets(user.id, infoProduct.id);
      setInfoAssets(assets);
      const newest = assets.find((a) => a.kind === "image") ?? null;
      if (newest) {
        const url = await getProductAssetViewUrl(newest);
        if (url) setProductThumbById((prev) => ({ ...prev, [infoProduct.id]: url }));
      }
    } catch (e: any) {
      setInfoError(e?.message ?? "Falha ao enviar imagem do produto.");
    } finally {
      setInfoUploadBusy(false);
    }
  }

  function closeProductInfo() {
    setInfoOpen(false);
    setInfoProduct(null);
    setInfoLoading(false);
    setInfoError(null);
    setInfoSupplies([]);
    setInfoMaterials([]);
    setInfoAssets([]);
    setInfoCost(null);
    setInfoEditOpen(false);
    setInfoDraft(null);
  }

  function startEditInfo() {
    if (!infoProduct) return;
    setInfoEditOpen(true);
    setInfoError(null);
    setInfoDraft({
      name: infoProduct.name,
      sku: infoProduct.sku ?? null,
      description: infoProduct.description ?? null,
      weight: infoProduct.weight,
      price: infoProduct.price,
      currency: infoProduct.currency,
      marketplace: infoProduct.marketplace,
      printTimeMinutes: infoProduct.printTimeMinutes ?? null,
      defaultPrinterId: infoProduct.defaultPrinterId ?? null,
    });
  }

  function cancelEditInfo() {
    setInfoEditOpen(false);
    setInfoDraft(null);
    setInfoError(null);
  }

  async function saveEditInfo() {
    if (!user || !infoProduct || !infoDraft) return;
    const nowIso = new Date().toISOString();
    const updated: Product = {
      ...infoProduct,
      name: String(infoDraft.name ?? infoProduct.name).trim() || infoProduct.name,
      sku: (infoDraft.sku ?? null) as any,
      description: (infoDraft.description ?? null) as any,
      weight: Number(infoDraft.weight ?? infoProduct.weight) || 0,
      price: Number(infoDraft.price ?? infoProduct.price) || 0,
      currency: (infoDraft.currency ?? infoProduct.currency) as any,
      marketplace: (infoDraft.marketplace ?? infoProduct.marketplace) as any,
      printTimeMinutes:
        infoDraft.printTimeMinutes == null
          ? null
          : Number(infoDraft.printTimeMinutes),
      defaultPrinterId: (infoDraft.defaultPrinterId ?? null) as any,
      updatedAt: nowIso,
    };

    if (!updated.name) {
      setInfoError("O nome do produto é obrigatório.");
      return;
    }
    if (!Number.isFinite(updated.weight) || updated.weight < 0) {
      setInfoError("Peso inválido.");
      return;
    }
    if (!Number.isFinite(updated.price) || updated.price < 0) {
      setInfoError("Preço inválido.");
      return;
    }

    setInfoSaveBusy(true);
    setInfoError(null);
    try {
      await upsertProductsForUser(user.id, [updated]);
      updateProduct(updated);
      setInfoProduct(updated);
      setInfoEditOpen(false);
      setInfoDraft(null);
    } catch (e: any) {
      setInfoError(e?.message ?? "Falha ao salvar produto.");
    } finally {
      setInfoSaveBusy(false);
    }
  }

  const materialCost = useMemo(() => {
    if (!bomProduct) return 0;
    const map = new Map(supplies.map((s) => [s.id, s] as const));
    return materials.reduce((acc, m) => {
      const s = map.get(m.supplyId);
      const unitCost = s?.unitCost ?? 0;
      return acc + (m.qty ?? 0) * unitCost;
    }, 0);
  }, [materials, supplies, bomProduct]);

  useEffect(() => {
    if (!addSupplyId) return;
    const existing = materials.find((m) => m.supplyId === addSupplyId);
    if (existing) setAddQty(Number(existing.qty ?? 0));
  }, [addSupplyId, materials]);

  const openBom = async (product: Product) => {
    if (!user) {
      if (typeof window !== "undefined") {
        window.alert("Faça login para usar BOM (materiais) via Supabase.");
      }
      return;
    }
    setBomProduct(product);
    setBomOpen(true);
    setBomLoading(true);
    setBomError(null);
    try {
      const [sups, mats] = await Promise.all([
        listSupplies(user.id),
        listProductMaterials(user.id, product.id),
      ]);
      setSupplies(sups);
      setMaterials(mats);
      const firstMat = mats[0];
      setAddSupplyId(firstMat?.supplyId ?? sups[0]?.id ?? "");
      setAddQty(firstMat ? Number(firstMat.qty ?? 0) : 0);
    } catch (e: any) {
      setBomError(e?.message ?? "Falha ao carregar BOM.");
    } finally {
      setBomLoading(false);
    }
  };

  const closeBom = () => {
    setBomOpen(false);
    setBomProduct(null);
    setSupplies([]);
    setMaterials([]);
    setBomError(null);
    setAddSupplyId("");
    setAddQty(0);
  };

  const openTechnical = async (product: Product) => {
    if (!user) {
      if (typeof window !== "undefined") {
        window.alert("Faça login para editar ficha técnica (impressoras do Supabase).");
      }
      return;
    }
    setTechProduct(product);
    setTechSku(product.sku ?? "");
    setTechTimeMinutes(product.printTimeMinutes ?? null);
    setTechDefaultPrinterId(product.defaultPrinterId ?? "");
    setTechOpen(true);

    try {
      const { listPrinters } = await import("@/lib/supabaseProduction");
      const printers = await listPrinters(user.id);
      setTechPrinters(printers);
    } catch {
      setTechPrinters([]);
    }
  };

  const closeTechnical = () => {
    setTechOpen(false);
    setTechProduct(null);
    setTechPrinters([]);
    setTechSku("");
    setTechTimeMinutes(null);
    setTechDefaultPrinterId("");
  };

  const saveTechnical = async () => {
    if (!user || !techProduct) return;
    const nowIso = new Date().toISOString();
    const updated: Product = {
      ...techProduct,
      sku: techSku.trim() || null,
      printTimeMinutes:
        techTimeMinutes != null && Number.isFinite(techTimeMinutes) && techTimeMinutes > 0
          ? techTimeMinutes
          : null,
      defaultPrinterId: techDefaultPrinterId || null,
      updatedAt: nowIso,
    };
    updateProduct(updated);
    await upsertProductsForUser(user.id, useProductsStore.getState().products);
    closeTechnical();
  };

  const addOrUpdateMaterial = async () => {
    if (!user || !bomProduct) return;
    if (!addSupplyId) return;
    if (!Number.isFinite(addQty) || addQty <= 0) return;
    // Produtos antigos podem ter IDs não-UUID (ex.: "prod_123"). Esses não são compatíveis
    // com a tabela do Supabase (UUID). Nesse caso, mostramos uma mensagem amigável
    // em vez de deixar o erro "invalid input syntax for type uuid" aparecer.
    const isUuid = /^[0-9a-fA-F-]{36}$/.test(bomProduct.id);
    if (!isUuid) {
      setBomError(
        "Este produto foi salvo em uma versão antiga da ferramenta e não tem ID compatível com o Supabase. Refaça a simulação na calculadora e salve novamente para usar Materiais (BOM).",
      );
      return;
    }

    setBomLoading(true);
    setBomError(null);
    try {
      const existing = materials.find((m) => m.supplyId === addSupplyId);
      const now = new Date().toISOString();
      const base: Omit<ProductMaterial, "userId" | "id"> & { id?: string } = existing
        ? { ...existing, qty: addQty, updatedAt: now }
        : {
            productId: bomProduct.id,
            supplyId: addSupplyId,
            qty: addQty,
            unit: null,
            createdAt: now,
            updatedAt: now,
          };

      const saved = await upsertProductMaterial(user.id, base);
      setMaterials((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setAddQty(0);
    } catch (e: any) {
      setBomError(e?.message ?? "Falha ao salvar material.");
    } finally {
      setBomLoading(false);
    }
  };

  const removeMaterial = async (id: string) => {
    if (!user) return;
    setBomLoading(true);
    setBomError(null);
    try {
      await deleteProductMaterial(user.id, id);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setBomError(e?.message ?? "Falha ao remover material.");
    } finally {
      setBomLoading(false);
    }
  };

  async function handleRemove(product: Product) {
    if (typeof window !== "undefined" && !window.confirm(`Remover "${product.name}" da lista?`)) return;

    try {
      if (user) {
        await deleteProduct(user.id, product.id);
      }
      removeProduct(product.id);
    } catch (e: any) {
      window.alert(e?.message ? `Falha ao remover: ${e.message}` : "Falha ao remover produto no Supabase.");
    }
  }
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-400">
        Nenhum produto salvo ainda. Após calcular um produto, você poderá
        salvá-lo aqui para reutilizar parâmetros, duplicar e exportar.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const unitCost = product.totalCost ?? 0;
            return (
              <div
                key={product.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 shadow-neon-cyan/30">
                      {productThumbById[product.id] ? (
                        <img
                          src={productThumbById[product.id]}
                          alt={`Imagem de ${product.name}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center">
                          <Image
                            src="/icons/model-3d.svg"
                            alt="Modelo 3D"
                            width={28}
                            height={28}
                            className="opacity-90"
                          />
                          <span className="sr-only">3D</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{product.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {product.sku ? `SKU: ${product.sku}` : "SKU: —"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-slate-800 bg-slate-900/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {product.marketplace}
                  </span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs">
                  <p className="text-slate-300">Peso: {product.weight.toLocaleString("pt-BR")} g</p>
                  <p className="text-slate-300">
                    Tempo:{" "}
                    <span className="text-slate-100">
                      {product.printTimeMinutes != null && Number.isFinite(product.printTimeMinutes)
                        ? `${product.printTimeMinutes} min`
                        : "—"}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Preço:{" "}
                    <span className="text-slate-100">
                      {product.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: product.currency,
                      })}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Custo:{" "}
                    <span className="text-slate-100">
                      {formatBRL(unitCost)}
                    </span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openProductInfo(product)}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
                    title="Abrir informações do produto"
                  >
                    Abrir
                  </button>

                  <button
                    type="button"
                    onClick={() => openTechnical(product)}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-900/60"
                    title="Editar ficha técnica (SKU, tempo, impressora padrão)"
                  >
                    Ficha técnica
                  </button>

                  <button
                    type="button"
                    onClick={() => openBom(product)}
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:bg-slate-900/60"
                    title="Materiais (BOM) do produto"
                  >
                    Materiais
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const params = new URLSearchParams();
                      params.set("create", "1");
                      params.set("productId", product.id);
                      if (product.defaultPrinterId) params.set("printerId", product.defaultPrinterId);
                      params.set("qty", "1");
                      router.push(`/ordens?${params.toString()}`);
                    }}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
                    title="Criar uma ordem de produção a partir deste produto"
                  >
                    Ordem de produção
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemove(product)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/15"
                    title="Remover item"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {bomOpen && bomProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">Materiais — {bomProduct.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Custo total de material:{" "}
                  <span className="font-semibold text-emerald-300">
                    {materialCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeBom}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            {bomError ? (
              <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                {bomError}
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Adicionar material</p>
                <div className="mt-3 grid gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Insumo</label>
                    <select
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={addSupplyId}
                      onChange={(e) => setAddSupplyId(e.target.value)}
                      disabled={bomLoading}
                    >
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.unitCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/{s.unit}
                        </option>
                      ))}
                    </select>
                    {supplies.length === 0 ? (
                      <p className="mt-1 text-[11px] text-slate-500">Cadastre insumos primeiro em /insumos.</p>
                    ) : null}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Quantidade (na unidade do insumo)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value) || 0)}
                      disabled={bomLoading}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addOrUpdateMaterial}
                    disabled={bomLoading || supplies.length === 0}
                    className="mt-1 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                  >
                    Adicionar / Atualizar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Materiais cadastrados</p>
                <div className="mt-3 max-h-[360px] overflow-y-auto">
                  {bomLoading && materials.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
                  ) : materials.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Nenhum material definido.</p>
                  ) : (
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Insumo</th>
                          <th className="px-2 py-2">Qtd</th>
                          <th className="px-2 py-2">Custo</th>
                          <th className="px-2 py-2 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {materials.map((m) => {
                          const s = supplies.find((x) => x.id === m.supplyId);
                          const cost = (m.qty ?? 0) * (s?.unitCost ?? 0);
                          return (
                            <tr key={m.id} className="hover:bg-slate-900/60">
                              <td className="px-2 py-2 text-slate-100">{s?.name ?? m.supplyId}</td>
                              <td className="px-2 py-2 text-slate-200">
                                {Number(m.qty ?? 0).toLocaleString("pt-BR")} {s?.unit ?? ""}
                              </td>
                              <td className="px-2 py-2 text-emerald-300">
                                {cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                              <td className="px-2 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeMaterial(m.id)}
                                  className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-60"
                                  disabled={bomLoading}
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {infoOpen && infoProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="flex h-[min(90dvh,860px)] w-full max-w-3xl min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/95 shadow-neon-cyan">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 px-4 py-3">
              <div className="min-w-[220px]">
                <p className="text-sm font-semibold text-slate-50">
                  Informações — {infoProduct.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  SKU: {infoProduct.sku ?? "—"} · Tempo:{" "}
                  {infoProduct.printTimeMinutes != null && Number.isFinite(infoProduct.printTimeMinutes)
                    ? `${infoProduct.printTimeMinutes} min`
                    : "—"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                {!infoEditOpen ? (
                  <button
                    type="button"
                    onClick={startEditInfo}
                    className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                    disabled={infoLoading || infoSaveBusy}
                    title="Editar dados do produto"
                  >
                    Editar
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditInfo}
                      className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                      disabled={infoSaveBusy}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={saveEditInfo}
                      className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                      disabled={infoSaveBusy}
                    >
                      {infoSaveBusy ? "Salvando..." : "Salvar"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => openTechnical(infoProduct)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                  title="Editar ficha técnica"
                >
                  Ficha técnica
                </button>
                <button
                  type="button"
                  onClick={() => openBom(infoProduct)}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                  title="Editar materiais (BOM)"
                >
                  Materiais
                </button>
                <button
                  type="button"
                  onClick={closeProductInfo}
                  className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {infoError ? (
                <div className="mb-4 rounded-xl border border-rose-600/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                  {infoError}
                </div>
              ) : null}

              {infoLoading ? (
                <p className="text-sm text-slate-400">Carregando...</p>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Preços e custo
                      </p>

                      {infoEditOpen ? (
                        <div className="mt-3 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Nome</label>
                              <input
                                value={String(infoDraft?.name ?? "")}
                                onChange={(e) => setInfoDraft((d) => ({ ...(d ?? {}), name: e.target.value }))}
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">SKU (opcional)</label>
                              <input
                                value={String(infoDraft?.sku ?? "")}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({
                                    ...(d ?? {}),
                                    sku: e.target.value ? e.target.value : null,
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1 block text-[11px] text-slate-300">Descrição (opcional)</label>
                            <textarea
                              rows={3}
                              value={String(infoDraft?.description ?? "")}
                              onChange={(e) =>
                                setInfoDraft((d) => ({
                                  ...(d ?? {}),
                                  description: e.target.value ? e.target.value : null,
                                }))
                              }
                              className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                              disabled={infoSaveBusy}
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Peso (g)</label>
                              <input
                                type="number"
                                min={0}
                                step="0.1"
                                value={Number(infoDraft?.weight ?? 0)}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({ ...(d ?? {}), weight: Number(e.target.value) }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Preço (R$)</label>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={Number(infoDraft?.price ?? 0)}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({ ...(d ?? {}), price: Number(e.target.value) }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Marketplace</label>
                              <select
                                value={String(infoDraft?.marketplace ?? infoProduct.marketplace)}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({ ...(d ?? {}), marketplace: e.target.value as any }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              >
                                {MARKETPLACES.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Moeda</label>
                              <select
                                value={String(infoDraft?.currency ?? infoProduct.currency)}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({ ...(d ?? {}), currency: e.target.value as any }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              >
                                <option value="BRL">BRL</option>
                                <option value="USD">USD</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">Tempo (min, opcional)</label>
                              <input
                                type="number"
                                min={0}
                                step="1"
                                value={
                                  infoDraft?.printTimeMinutes == null ? "" : Number(infoDraft?.printTimeMinutes)
                                }
                                onChange={(e) =>
                                  setInfoDraft((d) => ({
                                    ...(d ?? {}),
                                    printTimeMinutes: e.target.value === "" ? null : Number(e.target.value),
                                  }))
                                }
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] text-slate-300">
                                Impressora padrão (opcional)
                              </label>
                              <input
                                value={String(infoDraft?.defaultPrinterId ?? "")}
                                onChange={(e) =>
                                  setInfoDraft((d) => ({
                                    ...(d ?? {}),
                                    defaultPrinterId: e.target.value ? e.target.value : null,
                                  }))
                                }
                                placeholder="ID (ou use Ficha técnica)"
                                className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                disabled={infoSaveBusy}
                              />
                            </div>
                          </div>

                        </div>
                      ) : null}

                      {(() => {
                        const mainImage = infoAssets.find((a) => a.kind === "image");
                        const url =
                          (infoProduct?.id && productThumbById[infoProduct.id]) || mainImage?.publicUrl || null;
                        return url ? (
                          <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50">
                            <img
                              src={url}
                              alt={`Imagem de ${infoProduct.name}`}
                              className="h-44 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : null;
                      })()}
                      <div className="mt-3 space-y-2">
                        <p className="text-[11px] text-slate-300">Foto do produto</p>
                        <label className="flex min-h-[150px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-center transition hover:border-cyan-500 hover:bg-slate-900/70">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={infoUploadBusy || infoSaveBusy}
                            onChange={(e) => {
                              const f = e.target.files?.[0] ?? null;
                              e.currentTarget.value = "";
                              if (!f) return;
                              uploadMainImageForInfo(f);
                            }}
                          />
                          {(() => {
                            const mainImage = infoAssets.find((a) => a.kind === "image");
                            const url =
                              (infoProduct?.id && productThumbById[infoProduct.id]) || mainImage?.publicUrl || null;
                            if (url) {
                              return (
                                <img
                                  src={url}
                                  alt={`Imagem de ${infoProduct?.name ?? "produto"}`}
                                  className="h-[150px] w-full object-cover"
                                  loading="lazy"
                                />
                              );
                            }
                            return (
                              <div className="px-4 py-5">
                                <p className="text-sm font-semibold text-slate-200">
                                  {infoUploadBusy ? "Enviando..." : "Clique para adicionar foto"}
                                </p>
                                <p className="mt-1 text-[11px] text-slate-500">
                                  PNG/JPG/WEBP. A imagem enviada vira a principal do produto.
                                </p>
                              </div>
                            );
                          })()}
                        </label>
                      </div>
                      <div className="mt-2 space-y-1.5 text-sm">
                        <p className="text-slate-300">
                          Preço de venda:{" "}
                          <span className="text-slate-50">
                            {formatBRL(infoProduct.price)}
                          </span>
                        </p>
                        <p className="text-slate-300">
                          Preço de custo:{" "}
                          <span className="text-emerald-200">
                            {formatBRL(infoCost?.totalCost ?? infoProduct.totalCost ?? 0)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Quebra do custo (por peça)
                      </p>
                      <div className="mt-2 space-y-1.5 text-sm text-slate-300">
                        <p>
                          Materiais:{" "}
                          <span className="text-slate-50">
                            {formatBRL(infoCost?.materialCost ?? 0)}
                          </span>
                        </p>
                        <p>
                          Energia:{" "}
                          <span className="text-slate-50">
                            {formatBRL(infoCost?.energyCost ?? 0)}
                          </span>
                        </p>
                        <p>
                          Depreciação:{" "}
                          <span className="text-slate-50">
                            {formatBRL(infoCost?.depreciationCost ?? 0)}
                          </span>
                        </p>
                        <p>
                          Embalagem:{" "}
                          <span className="text-slate-50">
                            {formatBRL(infoCost?.packagingCost ?? 0)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Arquivos anexos
                    </p>
                    {infoAssets.filter((a) => a.kind === "file").length === 0 ? (
                      <p className="mt-2 text-sm text-slate-400">Nenhum arquivo anexado.</p>
                    ) : (
                      <ul className="mt-2 space-y-1 text-sm">
                        {infoAssets
                          .filter((a) => a.kind === "file")
                          .map((a) => (
                            <li key={a.id} className="flex items-center justify-between gap-2">
                              <span className="truncate text-slate-200">{a.fileName}</span>
                              {a.publicUrl ? (
                                <a
                                  href={a.publicUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-cyan-300 hover:text-cyan-200"
                                >
                                  Baixar
                                </a>
                              ) : (
                                <span className="text-xs text-slate-500">—</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Materiais necessários (BOM)
                    </p>

                    {infoMaterials.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-400">
                        Nenhum material cadastrado para este produto.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="px-2 py-2">Insumo</th>
                              <th className="px-2 py-2">Qtd</th>
                              <th className="px-2 py-2">Custo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {infoMaterials.map((m) => {
                              const s = infoSupplies.find((x) => x.id === m.supplyId);
                              const lineCost = (m.qty ?? 0) * (s?.unitCost ?? 0);
                              return (
                                <tr key={m.id} className="hover:bg-slate-900/60">
                                  <td className="px-2 py-2 text-slate-100">
                                    {s?.name ?? m.supplyId}
                                  </td>
                                  <td className="px-2 py-2 text-slate-300">
                                    {Number(m.qty ?? 0).toLocaleString("pt-BR")}
                                    {s?.unit ? ` ${s.unit}` : ""}
                                  </td>
                                  <td className="px-2 py-2 text-emerald-200">
                                    {formatBRL(lineCost)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {techOpen && techProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  Ficha técnica — {techProduct.name}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Defina SKU, tempo estimado e impressora padrão para ordens e relatórios.
                </p>
              </div>
              <button
                type="button"
                onClick={closeTechnical}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300">SKU</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={techSku}
                  onChange={(e) => setTechSku(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Tempo estimado (min)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={techTimeMinutes ?? ""}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTechTimeMinutes(Number.isFinite(v) ? v : null);
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">Impressora padrão</label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={techDefaultPrinterId}
                  onChange={(e) => setTechDefaultPrinterId(e.target.value)}
                >
                  <option value="">Selecionar (opcional)</option>
                  {techPrinters.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-slate-500">
                  Usada como sugestão em ordens de produção e relatórios futuros.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTechnical}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveTechnical}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
              >
                Salvar ficha técnica
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

