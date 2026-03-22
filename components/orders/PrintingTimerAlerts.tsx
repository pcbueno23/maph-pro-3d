"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product, ProductionOrder } from "@/types";

const WARN_BEFORE_MS = 5 * 60 * 1000;

function sessionKey(orderId: string, phase: "warn" | "end") {
  return `printing-alert-${phase}-${orderId}`;
}

export type PrintingAlertPayload = {
  phase: "warn" | "end";
  orderId: string;
  productName: string;
};

type Props = {
  orders: ProductionOrder[];
  productsById: Map<string, Product>;
};

/**
 * Avisos em modal quando a ordem está em "Em impressão":
 * ~5 min antes do fim do tempo estimado (ficha técnica × quantidade) e no término.
 */
export function PrintingTimerAlerts({ orders, productsById }: Props) {
  const [current, setCurrent] = useState<PrintingAlertPayload | null>(null);
  const queueRef = useRef<PrintingAlertPayload[]>([]);

  const enqueue = useCallback(
    (payload: PrintingAlertPayload) => {
      if (typeof window === "undefined") return;
      const key = sessionKey(payload.orderId, payload.phase);
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");

      setCurrent((c) => {
        if (c) {
          queueRef.current.push(payload);
          return c;
        }
        return payload;
      });
    },
    [],
  );

  const dismiss = useCallback(() => {
    setCurrent(() => queueRef.current.shift() ?? null);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const timerIds: number[] = [];

    for (const o of orders) {
      if (o.status !== "printing" || !o.printingStartedAt) continue;
      const prod = productsById.get(o.productId);
      const minutesPerUnit = prod?.printTimeMinutes;
      if (minutesPerUnit == null || !Number.isFinite(minutesPerUnit) || minutesPerUnit <= 0) {
        continue;
      }

      const qty = Math.max(1, Number(o.quantity) || 1);
      const totalMs = minutesPerUnit * qty * 60 * 1000;
      const started = new Date(o.printingStartedAt).getTime();
      if (!Number.isFinite(started)) continue;

      const end = started + totalMs;
      const warnAt = Math.max(started, end - WARN_BEFORE_MS);
      const productName = prod?.name ?? "Produto";

      const schedule = (fireAt: number, phase: "warn" | "end") => {
        const delay = Math.max(0, fireAt - Date.now());
        const id = window.setTimeout(() => {
          enqueue({ phase, orderId: o.id, productName });
        }, delay);
        timerIds.push(id);
      };

      schedule(warnAt, "warn");
      schedule(end, "end");
    }

    return () => {
      for (const id of timerIds) window.clearTimeout(id);
    };
  }, [orders, productsById, enqueue]);

  /** Abriu a página atrasado: dispara avisos já devidos (uma vez por sessão). */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    for (const o of orders) {
      if (o.status !== "printing" || !o.printingStartedAt) continue;
      const prod = productsById.get(o.productId);
      const minutesPerUnit = prod?.printTimeMinutes;
      if (minutesPerUnit == null || !Number.isFinite(minutesPerUnit) || minutesPerUnit <= 0) {
        continue;
      }
      const qty = Math.max(1, Number(o.quantity) || 1);
      const totalMs = minutesPerUnit * qty * 60 * 1000;
      const started = new Date(o.printingStartedAt).getTime();
      if (!Number.isFinite(started)) continue;
      const end = started + totalMs;
      const warnAt = Math.max(started, end - WARN_BEFORE_MS);
      const productName = prod?.name ?? "Produto";

      if (now >= end) {
        enqueue({ phase: "end", orderId: o.id, productName });
      } else if (now >= warnAt) {
        enqueue({ phase: "warn", orderId: o.id, productName });
      }
    }
  }, [orders, productsById, enqueue]);

  return (
    <>
      {current ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-950 p-6 shadow-2xl shadow-cyan-500/20"
          >
            <h2 className="text-lg font-semibold text-slate-50">
              {current.phase === "warn"
                ? "Impressão quase no fim"
                : "Tempo de impressão encerrado"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              {current.phase === "warn" ? (
                <>
                  Faltam cerca de <strong className="text-amber-300">5 minutos</strong> para o
                  estimado de impressão terminar para{" "}
                  <strong className="text-cyan-200">{current.productName}</strong>{" "}
                  (tempo da ficha técnica × quantidade da ordem).
                </>
              ) : (
                <>
                  O tempo estimado de impressão para{" "}
                  <strong className="text-cyan-200">{current.productName}</strong> foi concluído.
                  Confira a peça na máquina antes de avançar a ordem.
                </>
              )}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={dismiss}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-cyan hover:from-cyan-400 hover:to-emerald-400"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
