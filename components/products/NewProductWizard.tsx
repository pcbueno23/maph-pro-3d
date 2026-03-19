"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useProductsStore } from "@/store/productsStore";
import type { Printer, Product, SupplyItem } from "@/types";
import type { Marketplace } from "@/types";
import { listPrinters, listSupplies, upsertProductMaterial } from "@/lib/supabaseProduction";
import { upsertProductsForUser } from "@/lib/supabaseProducts";
import {
  calcEnergyCostFromPrinter,
  calcDepreciationFromPrinter,
  calcSuggestedPrice,
  calcMarginPercentage,
} from "@/lib/calculations";
import { MARKETPLACES } from "@/lib/constants";

const STEPS = [
  { id: 1, label: "Informações" },
  { id: 2, label: "Uploads" },
  { id: 3, label: "Materiais" },
  { id: 4, label: "Preço" },
] as const;

type BomLine = {
  supplyId: string;
  name: string;
  unit: string;
  unitCost: number;
  qty: number;
};

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface NewProductWizardProps {
  open: boolean;
  onClose: () => void;
}

export function NewProductWizard({ open, onClose }: NewProductWizardProps) {
  const user = useAuthStore((s) => s.user);
  const { settings } = useSettingsStore();
  const { addProduct } = useProductsStore();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [printHours, setPrintHours] = useState<number | "">(0);
  const [printMinutes, setPrintMinutes] = useState<number | "">(0);
  const [defaultPrinterId, setDefaultPrinterId] = useState<string | null>(null);
  const [materials, setMaterials] = useState<BomLine[]>([]);
  const [addSupplyId, setAddSupplyId] = useState("");
  const [addQty, setAddQty] = useState<number | "">("");
  const [otherCosts, setOtherCosts] = useState<number | "">(0);
  const defaultMargin = Number(settings?.defaults?.desiredMargin ?? 45);
  const [marginPercent, setMarginPercent] = useState<number | "">(defaultMargin);
  const [price, setPrice] = useState<number>(0);
  const [marketplace, setMarketplace] = useState<Marketplace>("Shopee");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [printers, setPrinters] = useState<Printer[]>([]);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);

  useEffect(() => {
    if (!user || !open) return;
    let alive = true;
    Promise.all([listPrinters(user.id), listSupplies(user.id)])
      .then(([p, s]) => {
        if (!alive) return;
        setPrinters(p);
        setSupplies(s);
      })
      .catch(() => {
        if (!alive) return;
        setPrinters([]);
        setSupplies([]);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, open]);

  const selectedPrinter = useMemo(
    () => (defaultPrinterId ? printers.find((p) => p.id === defaultPrinterId) ?? null : null),
    [printers, defaultPrinterId],
  );

  const printTimeHours = useMemo(() => {
    const h = typeof printHours === "number" && Number.isFinite(printHours) ? printHours : 0;
    const m = typeof printMinutes === "number" && Number.isFinite(printMinutes) ? printMinutes : 0;
    return h + m / 60;
  }, [printHours, printMinutes]);

  const materialCost = useMemo(
    () => materials.reduce((acc, m) => acc + m.qty * m.unitCost, 0),
    [materials],
  );

  const { energyCost, depreciationCost, packagingCost, totalCost } = useMemo(() => {
    const def = settings?.defaults;
    const packaging = Number(def?.packaging ?? 3);
    const other = typeof otherCosts === "number" && Number.isFinite(otherCosts) ? otherCosts : 0;

    if (!selectedPrinter || printTimeHours <= 0) {
      const total = materialCost + packaging + other;
      return { energyCost: 0, depreciationCost: 0, packagingCost: packaging, totalCost: total };
    }

    const energyCost = calcEnergyCostFromPrinter({
      printer: selectedPrinter,
      printHours: printTimeHours,
    });
    const depreciationCost = calcDepreciationFromPrinter({
      printer: selectedPrinter,
      printHours: printTimeHours,
      residualValue: def?.residualValue ?? 0,
      annualMaintenance: def?.annualMaintenance ?? 0,
      infrastructureYear: def?.infrastructureYear ?? 0,
      yearlyPrintHours: def?.yearlyPrintHours ?? 1000,
    });
    const totalCost = materialCost + energyCost + depreciationCost + packaging + other;
    return { energyCost, depreciationCost, packagingCost: packaging, totalCost };
  }, [selectedPrinter, printTimeHours, materialCost, otherCosts, settings?.defaults]);

  const suggestedPriceFromMargin = useMemo(() => {
    const margin = typeof marginPercent === "number" && Number.isFinite(marginPercent) ? marginPercent : 0;
    const fee = Number(settings?.defaults?.shopeeBaseCommission ?? 14);
    return calcSuggestedPrice({
      totalCost,
      marketplaceFeePercent: fee,
      desiredMarginPercent: margin,
    });
  }, [totalCost, marginPercent, settings?.defaults?.shopeeBaseCommission]);

  useEffect(() => {
    setPrice(suggestedPriceFromMargin);
  }, [suggestedPriceFromMargin]);

  useEffect(() => {
    if (step === 4 && totalCost > 0 && (marginPercent === "" || marginPercent === 0)) {
      setMarginPercent(defaultMargin);
    }
  }, [step, totalCost, marginPercent, defaultMargin]);

  const marginFromPrice = useMemo(() => {
    if (totalCost <= 0 || price <= 0) return 0;
    return calcMarginPercentage(price, totalCost);
  }, [price, totalCost]);

  function handleAddMaterial() {
    const supply = supplies.find((s) => s.id === addSupplyId);
    if (!supply || addQty === "" || Number(addQty) <= 0) return;
    const qty = Number(addQty);
    if (materials.some((m) => m.supplyId === supply.id)) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.supplyId === supply.id ? { ...m, qty: m.qty + qty } : m,
        ),
      );
    } else {
      setMaterials((prev) => [
        ...prev,
        {
          supplyId: supply.id,
          name: supply.name,
          unit: supply.unit ?? "un",
          unitCost: supply.unitCost ?? 0,
          qty,
        },
      ]);
    }
    setAddSupplyId("");
    setAddQty("");
  }

  function removeMaterial(supplyId: string) {
    setMaterials((prev) => prev.filter((m) => m.supplyId !== supplyId));
  }

  function handleMarginChange(value: number | "") {
    setMarginPercent(value);
    if (typeof value === "number" && Number.isFinite(value)) {
      const p = calcSuggestedPrice({
        totalCost,
        marketplaceFeePercent: Number(settings?.defaults?.shopeeBaseCommission ?? 14),
        desiredMarginPercent: value,
      });
      setPrice(p);
    }
  }

  function handlePriceChange(value: number) {
    setPrice(value);
    if (totalCost > 0 && value > 0) {
      setMarginPercent(calcMarginPercentage(value, totalCost));
    }
  }

  async function handleCreate() {
    setError(null);
    if (!name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }
    if (materials.length === 0) {
      setError("Adicione pelo menos um material.");
      return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();
    const productId = generateUuid();

    const product: Product = {
      id: productId,
      name: name.trim(),
      sku: sku.trim() || null,
      description: description.trim() || null,
      weight: materials.reduce((acc, m) => acc + (m.unit === "kg" ? m.qty * 1000 : m.unit === "g" ? m.qty : 0), 0) || 0,
      price,
      margin: typeof marginPercent === "number" ? marginPercent : null,
      marketplace,
      currency: "BRL",
      createdAt: nowIso,
      updatedAt: nowIso,
      totalCost,
      suggestedPriceShopee: price,
      suggestedPriceML: price,
      printTimeMinutes: Math.round(printTimeHours * 60) || null,
      defaultPrinterId: defaultPrinterId ?? null,
    };

    addProduct(product);

    if (user) {
      try {
        const list = useProductsStore.getState().products;
        await upsertProductsForUser(user.id, list);
        for (const m of materials) {
          await upsertProductMaterial(user.id, {
            id: generateUuid(),
            productId,
            supplyId: m.supplyId,
            qty: m.qty,
            unit: m.unit,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao salvar.");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onClose();
    setStep(1);
    setName("");
    setSku("");
    setDescription("");
    setPrintHours(0);
    setPrintMinutes(0);
    setDefaultPrinterId(null);
    setMaterials([]);
    setOtherCosts(0);
    setMarginPercent(0);
    setPrice(0);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 className="text-lg font-semibold text-slate-50">Novo Produto</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Fechar"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="flex gap-1 border-b border-slate-800 px-4 py-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                step === s.id
                  ? "bg-cyan-500/20 text-cyan-300"
                  : step > s.id
                    ? "text-emerald-400"
                    : "text-slate-500"
              }`}
            >
              {step > s.id ? (
                <span className="text-emerald-400">✓</span>
              ) : (
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium ${
                    step === s.id ? "bg-cyan-500 text-slate-900" : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {s.id}
                </span>
              )}
              {s.label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2.5 text-sm text-amber-100">
                <p className="font-semibold">Dica</p>
                <p>
                  Se quiser maior precisão, insira o produto através da{" "}
                  <a href="/calculator" className="underline">
                    calculadora
                  </a>
                  , não manualmente.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nome do Produto</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Peça de Engrenagem"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">SKU (opcional)</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Ex: PROD-001"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Descrição (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o produto"
                  rows={2}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="flex gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Tempo de impressão (h)</label>
                  <input
                    type="number"
                    min={0}
                    value={printHours}
                    onChange={(e) =>
                      setPrintHours(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2 text-sm text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">min</label>
                  <input
                    type="number"
                    min={0}
                    value={printMinutes}
                    onChange={(e) =>
                      setPrintMinutes(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2 text-sm text-slate-100"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Equipamento padrão (opcional)
                </label>
                <p className="mb-1 text-[10px] text-slate-500">
                  Usado para calcular custos de energia e depreciação.
                </p>
                <select
                  value={defaultPrinterId ?? ""}
                  onChange={(e) => setDefaultPrinterId(e.target.value || null)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Nenhum</option>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.model ? `(${p.model})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2.5 text-sm text-slate-300">
                <p className="font-semibold text-slate-200">Opcional</p>
                <p>
                  Adicione uma imagem para destacar seu produto e arquivos como STL, 3MF, OBJ,
                  GCODE ou documentação.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Imagem principal</label>
                <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/40 text-slate-500">
                  Clique em &quot;Selecionar Imagem&quot; para adicionar (em breve)
                </div>
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Selecionar Imagem
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">
                  Arquivos adicionais (3MF, STL, GCODE, PDF, etc.)
                </label>
                <button
                  type="button"
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Adicionar Arquivos
                </button>
                <p className="mt-1 text-xs text-slate-500">Nenhum arquivo adicionado</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                Adicione os materiais (insumos) necessários para produzir este produto.
              </p>
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-[10px] text-slate-500">Insumo</label>
                    <select
                      value={addSupplyId}
                      onChange={(e) => setAddSupplyId(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                    >
                      <option value="">Digite para pesquisar...</option>
                      {supplies.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.unit})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24">
                    <label className="mb-1 block text-[10px] text-slate-500">
                      Quantidade (em {supplies.find((s) => s.id === addSupplyId)?.unit ?? "—"})
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={addQty}
                      onChange={(e) =>
                        setAddQty(e.target.value === "" ? "" : Number(e.target.value))
                      }
                      placeholder="Ex: 250"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-sm text-slate-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMaterial}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500"
                  >
                    + Adicionar Material
                  </button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-slate-400">Materiais adicionados</p>
                {materials.length === 0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/40 py-6 text-center text-sm text-slate-500">
                    Nenhum material adicionado
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {materials.map((m) => (
                      <li
                        key={m.supplyId}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm"
                      >
                        <span className="text-slate-200">
                          {m.name} — {m.qty.toLocaleString("pt-BR")} {m.unit} × {formatBRL(m.unitCost)} ={" "}
                          {formatBRL(m.qty * m.unitCost)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeMaterial(m.supplyId)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-rose-400"
                        >
                          🗑
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-xl border border-amber-600/40 bg-amber-950/20 px-3 py-2 text-sm text-amber-100">
                <span className="font-semibold">Custo Total de Material:</span>{" "}
                <span className="font-bold text-amber-300">{formatBRL(materialCost)}</span>
              </div>
              {materials.length === 0 && (
                <div className="rounded-xl border border-amber-600/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">
                  <p className="font-semibold">Obrigatório</p>
                  <p>Adicione pelo menos um material para calcular o custo de produção.</p>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Outros custos (R$)</label>
                <p className="mb-1 text-[10px] text-slate-500">
                  Taxas de marketplaces, impostos, despesas etc.
                </p>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={otherCosts}
                  onChange={(e) =>
                    setOtherCosts(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full max-w-[140px] rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="rounded-xl border border-amber-600/40 bg-slate-900/60 p-3">
                <p className="text-xs text-slate-400">Resumo de custos</p>
                <ul className="mt-1 space-y-0.5 text-sm text-amber-100">
                  <li>Custo de Materiais: {formatBRL(materialCost)}</li>
                  <li>Custo de Energia: {formatBRL(energyCost)}</li>
                  <li>Custo de Depreciação: {formatBRL(depreciationCost)}</li>
                  <li>Embalagem: {formatBRL(packagingCost)}</li>
                  {typeof otherCosts === "number" && otherCosts > 0 && (
                    <li>Outros custos: {formatBRL(otherCosts)}</li>
                  )}
                  <li>
                    Custo Total de Produção: <strong>{formatBRL(totalCost)}</strong>
                  </li>
                </ul>
              </div>
              <div>
                <p className="mb-1 text-xs text-slate-400">
                  Edite a margem de lucro ou o preço de venda. Um atualiza o outro automaticamente.
                </p>
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">Margem de Lucro (%)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={marginPercent}
                      onChange={(e) =>
                        handleMarginChange(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-24 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2 text-sm text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] text-slate-500">Preço de Venda (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={price}
                      onChange={(e) => handlePriceChange(Number(e.target.value) || 0)}
                      className="w-28 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-2 text-sm text-slate-100"
                    />
                  </div>
                </div>
                <div className="mt-2 rounded-lg border border-emerald-600/40 bg-emerald-950/20 px-3 py-2 text-sm font-semibold text-emerald-200">
                  Preço de Venda: {formatBRL(price)}
                </div>
              </div>
              <div className="rounded-xl border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
                <p className="font-semibold text-slate-300">Como funciona</p>
                <p>
                  Edite a margem de lucro para calcular o preço, ou edite o preço para calcular a
                  margem. Sem equipamento selecionado, os custos de energia e depreciação ficam
                  zerados.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 border-t border-slate-800 px-4 py-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
            {step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !name.trim()}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || materials.length === 0}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? "Salvando…" : "Criar Produto"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
