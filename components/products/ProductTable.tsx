"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Boxes,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Printer, Product, ProductAsset } from "@/types";
import { useProductsStore } from "@/store/productsStore";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useProductKits } from "@/hooks/useProductKits";
import { deleteProduct, upsertProductsForUser } from "@/lib/supabaseProducts";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import type { ProductMaterial, SupplyItem } from "@/types";
import {
  deleteProductMaterial,
  listProductMaterials,
  listProductAssetsByProductIds,
  getProductAssetViewUrl,
  uploadProductFile,
  listSupplies,
  upsertProductMaterial,
} from "@/lib/supabaseProduction";
import { productChannelBadgeLabel } from "@/lib/productMarketplace";
import {
  computeChannelMetrics,
  bestChannel,
  CHANNEL_LABELS,
  type ChannelKey,
  type ChannelMetrics,
} from "@/lib/productChannelMetrics";

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPct(value: number) {
  return `${value.toFixed(1)}%`;
}

/** Ex.: 135 -> "2h 15min" · 60 -> "1h" · 45 -> "45min" · null -> "—" */
function formatDuration(minutes: number | null | undefined): string {
  if (typeof minutes !== "number" || !Number.isFinite(minutes) || minutes <= 0) return "—";
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

interface Props {
  products: Product[];
  /** Abre o fluxo completo (wizard) com dados do produto — foto, STL, materiais, preço. */
  onOpenProductWizard?: (product: Product) => void;
}

const CHANNEL_ORDER: ChannelKey[] = ["shopee", "mercadoLivre", "tiktok", "vendaDireta"];

/** Total de colunas da tabela (usado pra colSpan de linhas informativas). */
const TOTAL_COLUMNS = 1 + 1 + 1 + 1 + 1 + 1 + CHANNEL_ORDER.length * 3 + 1;

type SortKey =
  | "price"
  | "totalCost"
  | "printTimeMinutes"
  | "best"
  | `${ChannelKey}.price`
  | `${ChannelKey}.marginPercent`
  | `${ChannelKey}.profitPerHour`;

type SortState = { key: SortKey; dir: "asc" | "desc" };

type Row = {
  product: Product;
  metrics: ChannelMetrics;
  best: ReturnType<typeof bestChannel>;
};

function sortValue(row: Row, key: SortKey): number {
  if (key === "price") return row.product.price ?? -Infinity;
  if (key === "totalCost") return row.product.totalCost ?? -Infinity;
  if (key === "printTimeMinutes") return row.product.printTimeMinutes ?? -Infinity;
  if (key === "best") return row.best?.metric.profitPerHour ?? -Infinity;
  const [channel, field] = key.split(".") as [ChannelKey, "price" | "marginPercent" | "profitPerHour"];
  const metric = row.metrics[channel];
  if (!metric) return -Infinity;
  const v = metric[field];
  return v == null ? -Infinity : v;
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
  rowSpan,
}: {
  label: string;
  sortKey: SortKey;
  sort: SortState | null;
  onSort: (key: SortKey) => void;
  className?: string;
  rowSpan?: number;
}) {
  const active = sort?.key === sortKey;
  return (
    <th rowSpan={rowSpan} className={`px-2 py-2 text-right font-semibold text-slate-400 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-slate-100 ${
          active ? "text-cyan-300" : ""
        }`}
      >
        {label}
        {active ? (
          sort!.dir === "desc" ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function ChannelCell({ metric }: { metric: ChannelMetrics[ChannelKey] }) {
  if (!metric) {
    return (
      <>
        <td className="px-2 py-2 text-right text-slate-600">—</td>
        <td className="px-2 py-2 text-right text-slate-600">—</td>
        <td className="px-2 py-2 text-right text-slate-600">—</td>
      </>
    );
  }
  return (
    <>
      <td className="px-2 py-2 text-right tabular-nums text-slate-100">{formatBRL(metric.price)}</td>
      <td
        className={`px-2 py-2 text-right tabular-nums font-medium ${
          metric.marginPercent >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {formatPct(metric.marginPercent)}
      </td>
      <td
        className={`px-2 py-2 text-right tabular-nums font-semibold ${
          metric.profitPerHour == null
            ? "text-slate-600"
            : metric.profitPerHour >= 0
              ? "text-emerald-300"
              : "text-rose-300"
        }`}
      >
        {metric.profitPerHour == null ? "—" : `${formatBRL(metric.profitPerHour)}/h`}
      </td>
    </>
  );
}

/** Custo · tempo · melhor canal · 4×3 colunas de canal — reaproveitado por linha solta, membro de kit e resumo do kit. */
function MetricsCells({
  totalCost,
  printTimeMinutes,
  metrics,
  best,
}: {
  totalCost: number;
  printTimeMinutes: number | null | undefined;
  metrics: ChannelMetrics;
  best: ReturnType<typeof bestChannel>;
}) {
  return (
    <>
      <td className="px-2 py-2 text-right tabular-nums text-slate-300">{formatBRL(totalCost)}</td>
      <td className="px-2 py-2 text-right tabular-nums text-slate-300">{formatDuration(printTimeMinutes)}</td>
      <td className="px-2 py-2 text-right">
        {best ? (
          <span className="inline-flex flex-col items-end">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
              {best.metric.channelLabel}
            </span>
            <span className="tabular-nums text-emerald-300">{formatBRL(best.metric.profitPerHour!)}/h</span>
          </span>
        ) : (
          <span className="text-slate-600">—</span>
        )}
      </td>
      {CHANNEL_ORDER.map((ch) => (
        <ChannelCell key={ch} metric={metrics[ch]} />
      ))}
    </>
  );
}

const iconBtnClass =
  "rounded-lg border border-slate-800 bg-slate-900/60 p-1.5 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-200";

/** Botões de ação (Abrir, Ficha técnica, Materiais, Ordem, Ocultar opcional, Remover) — reaproveitado por linha solta e membro de kit. */
function ActionsCell({
  onOpen,
  onTechnical,
  onBom,
  onOrder,
  onRemove,
  onToggleHidden,
}: {
  onOpen: () => void;
  onTechnical: () => void;
  onBom: () => void;
  onOrder: () => void;
  onRemove: () => void;
  onToggleHidden?: () => void;
}) {
  return (
    <td className="px-2 py-2">
      <div className="flex items-center justify-end gap-1">
        <button type="button" onClick={onOpen} title="Abrir informações do produto" className={iconBtnClass}>
          <Eye className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onTechnical}
          title="Editar ficha técnica (SKU, tempo, impressora padrão)"
          className={iconBtnClass}
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
        <button type="button" onClick={onBom} title="Materiais (BOM) do produto" className={iconBtnClass}>
          <Boxes className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onOrder}
          title="Criar uma ordem de produção a partir deste produto"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-1.5 text-emerald-300 hover:bg-emerald-500/15"
        >
          <ClipboardList className="h-3.5 w-3.5" />
        </button>
        {onToggleHidden ? (
          <button
            type="button"
            onClick={onToggleHidden}
            title="Ocultar da lista solta (continua aparecendo em kits)"
            className={iconBtnClass}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          title="Remover item"
          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/15"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </td>
  );
}

export function ProductTable({ products, onOpenProductWizard }: Props) {
  const router = useRouter();
  const removeProduct = useProductsStore((s) => s.removeProduct);
  const updateProduct = useProductsStore((s) => s.updateProduct);
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { kits, save: saveKit, remove: removeKit } = useProductKits();
  useInventoryStore();
  useSuppliesStore();

  const [bomOpen, setBomOpen] = useState(false);
  const [bomProduct, setBomProduct] = useState<Product | null>(null);
  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [materials, setMaterials] = useState<ProductMaterial[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState<string | null>(null);
  const [addSupplyId, setAddSupplyId] = useState<string>("");
  const [addQty, setAddQty] = useState<number | "">("");

  // ficha técnica
  const [techOpen, setTechOpen] = useState(false);
  const [techPrinters, setTechPrinters] = useState<Printer[]>([]);
  const [techProduct, setTechProduct] = useState<Product | null>(null);
  const [techSku, setTechSku] = useState("");
  const [techTimeMinutes, setTechTimeMinutes] = useState<number | null>(null);
  const [techDefaultPrinterId, setTechDefaultPrinterId] = useState<string>("");

  const [productThumbById, setProductThumbById] = useState<Record<string, string>>({});

  const [sort, setSort] = useState<SortState | null>({ key: "best", dir: "desc" });

  // Seleção pra criar kit direto na tabela
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showKitNamePrompt, setShowKitNamePrompt] = useState(false);
  const [kitNameInput, setKitNameInput] = useState("");

  // Grupos de kit minimizados (estado local, não persiste)
  const [collapsedKitIds, setCollapsedKitIds] = useState<Set<string>>(new Set());

  // Rodapé de produtos ocultos
  const [showHiddenList, setShowHiddenList] = useState(false);

  function handleSort(key: SortKey) {
    setSort((prev) => {
      if (prev?.key === key) return { key, dir: prev.dir === "desc" ? "asc" : "desc" };
      return { key, dir: "desc" };
    });
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleKitCollapsed(kitId: string) {
    setCollapsedKitIds((prev) => {
      const next = new Set(prev);
      if (next.has(kitId)) next.delete(kitId);
      else next.add(kitId);
      return next;
    });
  }

  function handleCreateKit() {
    const name = kitNameInput.trim();
    if (!name || selectedIds.size < 2) return;
    saveKit(
      name,
      Array.from(selectedIds).map((id) => ({ productId: id, qty: 1 })),
    );
    setSelectedIds(new Set());
    setKitNameInput("");
    setShowKitNamePrompt(false);
  }

  async function setHidden(product: Product, hidden: boolean) {
    const updated: Product = { ...product, hiddenStandalone: hidden, updatedAt: new Date().toISOString() };
    updateProduct(updated);
    if (user) {
      await upsertProductsForUser(user.id, useProductsStore.getState().products);
    }
  }

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

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const kitGroups = useMemo(() => {
    return kits
      .map((kit) => {
        const members = kit.components
          .map((c) => ({ product: productById.get(c.productId), qty: c.qty }))
          .filter((m): m is { product: Product; qty: number } => !!m.product);
        if (members.length === 0) return null;
        const totalCost = members.reduce((sum, m) => sum + (m.product.totalCost ?? 0) * m.qty, 0);
        const printTimeMinutes = members.reduce(
          (sum, m) => sum + (m.product.printTimeMinutes ?? 0) * m.qty,
          0,
        );
        const metrics = computeChannelMetrics({ totalCost, printTimeMinutes }, settings.marketplacePresets);
        const best = bestChannel(metrics);
        return { kit, members, totalCost, printTimeMinutes, metrics, best };
      })
      .filter((g): g is NonNullable<typeof g> => g !== null);
  }, [kits, productById, settings.marketplacePresets]);

  const standaloneProducts = useMemo(() => products.filter((p) => !p.hiddenStandalone), [products]);
  const hiddenProducts = useMemo(() => products.filter((p) => p.hiddenStandalone), [products]);

  const standaloneRows = useMemo<Row[]>(() => {
    return standaloneProducts.map((product) => {
      const metrics = computeChannelMetrics(product, settings.marketplacePresets);
      return { product, metrics, best: bestChannel(metrics) };
    });
  }, [standaloneProducts, settings.marketplacePresets]);

  const sortedStandaloneRows = useMemo(() => {
    if (!sort) return standaloneRows;
    const dirMul = sort.dir === "asc" ? 1 : -1;
    return [...standaloneRows].sort((a, b) => dirMul * (sortValue(a, sort.key) - sortValue(b, sort.key)));
  }, [standaloneRows, sort]);

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
    setAddQty("");
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
    const addQtyNum = typeof addQty === "number" ? addQty : 0;
    if (!Number.isFinite(addQtyNum) || addQtyNum <= 0) return;
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
        ? { ...existing, qty: addQtyNum, updatedAt: now }
        : {
            productId: bomProduct.id,
            supplyId: addSupplyId,
            qty: addQtyNum,
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
      setAddQty("");
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
      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2 pt-1">
          <p className="text-[11px] text-slate-500">
            Preço, margem e lucro/hora por marketplace são estimados a partir do custo de
            produção do produto + o preset ativo de cada canal. Clique num cabeçalho pra
            ordenar. Marque 2+ produtos pra agrupar num kit.
          </p>
          {selectedIds.size > 0 ? (
            <div className="flex items-center gap-2">
              {showKitNamePrompt ? (
                <>
                  <input
                    autoFocus
                    value={kitNameInput}
                    onChange={(e) => setKitNameInput(e.currentTarget.value)}
                    placeholder="Nome do kit"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateKit();
                      if (e.key === "Escape") setShowKitNamePrompt(false);
                    }}
                    className="rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
                  />
                  <button
                    type="button"
                    disabled={!kitNameInput.trim()}
                    onClick={handleCreateKit}
                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-200 disabled:opacity-40"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Confirmar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKitNamePrompt(false)}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400">{selectedIds.size} selecionado(s)</span>
                  <button
                    type="button"
                    disabled={selectedIds.size < 2}
                    onClick={() => setShowKitNamePrompt(true)}
                    title={selectedIds.size < 2 ? "Selecione pelo menos 2 produtos" : "Criar kit com os selecionados"}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-900 disabled:opacity-40"
                  >
                    <Layers className="h-3.5 w-3.5" />
                    Criar kit
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-200"
                    title="Cancelar seleção"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead className="text-[10px] uppercase tracking-[0.1em] text-slate-500">
              <tr className="border-b border-slate-800">
                <th rowSpan={2} className="w-8 px-2 py-2 text-left align-bottom" />
                <th rowSpan={2} className="px-2 py-2 text-left align-bottom">
                  Produto
                </th>
                <SortHeader label="Preço" sortKey="price" sort={sort} onSort={handleSort} rowSpan={2} className="align-bottom" />
                <SortHeader label="Custo" sortKey="totalCost" sort={sort} onSort={handleSort} rowSpan={2} className="align-bottom" />
                <SortHeader label="Tempo" sortKey="printTimeMinutes" sort={sort} onSort={handleSort} rowSpan={2} className="align-bottom" />
                <SortHeader label="Melhor canal" sortKey="best" sort={sort} onSort={handleSort} rowSpan={2} className="align-bottom" />
                {CHANNEL_ORDER.map((ch) => (
                  <th
                    key={ch}
                    colSpan={3}
                    className="border-l border-slate-800 px-2 py-1.5 text-center font-semibold text-slate-400"
                  >
                    {CHANNEL_LABELS[ch]}
                  </th>
                ))}
                <th rowSpan={2} className="px-2 py-2 text-right align-bottom">
                  Ações
                </th>
              </tr>
              <tr className="border-b border-slate-800">
                {CHANNEL_ORDER.map((ch) => (
                  <Fragment key={ch}>
                    <SortHeader
                      label="Preço"
                      sortKey={`${ch}.price`}
                      sort={sort}
                      onSort={handleSort}
                      className="border-l border-slate-800"
                    />
                    <SortHeader
                      label="Margem"
                      sortKey={`${ch}.marginPercent`}
                      sort={sort}
                      onSort={handleSort}
                    />
                    <SortHeader
                      label="Margem/h"
                      sortKey={`${ch}.profitPerHour`}
                      sort={sort}
                      onSort={handleSort}
                    />
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {kitGroups.map(({ kit, members, totalCost, printTimeMinutes, metrics, best }) => {
                const collapsed = collapsedKitIds.has(kit.id);
                return (
                  <Fragment key={kit.id}>
                    <tr className="bg-slate-900/50">
                      <td className="px-2 py-2" />
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleKitCollapsed(kit.id)}
                            title={collapsed ? "Expandir kit" : "Minimizar kit"}
                            className="rounded p-0.5 text-slate-400 hover:text-cyan-300"
                          >
                            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                          <Layers className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                          <span className="text-sm font-semibold text-slate-100">{kit.name}</span>
                          <span className="text-[10px] text-slate-500">({members.length} itens)</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600">—</td>
                      <MetricsCells totalCost={totalCost} printTimeMinutes={printTimeMinutes} metrics={metrics} best={best} />
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (typeof window !== "undefined" && !window.confirm(`Excluir o kit "${kit.name}"? Os produtos não são afetados.`))
                              return;
                            removeKit(kit.id);
                          }}
                          title="Excluir kit"
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-300 hover:bg-rose-500/15"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                    {!collapsed &&
                      members.map(({ product, qty }) => {
                        const metricsRow = computeChannelMetrics(product, settings.marketplacePresets);
                        const bestRow = bestChannel(metricsRow);
                        return (
                          <tr key={`${kit.id}-${product.id}`} className="bg-slate-950/20">
                            <td className="px-2 py-2" />
                            <td className="py-2 pl-8 pr-2">
                              <div className="flex items-center gap-2 border-l-2 border-slate-800 pl-2.5">
                                <p className="truncate text-sm text-slate-200">{product.name}</p>
                                {qty !== 1 ? (
                                  <span className="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                                    {qty}×
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right tabular-nums text-slate-100">
                              {product.price.toLocaleString("pt-BR", { style: "currency", currency: product.currency })}
                            </td>
                            <MetricsCells
                              totalCost={(product.totalCost ?? 0) * qty}
                              printTimeMinutes={product.printTimeMinutes != null ? product.printTimeMinutes * qty : null}
                              metrics={metricsRow}
                              best={bestRow}
                            />
                            <ActionsCell
                              onOpen={() => {
                                if (!user) {
                                  if (typeof window !== "undefined") window.alert("Faça login para abrir e editar o produto.");
                                  return;
                                }
                                onOpenProductWizard?.(product);
                              }}
                              onTechnical={() => openTechnical(product)}
                              onBom={() => openBom(product)}
                              onOrder={() => {
                                const params = new URLSearchParams();
                                params.set("create", "1");
                                params.set("productId", product.id);
                                if (product.defaultPrinterId) params.set("printerId", product.defaultPrinterId);
                                params.set("qty", "1");
                                router.push(`/ordens?${params.toString()}`);
                              }}
                              onRemove={() => handleRemove(product)}
                            />
                          </tr>
                        );
                      })}
                  </Fragment>
                );
              })}

              {kitGroups.length > 0 && sortedStandaloneRows.length > 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLUMNS} className="px-2 py-1.5 text-[10px] uppercase tracking-[0.14em] text-slate-600">
                    Produtos soltos
                  </td>
                </tr>
              ) : null}

              {sortedStandaloneRows.length === 0 ? (
                <tr>
                  <td colSpan={TOTAL_COLUMNS} className="px-2 py-4 text-center text-slate-500">
                    {kitGroups.length > 0
                      ? "Nenhum produto solto (todos ocultos ou só aparecem dentro de kits)."
                      : "Nenhum produto."}
                  </td>
                </tr>
              ) : null}

              {sortedStandaloneRows.map(({ product, metrics, best }) => {
                const unitCost = product.totalCost ?? 0;
                return (
                  <tr key={product.id} className="hover:bg-slate-900/40">
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                        className="h-4 w-4 accent-cyan-400"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-slate-700 bg-gradient-to-br from-cyan-500/20 to-emerald-500/20">
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
                                width={18}
                                height={18}
                                className="opacity-90"
                              />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">{product.name}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                            <span className="rounded border border-slate-800 bg-slate-900/60 px-1.5 py-0.5 uppercase tracking-wide">
                              {productChannelBadgeLabel(product.marketplace)}
                            </span>
                            {product.sku ? <span>SKU: {product.sku}</span> : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums text-slate-100">
                      {product.price.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: product.currency,
                      })}
                    </td>
                    <MetricsCells
                      totalCost={unitCost}
                      printTimeMinutes={product.printTimeMinutes}
                      metrics={metrics}
                      best={best}
                    />
                    <ActionsCell
                      onOpen={() => {
                        if (!user) {
                          if (typeof window !== "undefined") {
                            window.alert("Faça login para abrir e editar o produto.");
                          }
                          return;
                        }
                        onOpenProductWizard?.(product);
                      }}
                      onTechnical={() => openTechnical(product)}
                      onBom={() => openBom(product)}
                      onOrder={() => {
                        const params = new URLSearchParams();
                        params.set("create", "1");
                        params.set("productId", product.id);
                        if (product.defaultPrinterId) params.set("printerId", product.defaultPrinterId);
                        params.set("qty", "1");
                        router.push(`/ordens?${params.toString()}`);
                      }}
                      onRemove={() => handleRemove(product)}
                      onToggleHidden={() => setHidden(product, true)}
                    />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {hiddenProducts.length > 0 ? (
          <div className="mt-2 border-t border-slate-800 px-2 pt-2">
            <button
              type="button"
              onClick={() => setShowHiddenList((v) => !v)}
              className="text-[11px] text-slate-500 hover:text-slate-300"
            >
              {showHiddenList ? "Esconder" : "Mostrar"} {hiddenProducts.length} produto(s) oculto(s) da lista
            </button>
            {showHiddenList ? (
              <ul className="mt-1.5 space-y-1">
                {hiddenProducts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className="truncate">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => setHidden(p, false)}
                      className="inline-flex shrink-0 items-center gap-1 text-cyan-300 hover:text-cyan-200"
                    >
                      <Undo2 className="h-3 w-3" />
                      Mostrar de novo
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </div>

      {bomOpen && bomProduct ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div className="w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan" style={{ maxHeight: "calc(100dvh - 9rem)" }}>
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
                      onChange={(e) => setAddQty(e.target.value === "" ? "" : Number(e.target.value))}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div className="w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan" style={{ maxHeight: "calc(100dvh - 9rem)" }}>
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
