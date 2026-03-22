"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ProductionOrder, Product, Printer } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { supabase } from "@/lib/supabaseClient";
import { useInventoryStore } from "@/store/inventoryStore";
import { useRouter, useSearchParams } from "next/navigation";
import {
  listProductionOrders,
  upsertProductionOrder,
  deleteProductionOrder,
  listPrinters,
  consumeSuppliesForOrder,
  listSupplies,
  listProductMaterials,
} from "@/lib/supabaseProduction";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { computeOrderTotalCost, computeProductUnitCost } from "@/lib/productionCost";
import {
  PRODUCTION_ORDER_PIPELINE,
  PRODUCTION_ORDER_STATUS_DISPLAY_ORDER,
  PRODUCTION_ORDER_STATUS_LABELS,
  nextProductionOrderStatus,
} from "@/lib/productionOrderStatus";
import { computePrintingStartedAtForSave } from "@/lib/productionPrintingStartedAt";

type DraftOrder = {
  id?: string;
  productId: string;
  printerId?: string | null;
  quantity: number;
  dueDate?: string | null;
  status: ProductionOrder["status"];
  notes?: string | null;
};

/** Impressora efetiva: escolha explícita ou padrão do produto (igual ao que a ordem representa na prática). */
function getEffectivePrinterIdFromRefs(
  explicitPrinterId: string | null | undefined,
  product: Product | undefined,
): string | null {
  const explicit = typeof explicitPrinterId === "string" ? explicitPrinterId.trim() : "";
  if (explicit) return explicit;
  const defRaw = product?.defaultPrinterId;
  const def = typeof defRaw === "string" ? defRaw.trim() : "";
  return def || null;
}

function getEffectivePrinterIdForDraft(
  draft: DraftOrder,
  product: Product | undefined,
): string | null {
  return getEffectivePrinterIdFromRefs(draft.printerId, product);
}

function getEffectivePrinterIdForOrder(
  order: ProductionOrder,
  product: Product | undefined,
): string | null {
  return getEffectivePrinterIdFromRefs(order.printerId, product);
}

function isOrderActiveForPrinterConflict(o: ProductionOrder): boolean {
  return o.status !== "done" && o.status !== "cancelled";
}

/** Garante custo (e preços sugeridos, se faltarem) antes de lançar em Peças produzidas. */
async function ensureProductPricingForInventory(
  userId: string,
  product: Product,
): Promise<Product> {
  let next = { ...product };
  try {
    if (next.totalCost == null || next.totalCost <= 0) {
      const computed = await computeProductUnitCost(userId, next);
      if (computed.totalCost > 0) {
        next = { ...next, totalCost: computed.totalCost };
      }
    }
  } catch {
    // mantém produto como veio do banco
  }
  return next;
}

/**
 * Ocupada se: cadastro "Em uso" em /impressoras, ou existe outra ordem em aberto
 * (não concluída/cancelada) cuja impressora efetiva é a mesma — inclusive quando a ordem
 * só usa o padrão do produto (printer_id nulo no banco).
 */
function getPrinterOccupiedInfo(
  printerId: string | null,
  printersById: Map<string, Printer>,
  orders: ProductionOrder[],
  productsById: Map<string, Product>,
  excludeOrderId?: string,
): { occupied: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!printerId) return { occupied: false, reasons };
  const printer = printersById.get(printerId);
  if (printer?.status === "busy") {
    reasons.push(
      `A impressora "${printer.name}" está marcada como "Em uso" em /impressoras.`,
    );
  }
  const activeOthers = orders.filter((o) => {
    if (excludeOrderId && o.id === excludeOrderId) return false;
    if (!isOrderActiveForPrinterConflict(o)) return false;
    const eff = getEffectivePrinterIdForOrder(o, productsById.get(o.productId));
    return eff === printerId;
  });
  if (activeOthers.length === 1) {
    reasons.push(
      `Já existe 1 ordem em aberto associada a esta máquina (via impressora da ordem ou padrão do produto).`,
    );
  } else if (activeOthers.length > 1) {
    reasons.push(
      `Já existem ${activeOthers.length} ordens em aberto associadas a esta máquina.`,
    );
  }
  return { occupied: reasons.length > 0, reasons };
}

export default function OrdersPage() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const upsertFromProduct = useInventoryStore((s) => s.upsertFromProduct);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Produtos que têm pelo menos 1 material cadastrado no BOM
  const [productsWithBom, setProductsWithBom] = useState<Set<string>>(new Set());

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftOrder | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let alive = true;
    setLoading(true);
    setError(null);
    Promise.all([
      listProductionOrders(user.id),
      fetchUserProducts(user.id),
      listPrinters(user.id),
      supabase
        ?.from("product_materials")
        .select("product_id")
        .eq("user_id", user.id)
        .then((res) => res.data ?? []),
    ])
      .then(([ord, prods, prts, bomRows]) => {
        if (!alive) return;
        setOrders(ord);
        setProducts(prods);
        setPrinters(prts);
        const ids = new Set<string>();
        for (const row of bomRows as any[]) {
          if (row?.product_id) ids.add(row.product_id as string);
        }
        setProductsWithBom(ids);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Falha ao carregar ordens.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);

  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p] as const)),
    [products],
  );
  const printersById = useMemo(
    () => new Map(printers.map((p) => [p.id, p] as const)),
    [printers],
  );

  const printerOccupiedInModal = useMemo(() => {
    if (!modalOpen || !draft) return { occupied: false, reasons: [] as string[] };
    const prod = productsById.get(draft.productId);
    const pid = getEffectivePrinterIdForDraft(draft, prod);
    return getPrinterOccupiedInfo(pid, printersById, orders, productsById, draft.id);
  }, [modalOpen, draft, productsById, printersById, orders]);

  // Produto elegível para ordens: tem tempo estimado, impressora padrão e pelo menos 1 material.
  const eligibleProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !!p.printTimeMinutes &&
          !!p.defaultPrinterId &&
          productsWithBom.has(p.id),
      ),
    [products, productsWithBom],
  );

  const isEligibleProductId = useMemo(() => {
    const set = new Set<string>();
    for (const p of eligibleProducts) set.add(p.id);
    return set;
  }, [eligibleProducts]);

  const handledPrefillRef = useRef(false);
  useEffect(() => {
    if (handledPrefillRef.current) return;
    if (!user) return;
    if (!eligibleProducts.length) return;

    const shouldCreate = searchParams?.get("create") === "1";
    const productId = searchParams?.get("productId") ?? "";
    if (!shouldCreate || !productId) return;

    const qtyRaw = searchParams?.get("qty") ?? "1";
    const qty = Math.max(1, Number(qtyRaw) || 1);
    const printerIdParam = searchParams?.get("printerId") ?? "";

    const prod = products.find((p) => p.id === productId) ?? null;
    if (!prod) {
      handledPrefillRef.current = true;
      setError("Produto não encontrado.");
      router.replace("/ordens");
      return;
    }

    setDraft({
      productId: prod.id,
      printerId: printerIdParam ? printerIdParam : (prod.defaultPrinterId ?? null),
      quantity: qty,
      dueDate: null,
      status: "new",
      notes: null,
    });
    setModalOpen(true);
    if (!isEligibleProductId.has(prod.id)) {
      setError(
        "Esse produto ainda não está pronto para ordens. Preencha ficha técnica (tempo + impressora padrão) e materiais (BOM) e tente novamente.",
      );
    }
    handledPrefillRef.current = true;
    router.replace("/ordens");
  }, [eligibleProducts.length, isEligibleProductId, products, router, searchParams, user]);

  const [costs, setCosts] = useState<Record<string, number>>({});

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    let alive = true;
    async function loadCosts() {
      const entries: [string, number][] = [];
      for (const o of orders) {
        const prod = productsById.get(o.productId);
        if (!prod) continue;
        try {
          const total = await computeOrderTotalCost(userId!, o, prod);
          if (!alive) return;
          entries.push([o.id, total]);
        } catch {
          // ignora erros individuais
        }
      }
      if (!alive) return;
      setCosts((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    }
    loadCosts();
    return () => {
      alive = false;
    };
  }, [orders, productsById, user?.id]);

  function openCreate() {
    if (!eligibleProducts.length) {
      window.alert(
        "Antes de criar ordens, preencha a ficha técnica (tempo e impressora padrão) e os materiais do produto.",
      );
      return;
    }
    const firstProduct = eligibleProducts[0];
    const defaultPrinterId = firstProduct.defaultPrinterId ?? printers[0]?.id ?? null;
    setDraft({
      productId: firstProduct.id,
      printerId: defaultPrinterId,
      quantity: 1,
      dueDate: null,
      status: "new",
      notes: null,
    });
    setModalOpen(true);
  }

  function openEdit(order: ProductionOrder) {
    setDraft({
      id: order.id,
      productId: order.productId,
      printerId: order.printerId ?? null,
      quantity: order.quantity,
      dueDate: order.dueDate ?? null,
      status: order.status,
      notes: order.notes ?? null,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setDraft(null);
  }

  async function saveDraft() {
    if (!user || !draft) return;
    if (!draft.productId || draft.quantity <= 0) return;

    const prod = productsById.get(draft.productId);
    const hasBom = productsWithBom.has(draft.productId);
    if (!prod || !prod.printTimeMinutes || !prod.defaultPrinterId || !hasBom) {
      setError(
        "Para criar ordens, o produto precisa ter tempo estimado, impressora padrão e pelo menos um material na ficha técnica.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const previous = draft.id
        ? orders.find((o) => o.id === draft.id) ?? null
        : null;
      const now = new Date().toISOString();

      // Validação de estoque de filamento antes de criar a ordem.
      // (evita baixar/consumir insumos quando o estoque não é suficiente)
      const [mats, sups] = await Promise.all([
        listProductMaterials(user.id, draft.productId),
        listSupplies(user.id),
      ]);
      const suppliesById = new Map(sups.map((s) => [s.id, s] as const));
      const filamentDeficits: Array<{
        supplyName: string;
        required: number;
        available: number;
        unit: string;
      }> = [];

      for (const m of mats) {
        const supply = suppliesById.get(m.supplyId);
        if (!supply) continue;
        if (supply.category !== "filament") continue;

        const required = (m.qty ?? 0) * draft.quantity;
        const available = supply.stockQty ?? 0;
        if (required > available) {
          filamentDeficits.push({
            supplyName: supply.name,
            required,
            available,
            unit: supply.unit,
          });
        }
      }

      if (filamentDeficits.length > 0) {
        const lines = filamentDeficits.map((d) => {
          const fmt = (n: number) =>
            n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
          // Se unidade for kg, exibimos também em g (filamento geralmente é em g).
          if (d.unit === "kg") {
            const reqG = d.required * 1000;
            const avG = d.available * 1000;
            return `${d.supplyName}: necessário ${fmt(reqG)} g, disponível ${fmt(avG)} g`;
          }
          return `${d.supplyName}: necessário ${fmt(d.required)} ${d.unit}, disponível ${fmt(
            d.available,
          )} ${d.unit}`;
        });
        setError(`Estoque de filamento baixo. Não é possível criar esta ordem.\n${lines.join("\n")}`);
        return; // mantém o modal aberto
      }

      const effectivePid = getEffectivePrinterIdForDraft(draft, prod);
      const occupiedInfo = getPrinterOccupiedInfo(
        effectivePid,
        printersById,
        orders,
        productsById,
        draft.id,
      );
      if (occupiedInfo.occupied) {
        const ok = window.confirm(
          `A impressora escolhida parece estar em uso:\n\n${occupiedInfo.reasons.join(
            "\n",
          )}\n\nDeseja salvar a ordem mesmo assim?`,
        );
        if (!ok) return;
      }

      const payload: ProductionOrder = {
        id: draft.id ?? "", // para novo registro não enviamos id ao Supabase
        userId: user.id,
        productId: draft.productId,
        printerId: draft.printerId ?? null,
        quantity: draft.quantity,
        dueDate: draft.dueDate ?? null,
        status: draft.status,
        notes: draft.notes ?? null,
        printingStartedAt: computePrintingStartedAtForSave(previous, draft.status),
        // Para ordens existentes, preservamos createdAt anterior; para novas, usamos agora.
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      const saved = await upsertProductionOrder(user.id, {
        ...payload,
        // se for novo, remove o id para deixar o Supabase gerar o UUID
        id: draft.id ? payload.id : undefined as any,
      });
      setOrders((prev) => {
        const idx = prev.findIndex((o) => o.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });

      // Baixa automática: consumir insumos quando entrar em "Impressão"
      const cameFromPrinting = previous?.status === "printing";
      const goesToPrinting = saved.status === "printing";
      if (!cameFromPrinting && goesToPrinting) {
        // Não bloqueia o salvamento caso algo dê errado na baixa.
        consumeSuppliesForOrder(user.id, saved).catch(() => {});
      }

      // Atualiza "Peças produzidas" e redireciona quando entrar em "Concluída"
      const cameFromDone = previous?.status === "done";
      const goesToDone = saved.status === "done";
      if (!cameFromDone && goesToDone) {
        const prod = productsById.get(draft.productId);
        if (prod) {
          const ready = await ensureProductPricingForInventory(user.id, prod);
          upsertFromProduct(ready, saved.quantity, (ready.sku ?? "") || undefined);
        }
        router.push("/inventory");
      }
      closeModal();
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("invalid input syntax for type uuid")) {
        setError(
          "Não foi possível salvar esta ordem porque o identificador não é compatível com o banco. Crie uma nova ordem a partir do produto.",
        );
      } else {
        setError(msg || "Falha ao salvar ordem.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function advance(order: ProductionOrder) {
    const next = nextProductionOrderStatus(order.status);
    if (next === order.status || !user) return;
    try {
      // Se o próximo status for "Impressão", validamos o estoque antes de salvar.
      // Isso evita você avançar e consumir filamento que você já não tem.
      if (next === "printing") {
        setLoading(true);
        setError(null);

        const prodId = order.productId;
        const [mats, sups] = await Promise.all([
          listProductMaterials(user.id, prodId),
          listSupplies(user.id),
        ]);

        const suppliesById = new Map(sups.map((s) => [s.id, s] as const));
        const filamentDeficits: Array<{
          supplyName: string;
          required: number;
          available: number;
          unit: string;
        }> = [];

        for (const m of mats) {
          const supply = suppliesById.get(m.supplyId);
          if (!supply) continue;
          if (supply.category !== "filament") continue;

          const required = (m.qty ?? 0) * (order.quantity ?? 1);
          const available = supply.stockQty ?? 0;
          if (required > available) {
            filamentDeficits.push({
              supplyName: supply.name,
              required,
              available,
              unit: supply.unit,
            });
          }
        }

        if (filamentDeficits.length > 0) {
          const lines = filamentDeficits.map((d) => {
            const fmt = (n: number) =>
              n.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
            if (d.unit === "kg") {
              const reqG = d.required * 1000;
              const avG = d.available * 1000;
              return `${d.supplyName}: necessário ${fmt(reqG)} g, disponível ${fmt(avG)} g`;
            }
            return `${d.supplyName}: necessário ${fmt(d.required)} ${d.unit}, disponível ${fmt(
              d.available,
            )} ${d.unit}`;
          });
          setError(
            `Estoque de filamento baixo. Não é possível avançar para impressão.\n${lines.join("\n")}`,
          );
          setLoading(false);
          return;
        }

        setLoading(false);
      }

      const updated: ProductionOrder = {
        ...order,
        status: next,
        printingStartedAt: computePrintingStartedAtForSave(order, next),
      };
      const saved = await upsertProductionOrder(user.id, updated);
      setOrders((prev) => prev.map((o) => (o.id === saved.id ? saved : o)));

      // Baixa automática ao entrar em "Impressão" via botão Avançar
      const cameFromPrinting = order.status === "printing";
      const goesToPrinting = saved.status === "printing";
      if (!cameFromPrinting && goesToPrinting) {
        consumeSuppliesForOrder(user.id, saved).catch(() => {});
      }

      // Atualiza "Peças produzidas" e redireciona ao entrar em "Concluída"
      const cameFromDone = order.status === "done";
      const goesToDone = saved.status === "done";
      if (!cameFromDone && goesToDone) {
        const prod = productsById.get(order.productId);
        if (prod) {
          const ready = await ensureProductPricingForInventory(user.id, prod);
          upsertFromProduct(ready, saved.quantity, (ready.sku ?? "") || undefined);
        }

        router.push("/inventory");
      }
    } catch (e: any) {
      setError(e?.message ?? "Falha ao avançar status.");
    }
  }

  async function remove(order: ProductionOrder) {
    if (!user) return;
    const msg =
      order.status === "cancelled"
        ? "Excluir esta ordem cancelada do histórico? Ela deixará de aparecer no dashboard e nos gráficos."
        : "Remover esta ordem?";
    if (!window.confirm(msg)) return;
    try {
      await deleteProductionOrder(user.id, order.id);
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao remover ordem.");
    }
  }

  const columns = PRODUCTION_ORDER_PIPELINE;

  const cancelledOrdersList = useMemo(
    () => orders.filter((o) => o.status === "cancelled"),
    [orders],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">
            Painel de ordens
          </h1>
          <p className="text-sm text-slate-400">
            Visualize em que etapa cada pedido de produção está e o custo estimado.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400"
        >
          Nova ordem de produção
        </button>
      </div>

      {error && !modalOpen ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-3 xl:grid-cols-7">
        {columns.map((status) => {
          const colOrders = orders.filter((o) => o.status === status);
          const label = PRODUCTION_ORDER_STATUS_LABELS[status];
          const color =
            status === "new"
              ? "bg-slate-800 text-slate-100"
              : status === "preparing"
              ? "bg-amber-900/60 text-amber-200"
              : status === "queued"
              ? "bg-yellow-900/60 text-yellow-200"
              : status === "printing"
              ? "bg-blue-900/60 text-blue-200"
              : status === "post_processing"
              ? "bg-purple-900/60 text-purple-200"
              : status === "ready_to_ship"
              ? "bg-emerald-900/60 text-emerald-200"
              : "bg-slate-900/60 text-emerald-200";

          return (
            <div
              key={status}
              className="flex min-h-[260px] flex-col rounded-2xl border border-slate-800 bg-slate-950/60"
            >
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      status === "new"
                        ? "bg-slate-500"
                        : status === "preparing"
                        ? "bg-amber-400"
                        : status === "queued"
                        ? "bg-yellow-400"
                        : status === "printing"
                        ? "bg-blue-400"
                        : status === "post_processing"
                        ? "bg-purple-400"
                        : status === "ready_to_ship"
                        ? "bg-emerald-400"
                        : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {label.toUpperCase()}
                  </span>
                </div>
                <span className="text-[11px] text-slate-500">
                  {colOrders.length} ordem(s)
                </span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-2 py-2">
                {colOrders.length === 0 ? (
                  <p className="px-1 py-4 text-center text-[11px] text-slate-500">
                    Nenhuma ordem neste estágio.
                  </p>
                ) : (
                  colOrders.map((o) => {
                    const prod = productsById.get(o.productId);
                    const printer =
                      (o.printerId && printersById.get(o.printerId)) || null;
                    const cost = costs[o.id];
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => openEdit(o)}
                        className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-3 text-left text-xs text-slate-100 transition hover:border-cyan-500 hover:bg-slate-900"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-[13px] font-semibold">
                            {prod?.name ?? o.productId}
                          </div>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${color}`}
                          >
                            {o.quantity} un.
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {printer?.name
                            ? `Máquina: ${printer.name}`
                            : "Máquina: padrão do produto"}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">
                            Prazo: {o.dueDate ?? "Sem prazo"}
                          </span>
                          <span className="text-emerald-300">
                            {cost != null
                              ? cost.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: settings.currency ?? "BRL",
                                })
                              : "—"}
                          </span>
                        </div>
                        {o.notes ? (
                          <p className="mt-1 line-clamp-2 text-[11px] text-slate-300">
                            {o.notes}
                          </p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
                          <span>
                            Criada em{" "}
                            {new Date(o.createdAt).toLocaleString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              advance(o);
                            }}
                            className="rounded-full bg-cyan-600/80 px-2 py-0.5 text-[10px] font-semibold text-slate-950 hover:bg-cyan-500"
                          >
                            Avançar
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            remove(o);
                          }}
                          className="mt-1 text-[10px] text-rose-400 hover:text-rose-300"
                        >
                          Remover
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cancelledOrdersList.length > 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Ordens canceladas</h2>
          <p className="mt-1 text-xs text-slate-500">
            Não aparecem no quadro acima, mas ainda entram nos totais do dashboard até você excluir
            do histórico.
          </p>
          <ul className="mt-3 divide-y divide-slate-800/80">
            {cancelledOrdersList.map((o) => {
              const prod = productsById.get(o.productId);
              return (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-100">
                      {prod?.name ?? o.productId}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {o.quantity} un. · criada em{" "}
                      {new Date(o.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(o)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900"
                    >
                      Ver / editar
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(o)}
                      className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-200 hover:bg-rose-500/20"
                    >
                      Excluir do histórico
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {modalOpen && draft && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  {draft.id ? "Editar ordem" : "Nova ordem"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Defina produto, impressora e quantidade.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              {error ? (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-100 whitespace-pre-wrap">
                  {error}
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Produto
                </label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.productId}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            productId: e.target.value,
                          }
                        : d,
                    )
                  }
                  disabled={loading}
                >
                  {products.map((p) => {
                    const ok = isEligibleProductId.has(p.id);
                    return (
                      <option key={p.id} value={p.id} disabled={!ok}>
                        {p.name}
                        {!ok ? " (incompleto)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Impressora
                </label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.printerId ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            printerId: e.target.value || null,
                          }
                        : d,
                    )
                  }
                  disabled={loading}
                >
                  <option value="">Padrão do produto / não definido</option>
                  {printers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {printerOccupiedInModal.occupied ? (
                  <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    <p className="font-semibold text-amber-200">Aviso — impressora em uso</p>
                    <ul className="mt-1 list-inside list-disc space-y-0.5 text-amber-100/90">
                      {printerOccupiedInModal.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-amber-200/80">
                      Você ainda pode salvar; ao confirmar, será pedida uma confirmação extra.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={draft.quantity}
                    onChange={(e) =>
                      setDraft((d) =>
                        d
                          ? {
                              ...d,
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            }
                          : d,
                      )
                    }
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-300">
                    Prazo (opcional)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    value={draft.dueDate ?? ""}
                    onChange={(e) =>
                      setDraft((d) =>
                        d ? { ...d, dueDate: e.target.value || null } : d,
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Situação
                </label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((d) =>
                      d
                        ? {
                            ...d,
                            status: e.target.value as ProductionOrder["status"],
                          }
                        : d,
                    )
                  }
                  disabled={loading}
                >
                  {PRODUCTION_ORDER_STATUS_DISPLAY_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {PRODUCTION_ORDER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">
                  Notas (opcional)
                </label>
                <textarea
                  rows={3}
                  className="w-full resize-none rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.notes ?? ""}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, notes: e.target.value || null } : d,
                    )
                  }
                  disabled={loading}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-900"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
                  disabled={loading}
                >
                  Salvar ordem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

