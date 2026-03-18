"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Printer, Product } from "@/types";
import { useProductsStore } from "@/store/productsStore";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useAuthStore } from "@/store/authStore";
import { deleteProduct, upsertProductsForUser } from "@/lib/supabaseProducts";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import type { ProductMaterial, SupplyItem } from "@/types";
import {
  deleteProductMaterial,
  listProductMaterials,
  listSupplies,
  upsertProductMaterial,
} from "@/lib/supabaseProduction";

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
  const setProductToLoad = useCalculatorStore((s) => s.setProductToLoad);
  const { user } = useAuthStore();
  const { upsertFromProduct } = useInventoryStore();
  const { consumeFilamentGrams } = useSuppliesStore();

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

  function handleLoadInCalculator(product: Product) {
    setProductToLoad(product);
    router.push("/calculator");
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

  function handleRemove(product: Product) {
    if (typeof window !== "undefined" && !window.confirm(`Remover "${product.name}" da lista?`)) return;
    removeProduct(product.id);
    if (user) {
      deleteProduct(user.id, product.id).catch(() => {});
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
            const marginClass = (product.margin ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400";
            return (
              <div
                key={product.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 shadow-neon-cyan/30">
                      <div className="absolute inset-0 grid place-items-center">
                        <span className="text-xs font-bold text-slate-100">3D</span>
                      </div>
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
                  <p className={marginClass}>
                    Margem:{" "}
                    <span className="text-slate-100">{(product.margin ?? 0).toFixed(1)}%</span>
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleLoadInCalculator(product)}
                    className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2 text-[11px] font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
                    title="Abrir na calculadora para editar"
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
                      const qtyStr =
                        typeof window !== "undefined"
                          ? window.prompt("Quantidade produzida para estoque:", "1")
                          : null;
                      if (!qtyStr) return;
                      const qty = Number(qtyStr);
                      if (!Number.isFinite(qty) || qty <= 0) return;
                      const sku =
                        typeof window !== "undefined"
                          ? window.prompt("SKU da peça (opcional):", "")
                          : "";
                      upsertFromProduct(product, qty, sku ?? undefined);
                      // baixa filamento do estoque (aproxima usando o peso do produto)
                      if (product.weight > 0) {
                        const grams = product.weight * qty;
                        consumeFilamentGrams(grams);
                      }
                    }}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/15"
                    title="Adicionar no estoque e reduzir insumos"
                  >
                    Produzida
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

