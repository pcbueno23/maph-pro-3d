"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import type { StockMovementKind, SupplyCategory, SupplyItem, SupplyMovement } from "@/types";
import {
  createSupplyMovement,
  deleteSupply,
  listSupplies,
  listSupplyMovements,
  upsertSupply,
} from "@/lib/supabaseProduction";

type DraftSupply = {
  id?: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  unitCost: number | "";
  stockQty: number | "";
  minStockQty: number | "";
  color?: string;
  purchaseLink?: string;
  // Campos auxiliares para filamento (entrada em kg e preço do rolo)
  rollKg: number | "";
  rollPrice: number | "";
};

function newId(prefix: string) {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}`;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDraft(s?: SupplyItem | null): DraftSupply {
  if (!s) {
    return {
      name: "",
      category: "filament",
      unit: "g",
      unitCost: "",
      stockQty: "",
      minStockQty: "",
      color: "",
      purchaseLink: "",
      rollKg: "",
      rollPrice: "",
    };
  }

  // Para filamento em gramas, tenta reconstruir peso do rolo e preço total
  let rollKg: number | "" = "";
  let rollPrice: number | "" = "";
  if (s.category === "filament" && s.unit === "g" && s.stockQty && s.stockQty > 0 && s.unitCost && s.unitCost > 0) {
    rollKg = (s.stockQty ?? 0) / 1000;
    rollPrice = (s.stockQty ?? 0) * (s.unitCost ?? 0);
  }

  return {
    id: s.id,
    name: s.name,
    category: s.category,
    unit: s.unit,
    unitCost: s.unitCost ?? "",
    stockQty: s.stockQty ?? "",
    minStockQty: s.minStockQty ?? "",
    color: s.color ?? "",
    purchaseLink: s.purchaseLink ?? "",
    rollKg,
    rollPrice,
  };
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function InsumosPage() {
  const user = useAuthStore((s) => s.user);
  const canUseSupabase = Boolean(user);

  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // modal CRUD
  const [openSupplyModal, setOpenSupplyModal] = useState(false);
  const [draft, setDraft] = useState<DraftSupply>(() => toDraft(null));
  const supplyModalBodyRef = useRef<HTMLDivElement | null>(null);

  // modal movimentações
  const [openMoveModal, setOpenMoveModal] = useState(false);
  const [moveSupply, setMoveSupply] = useState<SupplyItem | null>(null);
  const [moveKind, setMoveKind] = useState<StockMovementKind>("in");
  const [moveQty, setMoveQty] = useState<number | "">("");
  const [moveNote, setMoveNote] = useState<string>("");
  const [movements, setMovements] = useState<SupplyMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);
  const moveModalBodyRef = useRef<HTMLDivElement | null>(null);

  const categoryLabel: Record<SupplyCategory, string> = useMemo(
    () => ({
      filament: "Filamento",
      resin: "Resina",
      ink: "Tinta",
      packaging: "Embalagem",
      tool: "Ferramenta",
      part: "Peça",
      other: "Outro",
    }),
    [],
  );

  const loadSupplies = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const items = await listSupplies(user.id);
      setSupplies(items);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar insumos.");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (supplyId: string) => {
    if (!user) return;
    setMovementsLoading(true);
    try {
      const items = await listSupplyMovements(user.id, supplyId);
      setMovements(items);
    } catch {
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  };

  useEffect(() => {
    void loadSupplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (openSupplyModal) {
      // garante que o usuário veja o campo "Nome" no topo
      supplyModalBodyRef.current?.scrollTo({ top: 0 });
    }
  }, [openSupplyModal]);

  useEffect(() => {
    if (openMoveModal) {
      moveModalBodyRef.current?.scrollTo({ top: 0 });
    }
  }, [openMoveModal]);

  const openCreate = () => {
    setDraft(toDraft(null));
    setOpenSupplyModal(true);
  };

  const openEdit = (s: SupplyItem) => {
    setDraft(toDraft(s));
    setOpenSupplyModal(true);
  };

  const closeSupplyModal = () => {
    setOpenSupplyModal(false);
    setDraft(toDraft(null));
  };

  const saveSupply = async () => {
    if (!user) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Informe o nome do insumo.");
      return;
    }
    if (!Number.isFinite(draft.stockQty) || draft.stockQty < 0) {
      setError("Informe um estoque válido.");
      return;
    }

    const nowIso = new Date().toISOString();

    let unit = (draft.unit || "unit").trim();
    let unitCost = Math.max(0, normalizeNumber(draft.unitCost, 0));
    let stockQty = Math.max(0, normalizeNumber(draft.stockQty, 0));

    // Regra especial para filamento: entrada em kg + preço do rolo, estoque em gramas
    if (draft.category === "filament") {
      const rollKg = normalizeNumber(draft.rollKg, 1);
      const rollPrice = normalizeNumber(draft.rollPrice, 0);
      const totalGrams = Math.max(0, rollKg * 1000);

      unit = "g";
      // se o usuário não informar estoque manualmente, assume rolo cheio
      if (!draft.stockQty || draft.stockQty <= 0) {
        stockQty = totalGrams;
      }
      if (totalGrams > 0 && rollPrice > 0) {
        unitCost = rollPrice / totalGrams;
      }
    }

    const payload: Omit<SupplyItem, "userId"> = {
      id: draft.id ?? newId("supply"),
      name,
      category: draft.category,
      unit,
      unitCost,
      stockQty,
      minStockQty: Math.max(0, normalizeNumber(draft.minStockQty, 0)),
      color: (draft.color ?? "").trim() || null,
      purchaseLink: (draft.purchaseLink ?? "").trim() || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    setLoading(true);
    setError(null);
    try {
      const saved = await upsertSupply(user.id, payload);
      setSupplies((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      closeSupplyModal();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar insumo.");
    } finally {
      setLoading(false);
    }
  };

  const removeSupply = async (s: SupplyItem) => {
    if (!user) return;
    const ok =
      typeof window !== "undefined"
        ? window.confirm(
            `Remover "${s.name}"?\n\nO insumo será retirado da ficha técnica (BOM) de todos os produtos que o utilizam. O histórico de movimentações deste item também será apagado.`,
          )
        : false;
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deleteSupply(user.id, s.id);
      setSupplies((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao remover insumo.");
    } finally {
      setLoading(false);
    }
  };

  const openMovements = async (s: SupplyItem) => {
    setMoveSupply(s);
    setMoveKind("in");
    setMoveQty("");
    setMoveNote("");
    setOpenMoveModal(true);
    await loadMovements(s.id);
  };

  const closeMovements = () => {
    setOpenMoveModal(false);
    setMoveSupply(null);
    setMovements([]);
    setMoveQty("");
    setMoveNote("");
    setMoveKind("in");
  };

  const applyMovementToStock = (current: number, kind: StockMovementKind, qty: number) => {
    const q = normalizeNumber(qty, 0);
    if (kind === "in") return current + Math.max(0, q);
    if (kind === "out") return Math.max(0, current - Math.max(0, q));
    // adjust: delta (+/-)
    return Math.max(0, current + q);
  };

  const submitMovement = async () => {
    if (!user || !moveSupply) return;
    if (!Number.isFinite(moveQty) || moveQty === 0) {
      setError("Informe uma quantidade (diferente de 0).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await createSupplyMovement(user.id, {
        supplyId: moveSupply.id,
        kind: moveKind,
        qty: moveQty,
        note: moveNote.trim() || null,
      });

      // Atualiza o estoque no registro do insumo (MVP: atualização sequencial)
      const nextStock = applyMovementToStock(moveSupply.stockQty ?? 0, moveKind, moveQty);
      const nowIso = new Date().toISOString();
      const updated = await upsertSupply(user.id, {
        id: moveSupply.id,
        name: moveSupply.name,
        category: moveSupply.category,
        unit: moveSupply.unit,
        unitCost: moveSupply.unitCost,
        stockQty: nextStock,
        minStockQty: moveSupply.minStockQty ?? null,
        color: moveSupply.color ?? null,
        purchaseLink: moveSupply.purchaseLink ?? null,
        createdAt: moveSupply.createdAt,
        updatedAt: nowIso,
      });

      setSupplies((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setMoveSupply(updated);
      setMoveQty("");
      setMoveNote("");
      await loadMovements(updated.id);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao lançar movimentação.");
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const totalValue = supplies.reduce((acc, s) => acc + (s.stockQty ?? 0) * (s.unitCost ?? 0), 0);
    const lowStock = supplies.filter(
      (s) => (s.minStockQty ?? 0) > 0 && (s.stockQty ?? 0) <= (s.minStockQty ?? 0),
    ).length;
    return { totalValue, lowStock };
  }, [supplies]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Insumos</h1>
          <p className="mt-1 text-sm text-slate-400">
            Controle estoque, custos e movimentações (entrada/saída/ajuste).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
          disabled={!canUseSupabase}
          title={!canUseSupabase ? "Faça login para gerenciar insumos." : undefined}
        >
          Novo insumo
        </button>
      </div>

      {!canUseSupabase ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          Você precisa estar logado para cadastrar insumos.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Valor em estoque</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{formatBRL(totals.totalValue)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Alertas de baixo estoque</p>
          <p className="mt-2 text-lg font-semibold text-amber-300">{totals.lowStock}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Itens cadastrados</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{supplies.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
        {loading && supplies.length === 0 ? (
          <p className="text-slate-400">Carregando...</p>
        ) : supplies.length === 0 ? (
          <p className="text-slate-400">Nenhum insumo cadastrado ainda.</p>
        ) : (
          <>
            <div className="md:hidden space-y-3 px-1">
              {supplies.map((s) => {
                const low =
                  (s.minStockQty ?? 0) > 0 && (s.stockQty ?? 0) <= (s.minStockQty ?? 0);
                return (
                  <div
                    key={s.id}
                    className={`rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs ${
                      low ? "border-amber-500/30" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-100">{s.name}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {categoryLabel[s.category]} • {s.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[11px] font-semibold ${low ? "text-amber-300" : "text-slate-200"}`}>
                          Estoque: {Number(s.stockQty ?? 0).toLocaleString("pt-BR")}
                        </p>
                        {low ? (
                          <p className="mt-0.5 text-[10px] text-amber-200">Abaixo do mínimo</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1 text-[11px] text-slate-300">
                      <div className="flex items-center justify-between gap-2">
                        <span>Custo/un</span>
                        <span className="text-slate-100">{formatBRL(Number(s.unitCost ?? 0))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Mínimo</span>
                        <span className="text-slate-100">{Number(s.minStockQty ?? 0).toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span>Compra</span>
                        <span className="text-right">
                          {s.purchaseLink ? (
                            <a
                              href={s.purchaseLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              Link
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openMovements(s)}
                        className="rounded-lg bg-slate-900/60 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-900 disabled:opacity-60"
                        disabled={loading}
                      >
                        Movimentar
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(s)}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px] text-cyan-300 hover:bg-slate-900 disabled:opacity-60"
                        disabled={loading}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSupply(s)}
                        className="rounded-lg border border-slate-800 bg-slate-900/60 px-2 py-1 text-[11px] text-rose-300 hover:bg-slate-900 disabled:opacity-60"
                        disabled={loading}
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block w-full min-w-0 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                  <tr>
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Unidade</th>
                    <th className="px-2 py-2">Custo/un</th>
                    <th className="px-2 py-2">Estoque</th>
                    <th className="px-2 py-2">Mínimo</th>
                    <th className="px-2 py-2">Compra</th>
                    <th className="px-2 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {supplies.map((s) => {
                    const low =
                      (s.minStockQty ?? 0) > 0 && (s.stockQty ?? 0) <= (s.minStockQty ?? 0);
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-slate-700"
                              style={{ backgroundColor: s.color ?? "transparent" }}
                              title={s.color ?? ""}
                            />
                            <span className="text-slate-100">{s.name}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-slate-300">{categoryLabel[s.category]}</td>
                        <td className="px-2 py-2 text-slate-300">{s.unit}</td>
                        <td className="px-2 py-2 text-slate-100">{formatBRL(Number(s.unitCost ?? 0))}</td>
                        <td
                          className={`px-2 py-2 ${low ? "text-amber-300" : "text-slate-100"}`}
                        >
                          {Number(s.stockQty ?? 0).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-slate-300">
                          {Number(s.minStockQty ?? 0).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2">
                          {s.purchaseLink ? (
                            <a
                              href={s.purchaseLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 hover:text-cyan-300"
                            >
                              Link
                            </a>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => openMovements(s)}
                            className="mr-3 text-xs text-slate-200 hover:text-slate-50"
                            disabled={loading}
                          >
                            Movimentar
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="mr-3 text-xs text-cyan-400 hover:text-cyan-300"
                            disabled={loading}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeSupply(s)}
                            className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-60"
                            disabled={loading}
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
          </>
        )}
      </div>

      {openSupplyModal ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-neon-cyan">
            <div ref={supplyModalBodyRef} className="max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">{draft.id ? "Editar insumo" : "Novo insumo"}</p>
                <p className="mt-0.5 text-xs text-slate-400">Defina custo, estoque e alerta mínimo.</p>
              </div>
              <button
                type="button"
                onClick={closeSupplyModal}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">Nome</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Categoria</label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.category}
                  onChange={(e) => {
                    const nextCategory = e.target.value as SupplyCategory;
                    setDraft((d) => ({
                      ...d,
                      category: nextCategory,
                      unit: nextCategory === "filament" && (!d.unit || d.unit === "unit") ? "g" : d.unit,
                      rollKg: nextCategory === "filament" ? d.rollKg ?? 1 : d.rollKg,
                      rollPrice: nextCategory === "filament" ? d.rollPrice ?? 0 : d.rollPrice,
                    }));
                  }}
                >
                  <option value="filament">Filamento</option>
                  <option value="resin">Resina</option>
                  <option value="ink">Tinta</option>
                  <option value="packaging">Embalagem</option>
                  <option value="tool">Ferramenta</option>
                  <option value="part">Peça</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Unidade</label>
                <input
                  type="text"
                  placeholder="ex.: g, kg, ml, un"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.unit}
                  onChange={(e) => setDraft((d) => ({ ...d, unit: e.target.value }))}
                  disabled={draft.category === "filament"}
                />
                {draft.category === "filament" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Para filamento consideramos o estoque em gramas (g) automaticamente.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Custo por unidade (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.unitCost}
                  onChange={(e) => setDraft((d) => ({ ...d, unitCost: e.target.value === "" ? "" : Number(e.target.value) }))}
                  disabled={draft.category === "filament"}
                />
                {draft.category === "filament" ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Calculado automaticamente a partir do peso do rolo (kg) e do preço do rolo.
                  </p>
                ) : null}
              </div>

              {draft.category === "filament" ? (
                <div className="md:col-span-2 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Peso do rolo (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={draft.rollKg ?? 1}
                      onChange={(e) => setDraft((d) => ({ ...d, rollKg: e.target.value === "" ? "" : Number(e.target.value) }))}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">Ex.: rolo padrão de 1 kg.</p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Preço do rolo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={draft.rollPrice ?? 0}
                      onChange={(e) => setDraft((d) => ({ ...d, rollPrice: e.target.value === "" ? "" : Number(e.target.value) }))}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Usamos esse valor dividido pelos gramas para calcular o custo por unidade.
                    </p>
                  </div>
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-xs text-slate-300">Estoque atual</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.stockQty}
                  onChange={(e) => setDraft((d) => ({ ...d, stockQty: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Estoque mínimo (alerta)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.minStockQty}
                  onChange={(e) => setDraft((d) => ({ ...d, minStockQty: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Cor (opcional)</label>
                <input
                  type="color"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1"
                  value={draft.color || "#000000"}
                  onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Link de compra (opcional)</label>
                <input
                  type="url"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.purchaseLink ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, purchaseLink: e.target.value }))}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSupplyModal}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveSupply}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      {openMoveModal && moveSupply ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950/95 shadow-neon-cyan">
            <div ref={moveModalBodyRef} className="max-h-[85vh] overflow-y-auto p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">Movimentações — {moveSupply.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Estoque atual:{" "}
                  <span className="font-semibold text-slate-50">
                    {Number(moveSupply.stockQty ?? 0).toLocaleString("pt-BR")} {moveSupply.unit}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeMovements}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Novo lançamento</p>
                <div className="mt-3 grid gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Tipo</label>
                    <select
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={moveKind}
                      onChange={(e) => setMoveKind(e.target.value as StockMovementKind)}
                    >
                      <option value="in">Entrada (+)</option>
                      <option value="out">Saída (-)</option>
                      <option value="adjust">Ajuste (+/-)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">
                      Quantidade ({moveSupply.unit})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={moveQty}
                      onChange={(e) => setMoveQty(e.target.value === "" ? "" : Number(e.target.value))}
                    />
                    <p className="mt-1 text-[11px] text-slate-500">
                      Em “Ajuste”, use valor negativo para reduzir (ex.: -50).
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-300">Observação (opcional)</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={moveNote}
                      onChange={(e) => setMoveNote(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={submitMovement}
                    disabled={loading}
                    className="mt-1 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                  >
                    Lançar
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Histórico</p>
                <div className="mt-3 max-h-[360px] overflow-y-auto">
                  {movementsLoading ? (
                    <p className="py-6 text-center text-xs text-slate-400">Carregando...</p>
                  ) : movements.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">Nenhuma movimentação ainda.</p>
                  ) : (
                    <>
                      <div className="hidden md:block w-full min-w-0 overflow-x-auto">
                        <table className="min-w-full text-left text-xs">
                          <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                            <tr>
                              <th className="px-2 py-2">Data</th>
                              <th className="px-2 py-2">Tipo</th>
                              <th className="px-2 py-2">Qtd</th>
                              <th className="px-2 py-2">Obs.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {movements.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-900/60">
                                <td className="px-2 py-2 text-slate-400">
                                  {new Date(m.createdAt).toLocaleString("pt-BR")}
                                </td>
                                <td className="px-2 py-2 text-slate-300">
                                  {m.kind === "in" ? "Entrada" : m.kind === "out" ? "Saída" : "Ajuste"}
                                </td>
                                <td className="px-2 py-2 text-slate-100">
                                  {Number(m.qty ?? 0).toLocaleString("pt-BR")}
                                </td>
                                <td className="px-2 py-2 text-slate-300">{m.note ?? "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden space-y-2 px-1">
                        {movements.map((m) => {
                          const kindLabel =
                            m.kind === "in" ? "Entrada" : m.kind === "out" ? "Saída" : "Ajuste";
                          return (
                            <div
                              key={m.id}
                              className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                                {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                              </p>
                              <p className="mt-1 font-medium text-slate-100">{kindLabel}</p>
                              <p className="mt-0.5 text-slate-300">
                                Qtd:{" "}
                                <span className="font-semibold text-slate-100">
                                  {Number(m.qty ?? 0).toLocaleString("pt-BR")}
                                </span>
                              </p>
                              <p className="mt-0.5 text-slate-500">Obs: {m.note ?? "-"}</p>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

