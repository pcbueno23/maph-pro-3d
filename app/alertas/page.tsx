"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductionOrder, SupplyItem } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { listProductionOrders, listSupplies } from "@/lib/supabaseProduction";

function parseDateOnlyLocal(isoDate: string) {
  // isoDate: YYYY-MM-DD
  const [y, m, d] = isoDate.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function startOfTodayLocal(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function addDaysLocal(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDateBR(isoDate: string) {
  const dt = parseDateOnlyLocal(isoDate);
  if (!dt) return isoDate;
  return dt.toLocaleDateString("pt-BR");
}

function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function diffDaysLocal(from: Date, to: Date) {
  const msDay = 24 * 60 * 60 * 1000;
  return Math.round((to.getTime() - from.getTime()) / msDay);
}

export default function AlertasPage() {
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [supplies, setSupplies] = useState<SupplyItem[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [daysUntilDue, setDaysUntilDue] = useState(3);

  // Notificações (mvp): browser Notifications (não é "push" real em background).
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [notifEnabled, setNotifEnabled] = useState(false);

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p] as const)), [products]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;

    let alive = true;
    setLoading(true);
    setError(null);

    Promise.all([listSupplies(userId), listProductionOrders(userId), fetchUserProducts(userId)])
      .then(([sup, ords, prods]) => {
        if (!alive) return;
        setSupplies(sup);
        setOrders(ords);
        setProducts(prods);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(e?.message ?? "Falha ao carregar alertas.");
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const lowStock = useMemo(() => {
    return supplies.filter((s) => {
      const min = s.minStockQty ?? 0;
      if (min <= 0) return false;
      return (s.stockQty ?? 0) <= min;
    });
  }, [supplies]);

  const today = useMemo(() => startOfTodayLocal(new Date()), []);
  const dueSoonEnd = useMemo(() => addDaysLocal(today, Math.max(0, daysUntilDue)), [today, daysUntilDue]);

  const relevantOrders = useMemo(() => {
    // não alertar ordens finalizadas/canceladas
    return orders.filter((o) => o.status !== "done" && o.status !== "cancelled");
  }, [orders]);

  const overdueOrders = useMemo(() => {
    const res: ProductionOrder[] = [];
    for (const o of relevantOrders) {
      if (!o.dueDate) continue;
      const d = parseDateOnlyLocal(o.dueDate);
      if (!d) continue;
      if (d < today) res.push(o);
    }
    return res;
  }, [relevantOrders, today]);

  const dueSoonOrders = useMemo(() => {
    const res: ProductionOrder[] = [];
    for (const o of relevantOrders) {
      if (!o.dueDate) continue;
      const d = parseDateOnlyLocal(o.dueDate);
      if (!d) continue;
      if (d >= today && d <= dueSoonEnd) res.push(o);
    }
    return res;
  }, [relevantOrders, today, dueSoonEnd]);

  const supportsNotification =
    typeof window !== "undefined" && "Notification" in window && typeof window.Notification === "function";

  useEffect(() => {
    if (!supportsNotification) return;
    setNotifPermission(Notification.permission);

    try {
      const raw = window.localStorage.getItem("precifica3d-alerts-notif-enabled");
      setNotifEnabled(raw === "true");
    } catch {
      // ignore
    }
  }, [supportsNotification]);

  function buildNotificationBody() {
    const lowTop = lowStock.slice(0, 3).map((s) => `${s.name} (${s.stockQty} ${s.unit})`).join(", ");
    const overTop = overdueOrders
      .slice(0, 3)
      .map((o) => `${productsById.get(o.productId)?.name ?? o.productId} (${o.dueDate})`)
      .join(", ");

    const soonTop = dueSoonOrders
      .slice(0, 3)
      .map((o) => `${productsById.get(o.productId)?.name ?? o.productId} (${o.dueDate})`)
      .join(", ");

    const parts: string[] = [];
    if (overdueOrders.length > 0) parts.push(`Atrasadas: ${overdueOrders.length} (${overTop})`);
    if (dueSoonOrders.length > 0) parts.push(`Próximas: ${dueSoonOrders.length} (${soonTop})`);
    if (lowStock.length > 0) parts.push(`Baixo estoque: ${lowStock.length} (${lowTop})`);
    return parts.join("\n");
  }

  function maybeShowNotifications(opts?: { force?: boolean }) {
    const force = opts?.force ?? false;
    if (!supportsNotification) return;
    // "Testar agora" deve funcionar mesmo se o usuário ainda não clicou para habilitar
    // (ou se o valor do localStorage não estiver sincronizado).
    if (!notifEnabled && !force) return;
    if (Notification.permission !== "granted") {
      if (force) setError(`Permissão do navegador: ${Notification.permission}. Ative e permita nas configurações do site.`);
      return;
    }

    const now = Date.now();
    const storageKey = "precifica3d-alerts-notif-last-at";

    let lastAt = 0;
    try {
      const raw = window.localStorage.getItem(storageKey);
      lastAt = raw ? Number(raw) : 0;
    } catch {
      // ignore
    }

    // evita spam: 1 notificação por hora quando o usuário estiver no `/alertas`
    if (!force && now - lastAt < 60 * 60 * 1000) return;

    const body = buildNotificationBody();
    if (!body.trim()) {
      if (force) setError("Não há alertas para notificar agora.");
      return;
    }

    try {
      // Tag única para garantir que o navegador não substitua silenciosamente.
      // eslint-disable-next-line no-new
      new Notification("MAPH PRO 3D - Alertas", {
        body: buildNotificationBody(),
        tag: `precifica3d-alerts-${now}`,
      });

      window.localStorage.setItem(storageKey, String(now));
    } catch {
      if (force) setError("Falha ao criar notificação. Verifique se pop-ups/notifications estão bloqueados no navegador.");
    }
  }

  useEffect(() => {
    // Ao navegar/abrir a página, mostra no máximo 1 notificação por hora.
    if (!loading) maybeShowNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lowStock.length, overdueOrders.length, dueSoonOrders.length, notifEnabled, notifPermission]);

  async function requestNotificationPermission() {
    if (!supportsNotification) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      const enabled = perm === "granted";
      setNotifEnabled(enabled);
      try {
        window.localStorage.setItem("precifica3d-alerts-notif-enabled", String(enabled));
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-50 md:text-2xl">Alertas</h1>
          <p className="mt-1 text-sm text-slate-400">
            Estoque baixo e ordens vencendo/atrasadas.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/insumos"
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:opacity-60"
          >
            Ver insumos
          </Link>
          <Link
            href="/ordens"
            className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:opacity-60"
          >
            Ver ordens
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Baixo estoque</p>
          <p className="mt-2 text-lg font-semibold text-amber-300">{lowStock.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Atrasadas</p>
          <p className="mt-2 text-lg font-semibold text-rose-300">{overdueOrders.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Vencendo (próx. {daysUntilDue} dias)
          </p>
          <p className="mt-2 text-lg font-semibold text-cyan-300">{dueSoonOrders.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Estoque baixo
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Carregando...</p>
          ) : lowStock.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhum insumo abaixo do mínimo.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-2 py-2">Insumo</th>
                    <th className="px-2 py-2">Estoque</th>
                    <th className="px-2 py-2">Mínimo</th>
                    <th className="px-2 py-2">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {lowStock.slice(0, 10).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/60">
                      <td className="px-2 py-2 text-slate-100">{s.name}</td>
                      <td className="px-2 py-2 text-amber-300">
                        {Number(s.stockQty).toLocaleString("pt-BR")} {s.unit}
                      </td>
                      <td className="px-2 py-2 text-slate-300">
                        {Number(s.minStockQty ?? 0).toLocaleString("pt-BR")} {s.unit}
                      </td>
                      <td className="px-2 py-2 text-slate-100">
                        {formatBRL((s.stockQty ?? 0) * (s.unitCost ?? 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lowStock.length > 10 ? (
                <p className="mt-2 text-[11px] text-slate-500">Mostrando 10 de {lowStock.length}.</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Ordens vencendo/atrasadas
            </p>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-400">Próx.</label>
              <input
                type="number"
                min={0}
                max={30}
                step={1}
                className="w-20 rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={daysUntilDue}
                onChange={(e) => setDaysUntilDue(Math.max(0, Number(e.target.value) || 0))}
              />
              <label className="text-[11px] text-slate-400">dias</label>
            </div>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Carregando...</p>
          ) : overdueOrders.length === 0 && dueSoonOrders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhuma ordem com prazo crítico.</p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-300">
                  Atrasadas
                </p>
                {overdueOrders.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">—</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Produto</th>
                          <th className="px-2 py-2">Prazo</th>
                          <th className="px-2 py-2">Qtd</th>
                          <th className="px-2 py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {overdueOrders.slice(0, 8).map((o) => (
                          <tr key={o.id} className="hover:bg-slate-900/60">
                            <td className="px-2 py-2 text-slate-100">{productsById.get(o.productId)?.name ?? o.productId}</td>
                            <td className="px-2 py-2 text-rose-300">{o.dueDate ? formatDateBR(o.dueDate) : "—"}</td>
                            <td className="px-2 py-2 text-slate-300">{o.quantity}</td>
                            <td className="px-2 py-2 text-slate-400">{o.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {overdueOrders.length > 8 ? (
                      <p className="mt-2 text-[11px] text-slate-500">Mostrando 8 de {overdueOrders.length}.</p>
                    ) : null}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Vencendo
                </p>
                {dueSoonOrders.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">—</p>
                ) : (
                  <div className="mt-2 overflow-x-auto">
                    <table className="min-w-full text-left text-xs">
                      <thead className="border-b border-slate-800 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <tr>
                          <th className="px-2 py-2">Produto</th>
                          <th className="px-2 py-2">Prazo</th>
                          <th className="px-2 py-2">Em</th>
                          <th className="px-2 py-2">Qtd</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {dueSoonOrders.slice(0, 8).map((o) => {
                          const d = o.dueDate ? parseDateOnlyLocal(o.dueDate) : null;
                          const days = d ? diffDaysLocal(today, d) : null;
                          return (
                            <tr key={o.id} className="hover:bg-slate-900/60">
                              <td className="px-2 py-2 text-slate-100">
                                {productsById.get(o.productId)?.name ?? o.productId}
                              </td>
                              <td className="px-2 py-2 text-slate-300">{o.dueDate ? formatDateBR(o.dueDate) : "—"}</td>
                              <td className="px-2 py-2 text-cyan-300">
                                {days != null ? `${days} dia(s)` : "—"}
                              </td>
                              <td className="px-2 py-2 text-slate-300">{o.quantity}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {dueSoonOrders.length > 8 ? (
                      <p className="mt-2 text-[11px] text-slate-500">Mostrando 8 de {dueSoonOrders.length}.</p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Notificações no navegador (opcional)
        </p>
        <p className="mt-2 text-sm text-slate-300">
          Usa a API `Notification` do navegador. Para push real em background, precisaríamos de Web Push + backend/worker.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!supportsNotification ? (
            <p className="text-sm text-slate-400">Seu navegador não suporta notificações.</p>
          ) : notifEnabled ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setNotifEnabled(false);
                  try {
                    window.localStorage.setItem("precifica3d-alerts-notif-enabled", "false");
                  } catch {
                    // ignore
                  }
                }}
                className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-900/60 disabled:opacity-60"
              >
                Desativar
              </button>
              <button
                type="button"
                onClick={() => maybeShowNotifications({ force: true })}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
              >
                Testar agora
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={requestNotificationPermission}
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-neon-cyan transition hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-60"
            >
              Ativar notificações
            </button>
          )}

          <p className="text-xs text-slate-500">
            Permissão atual: <span className="text-slate-300">{notifPermission}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

