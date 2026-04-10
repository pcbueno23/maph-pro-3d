"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShopeeInputs, ShopeeResult } from "@/lib/engines/shopee/engine";
import { buildShopeePrintHtml } from "@/lib/printReport";

export default function PrintShopeePage() {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const key = useMemo(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("key");
  }, []);

  useEffect(() => {
    if (!key) return;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      setStatus("error");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        productName?: string;
        inputs: ShopeeInputs;
        result: ShopeeResult | null;
      };
      const built = buildShopeePrintHtml(parsed);
      window.sessionStorage.removeItem(key);
      document.open();
      document.write(built);
      document.close();
      setStatus("ready");
      setTimeout(() => window.print(), 50);
    } catch {
      setStatus("error");
    }
  }, [key]);

  return (
    <div className="min-h-screen bg-white">
      {status === "error" ? (
        <div className="p-6 text-sm text-slate-700">
          Não foi possível preparar o relatório. Volte e tente novamente.
        </div>
      ) : (
        <div className="p-6 text-sm text-slate-700">Preparando relatório…</div>
      )}
    </div>
  );
}

