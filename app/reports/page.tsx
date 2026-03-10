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
    </div>
  );
}

