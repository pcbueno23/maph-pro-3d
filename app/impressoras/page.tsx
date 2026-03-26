"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import type { Printer, PrinterStatus } from "@/types";
import { deletePrinter, listPrinters, upsertPrinter } from "@/lib/supabaseProduction";
import { useSettingsStore } from "@/store/settingsStore";
import { saveUserSettings } from "@/lib/supabaseUserData";

type DraftPrinter = {
  id?: string;
  name: string;
  model?: string;
  powerW: number;
  energyRateBrlKwh: number;
  status: PrinterStatus;
  purchaseValue?: number;
  usefulLifeHours?: number;
  annualMaintenance?: number | "";
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
      powerW: 0,
      energyRateBrlKwh: 0,
      status: "available",
      purchaseValue: 0,
      usefulLifeHours: 0,
      annualMaintenance: "",
    };
  }
  return {
    id: p.id,
    name: p.name,
    model: p.model ?? "",
    powerW: p.powerW ?? 0,
    energyRateBrlKwh: p.energyRateBrlKwh ?? 0,
    status: p.status ?? "available",
    purchaseValue: p.purchaseValue ?? 0,
    usefulLifeHours: p.usefulLifeHours ?? 0,
    annualMaintenance: p.annualMaintenance == null ? "" : Number(p.annualMaintenance),
  };
}

export default function ImpressorasPage() {
  const user = useAuthStore((s) => s.user);
  const { settings, updateSettings } = useSettingsStore();
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftPrinter>(() => toDraft(null));

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
      const items = await listPrinters(user.id);
      setPrinters(items);
    } catch (e: any) {
      setError(e?.message ?? "Falha ao carregar impressoras.");
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
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
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
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-neon-cyan" style={{ maxHeight: "calc(100dvh - 5rem)" }}>
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
                  onChange={(e) => setDraft((d) => ({ ...d, powerW: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Tarifa (R$/kWh)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.energyRateBrlKwh}
                  onChange={(e) => setDraft((d) => ({ ...d, energyRateBrlKwh: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Valor de compra (R$)</label>
                <input
                  type="number"
                  step="10"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.purchaseValue}
                  onChange={(e) => setDraft((d) => ({ ...d, purchaseValue: Number(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-300">Vida útil estimada (h)</label>
                <input
                  type="number"
                  step="10"
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  value={draft.usefulLifeHours}
                  onChange={(e) => setDraft((d) => ({ ...d, usefulLifeHours: Number(e.target.value) || 0 }))}
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
    </div>
  );
}

