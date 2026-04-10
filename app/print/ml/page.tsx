"use client";

import { useEffect, useMemo, useState } from "react";
import type { MlInputs, MlResult } from "@/lib/engines/ml/engine";
import { buildMlPrintHtml } from "@/lib/printReport";

export default function PrintMlPage() {
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
        inputs: MlInputs;
        result: MlResult | null;
      };
      const built = buildMlPrintHtml(parsed);
      window.sessionStorage.removeItem(key);
      // Renderiza substituindo o documento inteiro para garantir que o PDF não imprima "só a página com iframe".
      document.open();
      document.write(built);
      document.close();
      // limpeza
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

