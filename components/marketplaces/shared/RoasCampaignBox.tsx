"use client";

import { AlertTriangle } from "lucide-react";

function formatRoas(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v) || v >= 999) return "—";
  return `x${v.toFixed(1)}`;
}

/**
 * Caixa única e bem visível com os dois números que importam na hora de configurar
 * uma campanha de Ads: o ROAS de equilíbrio (abaixo disso, prejuízo) e o ROAS que
 * precisa bater pra fechar com a margem alvo (esse é o número a digitar no painel
 * de Ads da plataforma). Usada igual nas calculadoras de Shopee, Mercado Livre e
 * TikTok Shop — mesmo cálculo, mesma apresentação, pra não confundir qual ROAS usar
 * em qual plataforma.
 */
export function RoasCampaignBox({
  roasMinimo,
  roasAlvoParaMargem,
  metaLucroPercent,
  adsPlatformLabel,
}: {
  roasMinimo: number | null | undefined;
  roasAlvoParaMargem: number | null | undefined;
  metaLucroPercent: number;
  adsPlatformLabel: string;
}) {
  const semMargemViavel = roasAlvoParaMargem == null;

  return (
    <div className="mx-auto mt-3 grid max-w-md grid-cols-2 gap-2.5 print:hidden">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          ROAS de equilíbrio
        </p>
        <p className="mt-1 tabular-nums text-2xl font-black text-amber-200">{formatRoas(roasMinimo)}</p>
        <p className="mt-0.5 text-[10px] leading-snug text-amber-200/70">Abaixo disso, a venda dá prejuízo</p>
      </div>

      <div
        className={`rounded-xl border px-3 py-2.5 text-center ${
          semMargemViavel
            ? "border-rose-500/30 bg-rose-500/10"
            : "border-emerald-500/30 bg-emerald-500/10"
        }`}
      >
        <p
          className={`text-[10px] font-semibold uppercase tracking-wide ${
            semMargemViavel ? "text-rose-300" : "text-emerald-300"
          }`}
        >
          ROAS pra bater a meta ({metaLucroPercent.toFixed(0)}%)
        </p>
        {semMargemViavel ? (
          <>
            <AlertTriangle className="mx-auto mt-1 h-5 w-5 text-rose-300" />
            <p className="mt-0.5 text-[10px] leading-snug text-rose-200/80">
              Nem sem gastar com ads essa margem fecha — revise custo ou preço antes
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 tabular-nums text-2xl font-black text-emerald-200">
              {formatRoas(roasAlvoParaMargem)}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-emerald-200/70">
              Configure esse ROAS na campanha do {adsPlatformLabel}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
