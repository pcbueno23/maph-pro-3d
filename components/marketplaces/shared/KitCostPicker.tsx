"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Save, Trash2, X } from "lucide-react";
import { useProductsStore } from "@/store/productsStore";
import { useProductKits } from "@/hooks/useProductKits";
import type { KitComponent } from "@/types";

function fmtBRL(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type Props = {
  open: boolean;
  onClose: () => void;
  /** `weight` é a soma dos pesos dos componentes (g) — útil pra pré-preencher campo de peso/frete. */
  onConfirm: (result: { cost: number; weight: number; name?: string }) => void;
};

export function KitCostPicker({ open, onClose, onConfirm }: Props) {
  const { products, hydrateFromStorage } = useProductsStore();
  const { kits, save, remove, computeKitCost, computeKitWeight } = useProductKits();

  const [search, setSearch] = useState("");
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [kitName, setKitName] = useState("");
  const [selectedKitId, setSelectedKitId] = useState<string>("");

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setSelections({});
      setKitName("");
      setSelectedKitId("");
    }
  }, [open]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 30);
    return products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const selectedIds = Object.keys(selections).filter((id) => selections[id] > 0);

  const total = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const product = products.find((p) => p.id === id);
      return sum + (product?.totalCost ?? 0) * (selections[id] ?? 0);
    }, 0);
  }, [selectedIds, selections, products]);

  const totalWeight = useMemo(() => {
    return selectedIds.reduce((sum, id) => {
      const product = products.find((p) => p.id === id);
      return sum + (product?.weight ?? 0) * (selections[id] ?? 0);
    }, 0);
  }, [selectedIds, selections, products]);

  function toggleProduct(id: string) {
    setSelections((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = 1;
      }
      return next;
    });
  }

  function setQty(id: string, qty: number) {
    setSelections((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  function loadKit(id: string) {
    setSelectedKitId(id);
    const kit = kits.find((k) => k.id === id);
    if (!kit) return;
    setKitName(kit.name);
    const next: Record<string, number> = {};
    for (const c of kit.components) next[c.productId] = c.qty;
    setSelections(next);
  }

  function handleSaveKit() {
    const name = kitName.trim();
    if (!name || selectedIds.length === 0) return;
    const components: KitComponent[] = selectedIds.map((id) => ({
      productId: id,
      qty: selections[id],
    }));
    save(name, components);
  }

  function handleConfirm() {
    onConfirm({ cost: total, weight: totalWeight, name: kitName.trim() || undefined });
    onClose();
  }

  const loadedKitMissing =
    selectedKitId &&
    (kits.find((k) => k.id === selectedKitId)?.components ?? []).some(
      (c) => !products.find((p) => p.id === c.productId),
    );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kit-picker-title"
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-300" />
            <h2 id="kit-picker-title" className="text-base font-semibold text-slate-50">
              Montar kit de produtos
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {kits.length > 0 && (
            <div className="mb-4">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Carregar kit salvo
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedKitId}
                  onChange={(e) => (e.currentTarget.value ? loadKit(e.currentTarget.value) : setSelectedKitId(""))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                >
                  <option value="">Selecionar kit salvo...</option>
                  {kits.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
                {selectedKitId ? (
                  <button
                    type="button"
                    onClick={() => {
                      remove(selectedKitId);
                      setSelectedKitId("");
                    }}
                    title="Excluir kit"
                    className="shrink-0 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-slate-400 hover:border-rose-500/30 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
              {loadedKitMissing ? (
                <p className="mt-1.5 text-[11px] text-amber-300">
                  Um ou mais componentes desse kit foram removidos da lista de produtos e não entram na soma.
                </p>
              ) : null}
            </div>
          )}

          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Produtos salvos
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            placeholder="Buscar por nome..."
            className="mb-3 w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
          />

          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-800">
            {filteredProducts.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Nenhum produto encontrado.</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {filteredProducts.map((p) => {
                  const checked = !!selections[p.id];
                  const hasCost = typeof p.totalCost === "number";
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleProduct(p.id)}
                        className="h-4 w-4 shrink-0 accent-cyan-400"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{p.name}</p>
                        <p className={`text-xs ${hasCost ? "text-slate-500" : "text-amber-300"}`}>
                          {hasCost ? `Custo: ${fmtBRL(p.totalCost!)}` : "Custo não informado"}
                        </p>
                      </div>
                      {checked ? (
                        <input
                          type="number"
                          min={0.0001}
                          step={1}
                          value={selections[p.id]}
                          onChange={(e) => setQty(p.id, parseFloat(e.currentTarget.value) || 0)}
                          className="w-16 shrink-0 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-right text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3">
            <span className="text-sm font-semibold text-cyan-100">
              Total ({selectedIds.length} {selectedIds.length === 1 ? "item" : "itens"})
            </span>
            <span className="text-lg font-bold tabular-nums text-cyan-100">{fmtBRL(total)}</span>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              value={kitName}
              onChange={(e) => setKitName(e.currentTarget.value)}
              placeholder="Nome do kit (ex.: Vaso completo)"
              className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
            />
            <button
              type="button"
              disabled={!kitName.trim() || selectedIds.length === 0}
              onClick={handleSaveKit}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-40"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar kit
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan disabled:opacity-40"
          >
            Usar esse custo
          </button>
        </div>
      </div>
    </div>
  );
}
