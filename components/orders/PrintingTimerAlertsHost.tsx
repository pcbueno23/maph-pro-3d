"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { Product, ProductionOrder } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
  dismissPrintingPushPrompt,
  printingNotificationsSupported,
  requestPrintingNotificationPermission,
  wasPrintingPushPromptDismissed,
} from "@/lib/printingPushNotifications";
import { listProductionOrders } from "@/lib/supabaseProduction";
import { fetchUserProducts } from "@/lib/supabaseProducts";
import { PrintingTimerAlerts } from "./PrintingTimerAlerts";

const POLL_MS = 45_000;

/**
 * Carrega ordens/produtos para os avisos de impressão em qualquer rota (montado no layout).
 */
export function PrintingTimerAlertsHost() {
  const user = useAuthStore((s) => s.user);
  const pathname = usePathname();
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  const load = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    try {
      const [o, p] = await Promise.all([
        listProductionOrders(uid),
        fetchUserProducts(uid),
      ]);
      setOrders(o);
      setProducts(p);
    } catch {
      // mantém último estado; não bloqueia UI
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setProducts([]);
      return;
    }
    let alive = true;
    void load();
    const interval = window.setInterval(() => {
      if (alive) void load();
    }, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id, load]);

  useEffect(() => {
    if (!user?.id) return;
    void load();
  }, [pathname, user?.id, load]);

  useEffect(() => {
    if (!user?.id) return;
    if (!printingNotificationsSupported()) return;
    if (typeof Notification !== "undefined" && Notification.permission !== "default") return;
    if (wasPrintingPushPromptDismissed()) return;
    setShowNotifPrompt(true);
  }, [user?.id]);

  const productsById = useMemo(
    () => new Map(products.map((p) => [p.id, p] as const)),
    [products],
  );

  if (!user) return null;

  return (
    <>
      <PrintingTimerAlerts orders={orders} productsById={productsById} />
      {showNotifPrompt ? (
        <div className="fixed bottom-4 right-4 z-[99] max-w-sm rounded-xl border border-cyan-500/30 bg-slate-900/95 p-4 shadow-xl shadow-cyan-500/10 backdrop-blur-sm md:bottom-6 md:right-6">
          <p className="text-sm font-medium text-slate-100">
            Notificações de impressão
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Ative para receber avisos no sistema (barra de notificações) quando faltar ~5 min ou
            acabar o tempo estimado — útil com a aba em segundo plano.
          </p>
          <div className="mt-3 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                dismissPrintingPushPrompt();
                setShowNotifPrompt(false);
              }}
              className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
            >
              Agora não
            </button>
            <button
              type="button"
              onClick={async () => {
                await requestPrintingNotificationPermission();
                setShowNotifPrompt(false);
              }}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:from-cyan-400 hover:to-emerald-400"
            >
              Ativar
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
