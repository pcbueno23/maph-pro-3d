"use client";

import { useState } from "react";
import InputField from "@/components/marketplaces/shopee/InputField";
import { formatBRL, formatPct } from "@/lib/engines/shopee/engine";

type Mode = "pct" | "valor";

export default function DiscountField({
  label,
  percent,
  onPercentChange,
  referencePrice,
  ceilingPrice,
  ceilingHint,
}: {
  label: string;
  percent: number;
  onPercentChange: (pct: number) => void;
  /** Base usada pra converter % <-> R$ deste campo. */
  referencePrice: number;
  /** Opcional: o preço resultante precisa ficar ABAIXO desse valor (ex.: oferta relâmpago vs. desconto normal). */
  ceilingPrice?: number;
  /** Texto curto do que representa o teto, ex.: "do desconto normal". */
  ceilingHint?: string;
}) {
  const [mode, setMode] = useState<Mode>("pct");
  const [error, setError] = useState<string | null>(null);

  const resultingPrice = referencePrice * (1 - (percent || 0) / 100);

  function commitPercent(rawPct: number) {
    let pct = Math.max(0, Math.min(100, rawPct));
    if (ceilingPrice != null && referencePrice > 0) {
      const resultado = referencePrice * (1 - pct / 100);
      if (resultado >= ceilingPrice) {
        const minPct = (1 - (ceilingPrice - 0.01) / referencePrice) * 100;
        pct = Math.max(pct, Math.min(100, minPct));
        setError(`Precisa ficar abaixo de ${formatBRL(ceilingPrice)}${ceilingHint ? ` ${ceilingHint}` : ""}`);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
    onPercentChange(pct);
  }

  function handleValorChange(v: number) {
    if (referencePrice <= 0) return;
    const teto = ceilingPrice != null ? Math.min(ceilingPrice, referencePrice) : referencePrice;
    let target = v;
    if (target >= teto) {
      setError(
        ceilingPrice != null && ceilingPrice < referencePrice
          ? `Precisa ser menor que ${formatBRL(teto)}${ceilingHint ? ` ${ceilingHint}` : ""}`
          : `Precisa ser menor que ${formatBRL(teto)}`,
      );
      target = Math.max(0, teto - 0.01);
    } else {
      setError(null);
    }
    const pct = Math.max(0, (1 - target / referencePrice) * 100);
    onPercentChange(pct);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-ink-200">
          {label}
        </label>
        <div className="flex overflow-hidden rounded-lg border border-slate-800 text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("pct");
              setError(null);
            }}
            className={`px-2 py-1 transition ${
              mode === "pct" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            %
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("valor");
              setError(null);
            }}
            className={`px-2 py-1 transition ${
              mode === "valor" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            R$
          </button>
        </div>
      </div>

      {mode === "pct" ? (
        <InputField value={percent} onChange={commitPercent} suffix="%" step={0.1} />
      ) : (
        <InputField
          value={Math.round(resultingPrice * 100) / 100}
          onChange={handleValorChange}
          prefix="R$"
          step={0.01}
        />
      )}

      <p className={`text-xs ${error ? "text-rose-400" : "text-slate-500"}`}>
        {error ??
          (mode === "pct"
            ? `= ${formatBRL(resultingPrice)} após esse desconto`
            : `= ${formatPct(percent)} de desconto`)}
      </p>
    </div>
  );
}
