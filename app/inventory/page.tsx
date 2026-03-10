"use client";

import { useEffect, useState } from "react";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useInventoryStore } from "@/store/inventoryStore";

export default function InventoryPage() {
  const { supplies, hydrateFromStorage: hydrateSupplies, addSupply, updateSupply, removeSupply } =
    useSuppliesStore();
  const {
    items,
    hydrateFromStorage: hydrateInventory,
    updateItem,
    removeItem,
  } = useInventoryStore();

  const [tab, setTab] = useState<"supplies" | "stock">("supplies");

  useEffect(() => {
    hydrateSupplies();
    hydrateInventory();
  }, [hydrateSupplies, hydrateInventory]);

  const [newSupplyName, setNewSupplyName] = useState("");
  const [newSupplyKind, setNewSupplyKind] = useState<"filament" | "ink" | "other">("filament");
  const [newSupplyUnit, setNewSupplyUnit] = useState("kg");
  const [newSupplyUnitCost, setNewSupplyUnitCost] = useState<number>(0);

  const handleAddSupply = () => {
    const name = newSupplyName.trim();
    if (!name || !Number.isFinite(newSupplyUnitCost) || newSupplyUnitCost <= 0) return;
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `sup_${Date.now()}`;
    addSupply({
      id,
      name,
      kind: newSupplyKind,
      unit: newSupplyUnit,
      unitCost: newSupplyUnitCost,
      stockQty: 0,
    });
    setNewSupplyName("");
    setNewSupplyUnitCost(0);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Estoque & insumos
      </h1>

      <div className="inline-flex rounded-xl border border-slate-700 bg-slate-900/70 p-1 text-xs">
        <button
          type="button"
          onClick={() => setTab("supplies")}
          className={`rounded-lg px-3 py-1.5 ${
            tab === "supplies" ? "bg-slate-800 text-cyan-400" : "text-slate-300"
          }`}
        >
          Insumos
        </button>
        <button
          type="button"
          onClick={() => setTab("stock")}
          className={`rounded-lg px-3 py-1.5 ${
            tab === "stock" ? "bg-slate-800 text-cyan-400" : "text-slate-300"
          }`}
        >
          Peças produzidas
        </button>
      </div>

      {tab === "supplies" ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Novo insumo
            </h2>
            <div className="grid gap-2 md:grid-cols-4">
              <input
                type="text"
                placeholder="Nome (ex.: PLA Branco)"
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={newSupplyName}
                onChange={(e) => setNewSupplyName(e.target.value)}
              />
              <select
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={newSupplyKind}
                onChange={(e) => setNewSupplyKind(e.target.value as any)}
              >
                <option value="filament">Filamento</option>
                <option value="ink">Tinta</option>
                <option value="other">Outro</option>
              </select>
              <input
                type="number"
                step={0.01}
                placeholder="Custo por unidade (R$)"
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={Number.isNaN(newSupplyUnitCost) ? "" : newSupplyUnitCost}
                onChange={(e) => setNewSupplyUnitCost(Number(e.target.value) || 0)}
              />
              <select
                className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={newSupplyUnit}
                onChange={(e) => setNewSupplyUnit(e.target.value)}
              >
                <option value="kg">kg</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="un">un</option>
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddSupply}
              className="mt-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
            >
              Adicionar insumo
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
            {supplies.length === 0 ? (
              <p className="text-slate-400">
                Nenhum insumo cadastrado ainda. Eles poderão ser usados como preset na calculadora.
              </p>
            ) : (
              <>
                <table className="min-w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-2 py-2">Nome</th>
                      <th className="px-2 py-2">Tipo</th>
                      <th className="px-2 py-2">Custo / unidade</th>
                      <th className="px-2 py-2">Unidade</th>
                      <th className="px-2 py-2">Estoque</th>
                      <th className="px-2 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {supplies.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-2 text-slate-100">{s.name}</td>
                        <td className="px-2 py-2 text-slate-300">
                          {s.kind === "filament"
                            ? "Filamento"
                            : s.kind === "ink"
                            ? "Tinta"
                            : "Outro"}
                        </td>
                        <td className="px-2 py-2 text-slate-100">
                          {s.unitCost.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </td>
                        <td className="px-2 py-2 text-slate-300">{s.unit}</td>
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                            value={s.stockQty}
                            onChange={(e) =>
                              updateSupply({ ...s, stockQty: Number(e.target.value) || 0 })
                            }
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeSupply(s.id)}
                            className="text-xs text-rose-400 hover:text-rose-300"
                          >
                            Remover
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-3 border-t border-slate-800 pt-2 text-xs text-slate-300">
                  {(() => {
                    const totalValue = supplies.reduce(
                      (acc, s) => acc + s.stockQty * s.unitCost,
                      0,
                    );
                    const filament = supplies.filter((s) => s.kind === "filament");
                    const totalFilamentGrams = filament.reduce((acc, s) => {
                      if (s.unit === "kg") return acc + s.stockQty * 1000;
                      if (s.unit === "g") return acc + s.stockQty;
                      return acc;
                    }, 0);
                    const totalFilamentValue = filament.reduce(
                      (acc, s) => acc + s.stockQty * s.unitCost,
                      0,
                    );
                    return (
                      <>
                        <p>
                          Valor total em insumos:{" "}
                          <span className="font-semibold text-slate-50">
                            {totalValue.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </p>
                        <p className="mt-1">
                          Filamentos em estoque:{" "}
                          <span className="font-semibold text-slate-50">
                            {totalFilamentGrams.toLocaleString("pt-BR", {
                              maximumFractionDigits: 0,
                            })}{" "}
                            g
                          </span>{" "}
                          (
                          {totalFilamentValue.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                          )
                        </p>
                      </>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          {items.length === 0 ? (
            <p className="text-slate-400">
              Nenhuma peça produzida cadastrada ainda. Use o botão “Produzida” na aba Produtos para
              lançar estoque.
            </p>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Qtd</th>
                  <th className="px-2 py-2">Preço Shopee</th>
                  <th className="px-2 py-2">Preço ML</th>
                  <th className="px-2 py-2">Custo produção</th>
                  <th className="px-2 py-2">% Margem (pior canal)</th>
                  <th className="px-2 py-2">Canal</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {items.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-900/60">
                    <td className="px-2 py-2 text-slate-100">{i.name}</td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        className="w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        value={i.sku}
                        onChange={(e) =>
                          updateItem({
                            ...i,
                            sku: e.target.value,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                        value={i.quantity}
                        onChange={(e) =>
                          updateItem({
                            ...i,
                            quantity: Number(e.target.value) || 0,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-100">
                      {(i.suggestedPriceShopee ?? i.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-2 text-slate-100">
                      {(i.suggestedPriceML ?? i.price).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-2 text-slate-100">
                      {(i.productionCost ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={
                          i.marginPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                        }
                      >
                        {i.marginPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-2 py-2 text-slate-300">{i.marketplace}</td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(i.id)}
                        className="text-xs text-rose-400 hover:text-rose-300"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

