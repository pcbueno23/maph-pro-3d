"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import type { SupplyCategory, SupplyItem } from "@/types";
import type { InventoryItem } from "@/store/inventoryStore";
import { listSupplies } from "@/lib/supabaseProduction";
import { fetchUserInventory } from "@/lib/supabaseUserData";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { computeProductUnitCost } from "@/lib/productionCost";

const SUPPLY_CATEGORY_LABEL: Record<SupplyCategory, string> = {
  filament: "Filamento",
  resin: "Resina",
  ink: "Tinta",
  packaging: "Embalagem",
  tool: "Ferramenta",
  part: "Peça",
  other: "Outro",
};

export default function ReportsPage() {
  const user = useAuthStore((s) => s.user);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  /** Custo unitário atual por productId (BOM + energia/dep quando houver ficha técnica). */
  const [productUnitCosts, setProductUnitCosts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setSupplies([]);
      setItems([]);
      setProductUnitCosts({});
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      listSupplies(user.id),
      fetchUserInventory(user.id),
      fetchUserProducts(user.id),
    ])
      .then(async ([suppliesData, inventoryData, productsData]) => {
        if (cancelled) return;
        setSupplies(suppliesData ?? []);
        const inv = inventoryData ?? [];
        setItems(inv);
        const products = productsData ?? [];
        const pmap = new Map(products.map((p) => [p.id, p] as const));
        const pids = [...new Set(inv.map((i) => i.productId))];
        const costs: Record<string, number> = {};
        await Promise.all(
          pids.map(async (pid) => {
            const p = pmap.get(pid);
            if (!p) return;
            try {
              const u = await computeProductUnitCost(user.id, p);
              costs[pid] = u.totalCost;
            } catch {
              costs[pid] = p.totalCost ?? inv.find((x) => x.productId === pid)?.productionCost ?? 0;
            }
          }),
        );
        if (!cancelled) setProductUnitCosts(costs);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Erro ao carregar dados");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filamentSupplies = supplies.filter((s) => s.category === "filament");
  const totalFilamentGrams = filamentSupplies.reduce((acc, s) => {
    if (s.unit === "kg") return acc + s.stockQty * 1000;
    if (s.unit === "g") return acc + s.stockQty;
    return acc;
  }, 0);
  const totalFilamentValue = filamentSupplies.reduce(
    (acc, s) => acc + s.stockQty * s.unitCost,
    0,
  );

  const totalSuppliesByKind = supplies.reduce(
    (acc, s) => {
      const value = s.stockQty * s.unitCost;
      if (s.category === "filament") acc.filament += value;
      else if (s.category === "ink") acc.ink += value;
      else acc.other += value;
      return acc;
    },
    { filament: 0, ink: 0, other: 0 },
  );

  const totalPiecesCost = useMemo(
    () =>
      items.reduce(
        (acc, i) =>
          acc + (productUnitCosts[i.productId] ?? i.productionCost ?? 0) * i.quantity,
        0,
      ),
    [items, productUnitCosts],
  );
  const totalPiecesValueShopee = items.reduce(
    (acc, i) => acc + (i.suggestedPriceShopee ?? i.price) * i.quantity,
    0,
  );
  const totalPiecesValueML = items.reduce(
    (acc, i) => acc + (i.suggestedPriceML ?? i.price) * i.quantity,
    0,
  );

  const totalSuppliesValue =
    totalSuppliesByKind.filament + totalSuppliesByKind.ink + totalSuppliesByKind.other;
  const totalInvested = totalSuppliesValue + totalPiecesCost;

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const piecesRows = useMemo(() => {
    return items.map((i) => {
      const priceShopee = i.suggestedPriceShopee ?? i.price;
      const priceML = i.suggestedPriceML ?? i.price;
      const worstPerUnit = Math.min(priceShopee, priceML);
      const unitCost = productUnitCosts[i.productId] ?? i.productionCost ?? 0;
      const marginPercent =
        worstPerUnit > 0
          ? ((worstPerUnit - unitCost) / worstPerUnit) * 100
          : (i.marginPercent ?? 0);
      return {
        ...i,
        resolvedUnitCost: unitCost,
        priceShopee,
        priceML,
        worstPerUnit,
        worstTotal: worstPerUnit * i.quantity,
        displayMarginPercent: marginPercent,
      };
    });
  }, [items, productUnitCosts]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Relatórios
      </h1>
      <p className="text-xs text-slate-500">
        Custo das peças em estoque usa a ficha técnica atual (materiais/BOM + impressora e tempo, quando
        cadastrados), não só o valor gravado no lançamento.
      </p>
      {error && (
        <div className="rounded-xl border border-rose-800 bg-rose-950/60 px-4 py-2 text-sm text-rose-200">
          {error}
        </div>
      )}
      {loading && (
        <p className="text-sm text-slate-400">Carregando insumos e peças produzidas...</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Insumos — valor em estoque
          </p>
          <ul className="space-y-1 text-slate-200">
            <li className="flex justify-between">
              <span>Filamentos</span>
              <span>
                {totalSuppliesByKind.filament.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Tintas</span>
              <span>
                {totalSuppliesByKind.ink.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Outros</span>
              <span>
                {totalSuppliesByKind.other.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="mt-2 flex justify-between border-t border-slate-800 pt-2 font-semibold">
              <span>Total insumos</span>
              <span>
                {(totalSuppliesByKind.filament +
                  totalSuppliesByKind.ink +
                  totalSuppliesByKind.other
                ).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
          </ul>

          <div className="mt-4 rounded-xl bg-slate-900/70 p-3 text-xs text-slate-200">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Filamentos — saldo em gramas
            </p>
            <p>
              Total em filamentos:{" "}
              <span className="font-semibold text-slate-50">
                {totalFilamentGrams.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}{" "}
                g
              </span>
            </p>
            <p>
              Valor equivalente:{" "}
              <span className="font-semibold text-slate-50">
                {totalFilamentValue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Peças produzidas — valor em estoque
          </p>
          <ul className="space-y-1 text-slate-200">
            <li className="flex justify-between">
              <span>Custo de produção em estoque</span>
              <span>
                {totalPiecesCost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Valor potencial (Shopee)</span>
              <span>
                {totalPiecesValueShopee.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="flex justify-between">
              <span>Valor potencial (ML)</span>
              <span>
                {totalPiecesValueML.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
            <li className="mt-2 flex justify-between border-t border-slate-800 pt-2 font-semibold">
              <span>Lucro bruto potencial (pior canal)</span>
              <span>
                {(Math.min(totalPiecesValueShopee, totalPiecesValueML) -
                  totalPiecesCost
                ).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Capital empregado no negócio
        </p>
        <div className="mt-2 grid gap-2 text-slate-200 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Insumos (matéria-prima)</p>
            <p className="text-base font-semibold text-slate-50">
              {totalSuppliesValue.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Custo de produção em peças prontas</p>
            <p className="text-base font-semibold text-slate-50">
              {totalPiecesCost.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Total empregado (insumos + produção)</p>
            <p className="text-base font-semibold text-emerald-400">
              {totalInvested.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lista de insumos (tudo que você tem)
          </p>
          {supplies.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhum insumo cadastrado.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Insumo</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Unidade</th>
                    <th className="px-2 py-2">Custo/un</th>
                    <th className="px-2 py-2">Estoque</th>
                    <th className="px-2 py-2">Mínimo</th>
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {supplies.map((s) => {
                    const stockQty = Number(s.stockQty ?? 0);
                    const minQty = s.minStockQty ?? 0;
                    const stockIsEmpty = stockQty <= 0;
                    const lowStock = minQty > 0 && stockQty <= minQty;
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-2 text-slate-100">{s.name}</td>
                        <td className="px-2 py-2 text-slate-300">{SUPPLY_CATEGORY_LABEL[s.category]}</td>
                        <td className="px-2 py-2 text-slate-300">{s.unit}</td>
                        <td className="px-2 py-2 text-slate-200">{formatBRL(s.unitCost)}</td>
                        <td className={`px-2 py-2 ${lowStock || stockIsEmpty ? "text-amber-300" : "text-slate-200"}`}>
                          {stockQty.toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-slate-300">
                          {Number(minQty).toLocaleString("pt-BR")}
                        </td>
                        <td className="px-2 py-2 text-slate-200">
                          {formatBRL(stockQty * (s.unitCost ?? 0))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Lista de peças produzidas (tudo que você tem)
          </p>
          {items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              Nenhuma peça produzida cadastrada. Use a aba Produtos para lançar estoque.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Peça</th>
                    <th className="px-2 py-2">SKU</th>
                    <th className="px-2 py-2">Qtd</th>
                    <th className="px-2 py-2">Preço Shopee</th>
                    <th className="px-2 py-2">Preço ML</th>
                    <th className="px-2 py-2">Custo</th>
                    <th className="px-2 py-2">% Margem</th>
                    <th className="px-2 py-2">Valor (pior canal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {piecesRows.map((i) => (
                    <tr key={i.id} className="hover:bg-slate-900/60">
                      <td className="px-2 py-2 text-slate-100">{i.name}</td>
                      <td className="px-2 py-2 text-slate-300">{i.sku || "-"}</td>
                      <td className="px-2 py-2 text-slate-200">{i.quantity}</td>
                      <td className="px-2 py-2 text-slate-200">{formatBRL(i.priceShopee)}</td>
                      <td className="px-2 py-2 text-slate-200">{formatBRL(i.priceML)}</td>
                      <td className="px-2 py-2 text-slate-200">
                        {formatBRL(i.resolvedUnitCost)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={
                            i.displayMarginPercent >= 0 ? "text-emerald-400" : "text-rose-400"
                          }
                        >
                          {i.displayMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-200">
                        {formatBRL(i.worstTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

