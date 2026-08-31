"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import type { Printer, PrinterMaintenanceLog, PrinterStatus, Product, ProductionOrder } from "@/types";
import {
  addMaintenanceLog,
  deleteMaintenanceLog,
  deletePrinter,
  listAllMaintenanceLogs,
  listPrinters,
  listProductionOrders,
  upsertPrinter,
} from "@/lib/supabaseProduction";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { computeHoursSincePrinterMaintenance } from "@/lib/printerMaintenance";
import { useSettingsStore } from "@/store/settingsStore";
import { saveUserSettings } from "@/lib/supabaseUserData";

type DraftPrinter = {
  id?: string;
  name: string;
  model?: string;
  powerW: number | "";
  energyRateBrlKwh: number | "";
  status: PrinterStatus;
  purchaseValue: number | "";
  usefulLifeHours: number | "";
  annualMaintenance: number | "";
  maintenanceAlertHours: number | "";
};

function normalizeNumber(value: unknown, fallback = 0) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function generateUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function toDraft(p?: Printer | null): DraftPrinter {
  if (!p) {
    return {
      name: "",
      model: "",
      powerW: "",
      energyRateBrlKwh: "",
      status: "available",
      purchaseValue: "",
      usefulLifeHours: "",
      annualMaintenance: "",
      maintenanceAlertHours: "",
    };
  }
  return {
    id: p.id,
    name: p.name,
    model: p.model ?? "",
    powerW: p.powerW ?? "",
    energyRateBrlKwh: p.energyRateBrlKwh ?? "",
    status: p.status ?? "available",
    purchaseValue: p.purchaseValue ?? "",
    usefulLifeHours: p.usefulLifeHours ?? "",
    annualMaintenance: p.annualMaintenance == null ? "" : Number(p.annualMaintenance),
    maintenanceAlertHours: p.maintenanceAlertHours == null ? "" : Number(p.maintenanceAlertHours),
  };
}

export default function ImpressorasPage() {
  const user = useAuthStore((s) => s.user);
  const { settings, updateSettings } = useSettingsStore();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<PrinterMaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPrinter>(() => toDraft(null));

  const [maintPrinter, setMaintPrinter] = useState<Printer | null>(null);
  const [maintDate, setMaintDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [maintType, setMaintType] = useState("");
  const [maintCost, setMaintCost] = useState<number | "">("");
  const [maintNotes, setMaintNotes] = useState("");
  const [maintSaving, setMaintSaving] = useState(false);
  const [maintError, setMaintError] = useState<string | null>(null);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const lastMaintenanceByPrinter = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of maintenanceLogs) {
      const current = map.get(log.printerId);
      if (!current || log.performedAt > current) map.set(log.printerId, log.performedAt);
    }
    return map;
  }, [maintenanceLogs]);

  const hoursSinceByPrinter = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of printers) {
      map.set(
        p.id,
        computeHoursSincePrinterMaintenance(p.id, lastMaintenanceByPrinter.get(p.id) ?? null, orders, productById),
      );
    }
    return map;
  }, [printers, orders, productById, lastMaintenanceByPrinter]);

  const canUseSupabase = Boolean(user);

  const statusLabels: Record<PrinterStatus, string> = useMemo(
    () => ({
      available: "Disponível",
      busy: "Em uso",
      maintenance: "Manutenção",
      offline: "Offline",
    }),
    [],
  );

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [items, ord, prods, logs] = await Promise.all([
        listPrinters(user.id),
        listProductionOrders(user.id),
        fetchUserProducts(user.id),
        listAllMaintenanceLogs(user.id),
      ]);
      setPrinters(items);
      setOrders(ord);
      setProducts(prods);
      setMaintenanceLogs(logs);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      setError(
        msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network")
          ? "Sem conexão com o servidor. Verifique sua internet e tente novamente."
          : "Falha ao carregar impressoras. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const openCreate = () => {
    setDraft({
      ...toDraft(null),
      annualMaintenance: settings.defaults.annualMaintenance > 0 ? settings.defaults.annualMaintenance : "",
    });
    setOpen(true);
  };

  const openEdit = (p: Printer) => {
    setDraft(toDraft(p));
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    setDraft(toDraft(null));
  };

  const save = async () => {
    if (!user) return;
    const name = draft.name.trim();
    if (!name) {
      setError("Informe o nome da impressora.");
      return;
    }

    const nowIso = new Date().toISOString();
    const payload: Omit<Printer, "userId"> = {
      id: draft.id ?? generateUuid(),
      name,
      model: (draft.model ?? "").trim() || null,
      powerW: Math.max(0, normalizeNumber(draft.powerW, 0)),
      energyRateBrlKwh: Math.max(0, normalizeNumber(draft.energyRateBrlKwh, 0)),
      status: draft.status,
      purchaseValue: Math.max(0, normalizeNumber(draft.purchaseValue, 0)),
      usefulLifeHours: Math.max(0, normalizeNumber(draft.usefulLifeHours, 0)),
      annualMaintenance:
        draft.annualMaintenance === ""
          ? null
          : Math.max(0, normalizeNumber(draft.annualMaintenance, 0)),
      maintenanceAlertHours:
        draft.maintenanceAlertHours === ""
          ? null
          : Math.max(0, normalizeNumber(draft.maintenanceAlertHours, 0)),
      createdAt: draft.id ? nowIso : nowIso,
      updatedAt: nowIso,
    };

    setLoading(true);
    setError(null);
    try {
      const saved = await upsertPrinter(user.id, payload);
      setPrinters((prev) => {
        const idx = prev.findIndex((x) => x.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      close();
    } catch (e: any) {
      setError(e?.message ?? "Falha ao salvar impressora.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (p: Printer) => {
    if (!user) return;
    const ok = typeof window !== "undefined" ? window.confirm(`Remover "${p.name}"?`) : false;
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deletePrinter(user.id, p.id);
      setPrinters((prev) => prev.filter((x) => x.id !== p.id));
    } catch (e: any) {
      setError(e?.message ?? "Falha ao remover impressora.");
    } finally {
      setLoading(false);
    }
  };

  const openMaintenance = (p: Printer) => {
    setMaintPrinter(p);
    setMaintDate(new Date().toISOString().slice(0, 10));
    setMaintType("");
    setMaintCost("");
    setMaintNotes("");
    setMaintError(null);
  };

  const closeMaintenance = () => setMaintPrinter(null);

  const handleAddMaintenance = async () => {
    if (!user || !maintPrinter) return;
    const type = maintType.trim();
    if (!type) {
      setMaintError("Informe o tipo de manutenção.");
      return;
    }
    setMaintSaving(true);
    setMaintError(null);
    try {
      const log = await addMaintenanceLog(user.id, {
        printerId: maintPrinter.id,
        performedAt: maintDate,
        type,
        cost: maintCost === "" ? null : Number(maintCost),
        notes: maintNotes.trim() || null,
      });
      setMaintenanceLogs((prev) => [log, ...prev]);
      setMaintType("");
      setMaintCost("");
      setMaintNotes("");
    } catch (e: any) {
      setMaintError(e?.message ?? "Falha ao registrar manutenção.");
    } finally {
      setMaintSaving(false);
    }
  };

  const handleRemoveMaintenance = async (logId: string) => {
    if (!user) return;
    try {
      await deleteMaintenanceLog(user.id, logId);
      setMaintenanceLogs((prev) => prev.filter((l) => l.id !== logId));
    } catch {
      // mantém o log na tela se falhar — usuário pode tentar de novo
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Impressoras</h1>
          <p className="mt-1 text-sm text-slate-400">
            Cadastre suas impressoras para usar energia e depreciação nos custos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
          disabled={!canUseSupabase}
          title={!canUseSupabase ? "Faça login para gerenciar impressoras." : undefined}
        >
          Nova impressora
        </button>
      </div>

      {!canUseSupabase ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
          Você precisa estar logado para cadastrar impressoras.
        </div>
      ) : null}

      {error ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 rounded-lg border border-rose-500/30 px-3 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20"
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
        {loading && printers.length === 0 ? (
          <p className="text-slate-400">Carregando...</p>
        ) : printers.length === 0 ? (
          <p className="text-slate-400">Nenhuma impressora cadastrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                <tr>
                  <th className="px-2 py-2">Padrão</th>
                  <th className="px-2 py-2">Nome</th>
                  <th className="px-2 py-2">Modelo</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Potência</th>
                  <th className="px-2 py-2">Tarifa</th>
                  <th className="px-2 py-2">Compra</th>
                  <th className="px-2 py-2">Vida útil</th>
                  <th className="px-2 py-2">Manutenção</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {printers.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/60">
                    <td className="px-2 py-2">
                      <input
                        type="radio"
                        name="defaultCalculatorPrinter"
                        checked={(settings.printer?.defaultPrinterId ?? "") === p.id}
                        onChange={() => {
                          const merged = {
                            ...settings,
                            printer: {
                              ...settings.printer,
                              defaultPrinterId: p.id,
                            },
                          } as any;
                          updateSettings(merged);
                          if (user) {
                            saveUserSettings(user.id, merged).catch(() => {});
                          }
                        }}
                        title="Usar como padrão na calculadora"
                      />
                    </td>
                    <td className="px-2 py-2 text-slate-100">{p.name}</td>
                    <td className="px-2 py-2 text-slate-300">{p.model ?? "-"}</td>
                    <td className="px-2 py-2 text-slate-300">{statusLabels[p.status]}</td>
                    <td className="px-2 py-2 text-slate-100">{p.powerW?.toFixed(0)} W</td>
                    <td className="px-2 py-2 text-slate-100">
                      {Number(p.energyRateBrlKwh ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                      /kWh
                    </td>
                    <td className="px-2 py-2 text-slate-100">
                      {Number(p.purchaseValue ?? 0).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-2 py-2 text-slate-100">{Number(p.usefulLifeHours ?? 0)} h</td>
                    <td className="px-2 py-2">
                      {(() => {
                        const hours = hoursSinceByPrinter.get(p.id) ?? 0;
                        const alert = p.maintenanceAlertHours != null && hours >= p.maintenanceAlertHours;
                        const lastAt = lastMaintenanceByPrinter.get(p.id);
                        return (
                          <button
                            type="button"
                            onClick={() => openMaintenance(p)}
                            className={`rounded-lg border px-2 py-1 text-[11px] font-medium ${
                              alert
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-600"
                            }`}
                            title={lastAt ? `Última manutenção: ${new Date(lastAt).toLocaleDateString("pt-BR")}` : "Sem manutenção registrada"}
                          >
                            {Math.round(hours)}h{alert ? " ⚠" : ""}
                          </button>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="mr-3 text-xs text-cyan-400 hover:text-cyan-300"
                        disabled={loading}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(p)}
                        className="text-xs text-rose-400 hover:text-rose-300 disabled:opacity-60"
                        disabled={loading}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div className="w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan" style={{ maxHeight: "calc(100dvh - 9rem)" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">
                  {draft.id ? "Editar impressora" : "Nova impressora"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Configure energia e depreciação para o cálculo de custos.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
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

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">Modelo (opcional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.model ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Status</label>
                <select
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.status}
                  onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as PrinterStatus }))}
                >
                  <option value="available">Disponível</option>
                  <option value="busy">Em uso</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Potência (W)</label>
                <input
                  type="number"
                  step="1"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.powerW}
                  onChange={(e) => setDraft((d) => ({ ...d, powerW: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Tarifa (R$/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.energyRateBrlKwh}
                  onChange={(e) => setDraft((d) => ({ ...d, energyRateBrlKwh: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Valor de compra (R$)</label>
                <input
                  type="number"
                  step="10"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.purchaseValue}
                  onChange={(e) => setDraft((d) => ({ ...d, purchaseValue: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Vida útil estimada (h)</label>
                <input
                  type="number"
                  step="10"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.usefulLifeHours}
                  onChange={(e) => setDraft((d) => ({ ...d, usefulLifeHours: e.target.value === "" ? "" : Number(e.target.value) }))}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">
                  Manutenção anual (R$) (opcional)
                </label>
                <input
                  type="number"
                  step="10"
                  placeholder="Ex: 600"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.annualMaintenance}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      annualMaintenance:
                        e.target.value === "" ? "" : Number(e.target.value) || 0,
                    }))
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Usado na depreciação/hora da calculadora para esta impressora.
                  Se deixar vazio, considera R$ 0,00.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">
                  Alertar manutenção após (horas de impressão) (opcional)
                </label>
                <input
                  type="number"
                  step="10"
                  placeholder="Ex: 500"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.maintenanceAlertHours}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      maintenanceAlertHours: e.target.value === "" ? "" : Number(e.target.value) || 0,
                    }))
                  }
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  O botão "Manutenção" na lista fica destacado quando as horas de impressão
                  desde a última manutenção registrada passarem desse valor.
                </p>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={save}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {maintPrinter ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 pb-20 lg:pb-4">
          <div
            className="w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan"
            style={{ maxHeight: "calc(100dvh - 9rem)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-50">Manutenção — {maintPrinter.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {Math.round(hoursSinceByPrinter.get(maintPrinter.id) ?? 0)}h de impressão desde a última
                  manutenção registrada.
                </p>
              </div>
              <button
                type="button"
                onClick={closeMaintenance}
                className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-900"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-slate-300">Data</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Tipo</label>
                <input
                  type="text"
                  placeholder="Ex: Troca de bico, nivelamento..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Custo (R$) (opcional)</label>
                <input
                  type="number"
                  step="1"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value === "" ? "" : Number(e.target.value))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-slate-300">Notas (opcional)</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={maintNotes}
                  onChange={(e) => setMaintNotes(e.target.value)}
                />
              </div>
            </div>

            {maintError ? <p className="mt-2 text-xs text-rose-400">{maintError}</p> : null}

            <button
              type="button"
              onClick={() => void handleAddMaintenance()}
              disabled={maintSaving}
              className="mt-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
            >
              {maintSaving ? "Salvando..." : "Registrar manutenção"}
            </button>

            <div className="mt-5 border-t border-slate-800 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Histórico</p>
              {maintenanceLogs.filter((l) => l.printerId === maintPrinter.id).length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">Nenhuma manutenção registrada ainda.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-xs">
                  {maintenanceLogs
                    .filter((l) => l.printerId === maintPrinter.id)
                    .map((l) => (
                      <li
                        key={l.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
                      >
                        <span className="text-slate-200">
                          {new Date(l.performedAt).toLocaleDateString("pt-BR")} — {l.type}
                          {l.cost != null ? ` · ${l.cost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}
                          {l.notes ? <span className="ml-1 text-slate-500">({l.notes})</span> : null}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleRemoveMaintenance(l.id)}
                          className="shrink-0 text-[11px] text-rose-400 hover:text-rose-300"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

