"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle,
  Copy,
  Info,
  PieChart,
  Printer,
  Share2,
  Tag,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { TikTokResult } from "@/lib/engines/tiktok/engine";
import { formatBRL, formatPct } from "@/lib/engines/tiktok/engine";

function DonutChart({
  data,
  total,
}: {
  data: Array<{ valor: number; cor: string }>;
  total: number;
}) {
  const R = 44;
  const CX = 60;
  const CY = 60;
  const CIRC = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.map((d) => {
    const dash = total > 0 ? (d.valor / total) * CIRC : 0;
    const s = { ...d, dash, gap: CIRC - dash, offset };
    offset += dash;
    return s;
  });

  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0 -rotate-90">
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        strokeWidth="16"
        className="stroke-neutral-100 dark:stroke-ink-700"
      />
      {slices.map((s, i) => (
        <circle
          key={i}
          cx={CX}
          cy={CY}
          r={R}
          fill="none"
          stroke={s.cor}
          strokeWidth="16"
          strokeDasharray={`${s.dash} ${s.gap}`}
          strokeDashoffset={-s.offset}
        />
      ))}
    </svg>
  );
}

function LegendRow({
  cor,
  label,
  valor,
  pct,
}: {
  cor: string;
  label: string;
  valor: number;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-800/70 py-1.5 last:border-0">
      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: cor }} />
      <span className="flex-1 text-xs leading-snug text-slate-300">{label}</span>
      <span className="tabular-nums text-xs font-semibold text-slate-100">{formatBRL(valor)}</span>
      <span className="w-9 text-right tabular-nums text-xs text-slate-500">{formatPct(pct)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, React.ReactNode, string]> = {
    otimo: [
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
      <CheckCircle key="i" size={11} />,
      "Ótimo",
    ],
    bom: [
      "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
      <CheckCircle key="i" size={11} />,
      "Bom",
    ],
    atencao: [
      "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
      <AlertTriangle key="i" size={11} />,
      "Atenção",
    ],
    ruim: [
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
      <XCircle key="i" size={11} />,
      "Alto",
    ],
    neutro: [
      "bg-neutral-100 text-neutral-500 dark:bg-ink-700 dark:text-ink-300",
      <Info key="i" size={11} />,
      "—",
    ],
  };
  const [cls, icon, label] = map[status] || map.neutro;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {icon} {label}
    </span>
  );
}

function Row({
  label,
  value,
  sub,
  bold,
  danger,
  muted,
  positive,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  danger?: boolean;
  muted?: boolean;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/70 py-2.5 last:border-0">
      <span className={`text-sm ${muted ? "text-slate-500" : "text-slate-300"}`}>{label}</span>
      <span
        className={`tabular-nums text-sm font-medium ${
          bold
            ? "text-base font-bold text-slate-50"
            : danger
              ? "text-rose-300"
              : positive
                ? "font-semibold text-emerald-300"
                : muted
                  ? "text-slate-500"
                  : "text-slate-100"
        }`}
      >
        {value}
        {sub && <span className="ml-1.5 text-xs font-normal text-slate-500">{sub}</span>}
      </span>
    </div>
  );
}

const TONE_CLASSES = {
  danger: {
    box: "border-rose-200 bg-rose-50 dark:border-rose-500/25 dark:bg-rose-500/10",
    label: "text-rose-600 dark:text-rose-400",
    price: "text-rose-700 dark:text-rose-300",
  },
  neutral: {
    box: "border-slate-800 bg-slate-950/30",
    label: "text-slate-400",
    price: "text-slate-100",
  },
  success: {
    box: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    label: "text-emerald-600 dark:text-emerald-400",
    price: "text-emerald-700 dark:text-emerald-300",
  },
} as const;

function AlvoTile({
  label,
  percent,
  preco,
  onChangePercent,
  tone,
}: {
  label: string;
  percent?: number;
  preco: number;
  onChangePercent?: (v: number) => void;
  tone: keyof typeof TONE_CLASSES;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div className={`rounded-xl border p-3 text-center ${t.box}`}>
      <div className={`flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${t.label}`}>
        {onChangePercent && typeof percent === "number" ? (
          <>
            <span>Alvo</span>
            <input
              type="number"
              value={percent}
              onChange={(e) => onChangePercent(Number(e.target.value))}
              step={0.5}
              min={0}
              max={95}
              className="w-8 rounded border-b border-current/40 bg-transparent px-0.5 text-center tabular-nums outline-none focus:border-current print:hidden"
              aria-label={`Meta de margem do preço ${label}`}
            />
            <span className="print:hidden">%</span>
            <span className="hidden print:inline">{percent}%</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </div>
      <p className={`mt-0.5 tabular-nums text-base font-black ${t.price}`}>{formatBRL(preco)}</p>
    </div>
  );
}

function CardBox({
  title,
  icon,
  iconBg,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
      <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-3.5">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function ResultCard({
  result,
  productName,
  onPrint,
  alvo1Percent,
  alvo2Percent,
  alvo3Percent,
  onChangeAlvoPercent,
}: {
  result: TikTokResult | null;
  productName?: string;
  onPrint?: () => void;
  /** % de margem alvo dos 3 preços de referência (editáveis pelo usuário). */
  alvo1Percent?: number;
  alvo2Percent?: number;
  alvo3Percent?: number;
  onChangeAlvoPercent?: (qual: "alvo1Percent" | "alvo2Percent" | "alvo3Percent", valor: number) => void;
}) {
  if (!result) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 py-20 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/70">
          <BarChart2 size={24} className="text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-400">Preencha os dados para ver o resultado</p>
      </div>
    );
  }

  const {
    precoFinalSugerido,
    precoCadastroSugerido,
    precoComDescontoECupom,
    precoComOfertaECupom,
    promocaoPercent,
    cupomLojaPercent,
    ofertaRelampagoPercent,
    cupomMaxRS,
    cupomLimitadoPeloTeto,
    lucroLiquido,
    margemReal,
    custoBase,
    valorComissao,
    pctComissao,
    fixoComissao,
    valorSFP,
    valorAfiliado,
    custoAds,
    valorTributacao,
    roasMinimo,
    roasAlvo,
    faixaLabel,
    margemContribuicao,
    margemContribuicaoPct,
    distribuicao,
    projecaoMensal,
    competitividade,
    percentualAds,
    precosReferencia,
  } = result;

  const usaAds = roasAlvo > 0;
  const roasOk = !usaAds || roasAlvo >= roasMinimo;
  const temDesconto = precoCadastroSugerido > precoFinalSugerido + 0.01;
  const cupomLabel = `Cupom ${formatPct(cupomLojaPercent)}${
    cupomMaxRS > 0 ? ` (máx. ${formatBRL(cupomMaxRS)})` : ""
  }`;

  const [copied, setCopied] = useState(false);

  const generateText = () =>
    `
*Análise de Precificação - TikTok Shop*

💰 Preço de Cadastro: ${formatBRL(precoCadastroSugerido)}
🏷️ Preço Final (ao cliente): ${formatBRL(precoFinalSugerido)}

📊 Custo do produto: ${formatBRL(custoBase)}
💸 Comissão TikTok Shop: ${formatBRL(valorComissao)} (${formatPct(pctComissao * 100)} + R$${fixoComissao.toFixed(2)})
🚚 Frete (Programa Frete Grátis): ${formatBRL(valorSFP)}
${valorAfiliado > 0 ? `🤝 Afiliado/criador: ${formatBRL(valorAfiliado)}\n` : ""}${custoAds > 0 ? `🚀 Ads/GMV Max: ${formatBRL(custoAds)}\n` : ""}
📌 *Lucro real*: ${formatBRL(lucroLiquido)} (${formatPct(margemReal)})

Geração feita via MAPH PRO TIKTOK SHOP.
  `.trim();

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateText())}`, "_blank");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    onPrint?.();
    if (!onPrint) window.print();
  };

  return (
    <div className="flex flex-col gap-4 animate-slide-up print:grid print:grid-cols-2 print:items-start print:gap-3">
      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 print:col-span-2">
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-slate-200">
            <Tag size={10} />
            {formatPct(pctComissao * 100)} + R${fixoComissao.toFixed(2)}
          </span>
          <span className="text-xs text-slate-400">{faixaLabel}</span>
        </div>

        <div className="px-5 py-5 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Preço para Cadastrar no TikTok Shop
          </p>
          <p className="tabular-nums text-5xl font-black tracking-tight text-slate-50">
            {formatBRL(precoCadastroSugerido)}
          </p>

          <div className="mt-3 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                lucroLiquido >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              } print:hidden`}
            >
              {lucroLiquido >= 0 ? <TrendingUp size={13} /> : <AlertTriangle size={13} />}
              Lucro Real: {formatBRL(lucroLiquido)} ({formatPct(margemReal)})
            </span>
          </div>

          {temDesconto && (
            <div className="mx-auto mt-3 max-w-xs space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5">
              <div>
                <p className="text-xs text-slate-500">
                  Preço com desconto + cupom
                  {Math.abs(precoFinalSugerido - precoComDescontoECupom) < 0.01 && (
                    <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                      ativo agora
                    </span>
                  )}
                </p>
                <p className="mt-0.5 tabular-nums text-xl font-bold text-slate-100">
                  {formatBRL(precoComDescontoECupom)}
                  {(promocaoPercent > 0 || cupomLojaPercent > 0) && (
                    <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      -{formatPct(100 - (precoComDescontoECupom / precoCadastroSugerido) * 100)}{" "}
                      (
                      {[
                        promocaoPercent > 0 ? `Desconto ${formatPct(promocaoPercent)}` : null,
                        cupomLojaPercent > 0 ? cupomLabel : null,
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                      )
                    </span>
                  )}
                </p>
              </div>

              {precoComOfertaECupom != null && (
                <div className="border-t border-slate-800/70 pt-2.5">
                  <p className="text-xs text-slate-500">
                    Preço com oferta relâmpago + cupom
                    {Math.abs(precoFinalSugerido - precoComOfertaECupom) < 0.01 && (
                      <span className="ml-1.5 rounded-full bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                        ativo agora
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 tabular-nums text-xl font-bold text-slate-100">
                    {formatBRL(precoComOfertaECupom)}
                    <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      -{formatPct(100 - (precoComOfertaECupom / precoCadastroSugerido) * 100)}{" "}
                      (
                      {[
                        `Oferta relâmpago ${formatPct(ofertaRelampagoPercent)}`,
                        cupomLojaPercent > 0 ? cupomLabel : null,
                      ]
                        .filter(Boolean)
                        .join(" + ")}
                      )
                    </span>
                  </p>
                </div>
              )}

              {cupomLimitadoPeloTeto && (
                <p className="text-[11px] text-amber-300">
                  Cupom limitado ao teto de {formatBRL(cupomMaxRS)} — {formatPct(cupomLojaPercent)} daria mais desconto.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
          {usaAds ? (
            <div
              className={`rounded-xl border px-4 py-3 ${
                roasOk
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10"
                  : "border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10"
              }`}
            >
              <p
                className={`text-xs font-semibold ${
                  roasOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                ROAS mínimo: x{roasMinimo.toFixed(1)} · Seu alvo: x{roasAlvo.toFixed(1)}
              </p>
              <p className="mt-0.5 text-xs text-slate-300">Campanha lucrativa com o ROAS configurado</p>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
              <p className="text-xs font-semibold text-slate-200">Ads / GMV Max</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Sem orçamento de ads informado (defina um ROAS alvo pra simular).
              </p>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
            <p className="text-xs font-semibold text-slate-200">Competitividade</p>
            <p className="mt-0.5 text-xs text-slate-300">
              <StatusBadge status={competitividade.status} />{" "}
              <span className="ml-1">{competitividade.statusMsg || "—"}</span>
            </p>
          </div>
        </div>
      </div>

      <CardBox
        title="Preços de Referência"
        icon={<Tag size={14} className="text-slate-400" />}
        iconBg="bg-slate-900/70"
      >
        <p className="mb-3 text-xs text-slate-400">
          Mínimo trava a margem de contribuição em 0% (abaixo disso não vende). Alvos mantêm os
          mesmos custos de comissão, SFP, afiliado, ads e tributação — só muda a margem perseguida.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <AlvoTile label="Mínimo" preco={precosReferencia.minimo} tone="danger" />
          <AlvoTile
            label={`Alvo ${precosReferencia.alvo1.percent}%`}
            percent={alvo1Percent ?? precosReferencia.alvo1.percent}
            preco={precosReferencia.alvo1.preco}
            tone="neutral"
            onChangePercent={
              onChangeAlvoPercent ? (v) => onChangeAlvoPercent("alvo1Percent", v) : undefined
            }
          />
          <AlvoTile
            label={`Alvo ${precosReferencia.alvo2.percent}%`}
            percent={alvo2Percent ?? precosReferencia.alvo2.percent}
            preco={precosReferencia.alvo2.preco}
            tone="neutral"
            onChangePercent={
              onChangeAlvoPercent ? (v) => onChangeAlvoPercent("alvo2Percent", v) : undefined
            }
          />
          <AlvoTile
            label={`Alvo ${precosReferencia.alvo3.percent}%`}
            percent={alvo3Percent ?? precosReferencia.alvo3.percent}
            preco={precosReferencia.alvo3.preco}
            tone="success"
            onChangePercent={
              onChangeAlvoPercent ? (v) => onChangeAlvoPercent("alvo3Percent", v) : undefined
            }
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5">
          <span className="text-xs font-semibold text-cyan-200">
            Preço comercial (o que o cliente paga hoje)
          </span>
          <span className="tabular-nums text-sm font-bold text-cyan-100">
            {formatBRL(precoFinalSugerido)} · {formatPct(margemReal)}
          </span>
        </div>
        {precoFinalSugerido < precosReferencia.minimo && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-400">
            <AlertTriangle size={12} /> Preço comercial abaixo do mínimo — essa venda está destruindo margem.
          </p>
        )}
      </CardBox>

      <CardBox title="Detalhamento de Custos" icon={<PieChart size={14} className="text-slate-400" />} iconBg="bg-slate-900/70">
        <Row label="Custo do produto + envio" value={formatBRL(custoBase)} />
        <Row
          label={`Comissão TikTok Shop (${formatPct(pctComissao * 100)} + fixo)`}
          value={formatBRL(valorComissao)}
          danger
        />
        {valorSFP > 0 && <Row label="Frete (Programa Frete Grátis)" value={formatBRL(valorSFP)} danger />}
        {valorAfiliado > 0 && <Row label="Comissão de afiliado/criador" value={formatBRL(valorAfiliado)} danger />}
        {valorTributacao > 0 && <Row label="Tributação" value={formatBRL(valorTributacao)} danger />}
        {custoAds > 0 && (
          <Row
            label={`Ads (ROAS alvo x${roasAlvo.toFixed(1)} · ${formatPct(percentualAds)} da receita)`}
            value={formatBRL(custoAds)}
            danger
          />
        )}
        <Row
          label="Margem de Contribuição"
          value={formatBRL(margemContribuicao)}
          sub={formatPct(margemContribuicaoPct)}
          positive
        />
        <div className="print:hidden">
          <Row
            label="Margem Líquida (Lucro)"
            value={formatBRL(lucroLiquido)}
            sub={formatPct(margemReal)}
            bold
            positive={lucroLiquido >= 0}
            danger={lucroLiquido < 0}
          />
        </div>
      </CardBox>

      <CardBox title="Distribuição do Preço" icon={<PieChart size={14} className="text-slate-400" />} iconBg="bg-slate-900/70">
        <div className="flex items-start gap-4">
          <DonutChart data={distribuicao} total={precoFinalSugerido} />
          <div className="min-w-0 flex-1">
            {distribuicao.map((d, idx) => (
              <LegendRow
                key={idx}
                cor={d.cor}
                label={d.label}
                valor={d.valor}
                pct={precoFinalSugerido > 0 ? (d.valor / precoFinalSugerido) * 100 : 0}
              />
            ))}
          </div>
        </div>
      </CardBox>

      {projecaoMensal && (
        <CardBox title="Projeção Mensal" icon={<Calendar size={14} className="text-slate-400" />} iconBg="bg-slate-900/70">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-center">
              <p className="text-xs font-semibold text-slate-300">Faturamento</p>
              <p className="mt-0.5 tabular-nums text-lg font-black text-slate-50">
                {formatBRL(projecaoMensal.faturamento)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Lucro Líquido</p>
              <p className="mt-0.5 tabular-nums text-lg font-black text-emerald-700 dark:text-emerald-400">
                {formatBRL(projecaoMensal.lucroTotal)}
              </p>
            </div>
          </div>
          <Row label="Comissões TikTok Shop" value={formatBRL(projecaoMensal.comissaoTotal)} />
          {projecaoMensal.sfpTotal > 0 && (
            <Row label="Frete (Programa Frete Grátis)" value={formatBRL(projecaoMensal.sfpTotal)} />
          )}
          {projecaoMensal.afiliadoTotal > 0 && (
            <Row label="Afiliado/criador" value={formatBRL(projecaoMensal.afiliadoTotal)} />
          )}
          {projecaoMensal.gastoAds > 0 && <Row label="Investimento em Ads" value={formatBRL(projecaoMensal.gastoAds)} />}
          {projecaoMensal.tributacaoTotal > 0 && (
            <Row label="Tributação" value={formatBRL(projecaoMensal.tributacaoTotal)} />
          )}
        </CardBox>
      )}

      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 print:hidden">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/70">
            <Share2 size={14} className="text-slate-400" />
          </div>
          <span className="text-sm font-semibold text-slate-100">Exportar Resultados</span>
        </div>
        <div className="flex flex-col items-center gap-2 px-5 py-4 sm:flex-row">
          <button
            type="button"
            onClick={handleCopy}
            className={`flex w-full flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
              copied
                ? "border border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
                : "border border-slate-800 bg-slate-950/30 text-slate-200 hover:bg-slate-900/40"
            }`}
          >
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />} {copied ? "Copiado!" : "Copiar Texto"}
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex w-full flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
          >
            <Share2 size={14} /> WhatsApp
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex w-full flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/30 px-3 py-2.5 text-xs font-semibold text-slate-200 transition-colors hover:bg-slate-900/40"
          >
            <Printer size={14} /> Salvar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
