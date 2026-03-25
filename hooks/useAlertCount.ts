"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { listSupplies, listProductionOrders } from "@/lib/supabaseProduction";

function startOfTodayLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function addDaysLocal(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function parseDateOnlyLocal(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

const DAYS_UNTIL_DUE = 3;

/**
 * Retorna o total de alertas ativos (estoque baixo + ordens atrasadas + vencendo em breve).
 * Usa a mesma lógica da página /alertas. O fetch é silencioso — nunca lança erro.
 */
export function useAlertCount(): number {
  const { user } = useAuthStore();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setCount(0);
      return;
    }

    let alive = true;

    Promise.all([listSupplies(userId), listProductionOrders(userId)])
      .then(([supplies, orders]) => {
        if (!alive) return;

        const lowStock = supplies.filter((s) => {
          const min = s.minStockQty ?? 0;
          return min > 0 && (s.stockQty ?? 0) <= min;
        }).length;

        const today = startOfTodayLocal();
        const dueSoonEnd = addDaysLocal(today, DAYS_UNTIL_DUE);
        const activeOrders = orders.filter(
          (o) => o.status !== "done" && o.status !== "cancelled",
        );

        let overdueCount = 0;
        let dueSoonCount = 0;
        for (const o of activeOrders) {
          if (!o.dueDate) continue;
          const d = parseDateOnlyLocal(o.dueDate);
          if (!d) continue;
          if (d < today) overdueCount++;
          else if (d <= dueSoonEnd) dueSoonCount++;
        }

        setCount(lowStock + overdueCount + dueSoonCount);
      })
      .catch(() => {
        /* badge é best-effort — falha silenciosa */
      });

    return () => {
      alive = false;
    };
  }, [user?.id]);

  return count;
}
