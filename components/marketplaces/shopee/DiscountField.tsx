"use client";

import { useEffect, useState } from "react";
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
  allowValorMode = true,
  safeMaxPercent,
  safeMaxWarning,
  capAmount,
}: {
  label: string;
  percent: number;
  onPercentChange: (pct: number) => void;
  /** Base usada pra converter % <-> R$ deste campo. */
  referencePrice: number;
  /** Opcional: preço de referência pra avisar (sem bloquear) se o resultado não ficou mais agressivo que ele. */
  ceilingPrice?: number;
  /** Texto curto do que representa o teto, ex.: "do desconto normal". */
  ceilingHint?: string;
  /**
   * No modo margem, o preço final fica sempre travado na meta — nenhuma %
   * escolhida aqui muda o preço que o cliente paga, só o preço de cadastro.
   * Digitar um "valor final desejado" não tem como funcionar nesse caso
   * (qualquer % resulta no mesmo preço final), então o modo R$ é escondido.
   */
  allowValorMode?: boolean;
  /** Regra confirmada da Shopee (skill shopee-precificacao): limite com folga de
   * segurança abaixo do limite real da plataforma (ex.: 48% pra oferta relâmpago,
   * cujo teto real é 50% — acima disso a Shopee recusa por "desconto enganoso"). */
  safeMaxPercent?: number;
  safeMaxWarning?: string;
  /** Teto em R$ do valor do desconto (ex.: cupom "5%, até R$2") — a dica de preço
   * resultante precisa respeitar esse limite, senão mostra um valor que nunca vai
   * acontecer de verdade. */
  capAmount?: number;
}) {
  const [mode, setMode] = useState<Mode>("pct");

  useEffect(() => {
    if (!allowValorMode) setMode("pct");
  }, [allowValorMode]);

  const rawDiscountAmount = referencePrice * (percent || 0) / 100;
  const cappedByMax = capAmount != null && capAmount > 0 && rawDiscountAmount > capAmount;
  const discountAmount = cappedByMax ? capAmount! : rawDiscountAmount;
  const resultingPrice = referencePrice - discountAmount;
  // Aviso informativo, não bloqueia nem corrige o valor digitado — a estratégia de
  // ranqueamento pode aceitar qualquer combinação, inclusive lucro negativo.
  const ceilingWarning =
    ceilingPrice != null && resultingPrice >= ceilingPrice
      ? `Esse valor não fica abaixo de ${formatBRL(ceilingPrice)}${ceilingHint ? ` ${ceilingHint}` : ""}`
      : null;
  // Regra da plataforma (não é só um aviso de estratégia) — fica mais forte/vermelho.
  const safeMaxExceeded = safeMaxPercent != null && (percent || 0) > safeMaxPercent;
  const warning = safeMaxExceeded ? (safeMaxWarning ?? `Acima de ${safeMaxPercent}% — risco de bloqueio pela Shopee`) : ceilingWarning;

  function commitPercent(rawPct: number) {
    // Limite só pra evitar 100% exato (o que quebraria a divisão no modo margem) — sem forçar mínimo.
    onPercentChange(Math.max(0, Math.min(99.9, rawPct)));
  }

  function handleValorChange(v: number) {
    if (referencePrice <= 0) return;
    // Mantém o valor entre 0,1% e 99,9% do preço de referência — sem forçar um
    // "mínimo de agressividade", só evita 0 (que geraria 100% de desconto e quebraria
    // o cálculo do preço de cadastro no modo margem).
    const target = Math.max(referencePrice * 0.001, Math.min(referencePrice * 0.999, v));
    const pct = Math.max(0, (1 - target / referencePrice) * 100);
    onPercentChange(pct);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-ink-200">
          {label}
        </label>
        {allowValorMode && (
          <div className="flex overflow-hidden rounded-lg border border-slate-800 text-[10px] font-semibold">
            <button
              type="button"
              onClick={() => setMode("pct")}
              className={`px-2 py-1 transition ${
                mode === "pct" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              %
            </button>
            <button
              type="button"
              onClick={() => setMode("valor")}
              className={`px-2 py-1 transition ${
                mode === "valor" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              R$
            </button>
          </div>
        )}
      </div>

      {mode === "pct" || !allowValorMode ? (
        <InputField value={percent} onChange={commitPercent} suffix="%" step={0.1} />
      ) : (
        <InputField
          value={Math.round(resultingPrice * 100) / 100}
          onChange={handleValorChange}
          prefix="R$"
          step={0.01}
        />
      )}

      <p className={`text-xs ${safeMaxExceeded ? "font-semibold text-rose-400" : warning ? "text-amber-400" : cappedByMax ? "text-amber-400" : "text-slate-500"}`}>
        {warning ??
          (mode === "pct" || !allowValorMode
            ? `= ${formatBRL(resultingPrice)} após esse desconto${cappedByMax ? ` (limitado ao teto de ${formatBRL(capAmount!)})` : ""}`
            : `= ${formatPct(percent)} de desconto`)}
      </p>
    </div>
  );
}
