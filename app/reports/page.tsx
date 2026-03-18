"use client";

import { useEffect } from "react";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useInventoryStore } from "@/store/inventoryStore";

export default function ReportsPage() {
  const { supplies, hydrateFromStorage: hydrateSupplies } = useSuppliesStore();
  const { items, hydrateFromStorage: hydrateInventory } = useInventoryStore();

  useEffect(() => {
    hydrateSupplies();
    hydrateInventory();
  }, [hydrateSupplies, hydrateInventory]);

  const filamentSupplies = supplies.filter((s) => s.kind === "filament");

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
      if (s.kind === "filament") acc.filament += value;
      else if (s.kind === "ink") acc.ink += value;
      else acc.other += value;
      return acc;
    },
    { filament: 0, ink: 0, other: 0 },
  );

  const totalPiecesCost = items.reduce(
    (acc, i) => acc + (i.productionCost ?? 0) * i.quantity,
    0,
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
    totalSuppliesByKind.filament +
    totalSuppliesByKind.ink +
    totalSuppliesByKind.other;

  const totalInvested = totalSuppliesValue + totalPiecesCost;

  const formatBRL = (value: number) =>
    value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filamentLabel =
    (s: { kind: string }) =>
      s.kind === "filament" ? "Filamentos" : s.kind === "ink" ? "Tintas" : "Outros";

  const piecesRows = items.map((i) => {
    const priceShopee = i.suggestedPriceShopee ?? i.price;
    const priceML = i.suggestedPriceML ?? i.price;
    const worstPerUnit = Math.min(priceShopee, priceML);
    return {
      ...i,
      priceShopee,
      priceML,
      worstPerUnit,
      worstTotal: worstPerUnit * i.quantity,
    };
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
        Relatórios
      </h1>

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
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {supplies.map((s) => {
                    const stockQty = Number(s.stockQty ?? 0);
                    const stockIsEmpty = stockQty <= 0;
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/60">
                        <td className="px-2 py-2 text-slate-100">{s.name}</td>
                        <td className="px-2 py-2 text-slate-300">{filamentLabel(s)}</td>
                        <td className="px-2 py-2 text-slate-300">{s.unit}</td>
                        <td className="px-2 py-2 text-slate-200">{formatBRL(s.unitCost)}</td>
                        <td className={`px-2 py-2 ${stockIsEmpty ? "text-amber-300" : "text-slate-200"}`}>
                          {stockQty.toLocaleString("pt-BR")}
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
                        {formatBRL(i.productionCost ?? 0)}
                      </td>
                      <td className="px-2 py-2">
                        <span className={i.marginPercent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                          {i.marginPercent.toFixed(1)}%
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

