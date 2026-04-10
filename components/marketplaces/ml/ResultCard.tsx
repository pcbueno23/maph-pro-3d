"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CheckCircle,
  Copy,
  Megaphone,
  PieChart,
  Printer,
  Share2,
  Tag,
  TrendingUp,
} from "lucide-react";
import type { MlInputs, MlResult } from "@/lib/engines/ml/engine";
import { formatBRL, formatPct } from "@/lib/engines/ml/engine";

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

function Row({
  label,
  value,
  sub,
  bold,
  danger,
  positive,
  muted,
}: {
  label: string;
  value: string;
  sub?: string;
  bold?: boolean;
  danger?: boolean;
  positive?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/70 py-2.5 last:border-0">
      <span
        className={`text-sm ${
          muted ? "text-slate-500" : "text-slate-300"
        }`}
      >
        {label}
      </span>
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
        {sub && (
          <span className="ml-1.5 text-xs font-normal text-slate-500">{sub}</span>
        )}
      </span>
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
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconBg}`}>
          {icon}
        </div>
        <span className="text-sm font-semibold text-slate-100">{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function ResultCard({
  result,
  inputs,
  productName,
  onPrint,
}: {
  result: MlResult | null;
  inputs: MlInputs;
  productName?: string;
  onPrint?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="glass-panel flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 py-20 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/70">
          <BarChart2 size={24} className="text-slate-500" />
        </div>
        <p className="text-sm font-medium text-slate-400">
          Preencha os dados para ver o resultado
        </p>
      </div>
    );
  }

  const {
    precoFinal,
    precoCliente,
    lucro,
    margem,
    margemContribuicao,
    margemContribuicaoPct,
    custoBase,
    custos,
    distribuicao,
    estimativaVendas,
  } = result;

  const totalCustos =
    custoBase +
    custos.comissao +
    custos.taxaFixa +
    custos.frete +
    custos.nf +
    custos.opsPercent +
    custos.ads +
    custos.promo +
    custos.cupom +
    custos.oferta;

  const {
    comissaoPercent,
    tipoAnuncio,
    formaEnvio,
    modoAds,
    roasAlvo,
    tacosPercent,
    proporcaoOrganica,
    metaLucroPercent,
    promocaoPercent,
    cupomLojaPercent,
  } = inputs;

  const margemBrutaPct = precoFinal > 0 ? (margemContribuicao / precoFinal) * 100 : 0;
  const acosBreakeven = margemBrutaPct;
  const roasBreakeven = acosBreakeven > 0 ? 1 / (acosBreakeven / 100) : null;
  const metaMargem = metaLucroPercent || 20;
  const acosTarget = Math.max(0, acosBreakeven - metaMargem);
  const roasTarget = acosTarget > 0 ? 1 / (acosTarget / 100) : null;
  const tacosEscala =
    acosTarget > 0 ? acosTarget * (1 - (proporcaoOrganica || 50) / 100) : null;

  const custosSemAds =
    custoBase +
    custos.comissao +
    custos.taxaFixa +
    custos.frete +
    custos.nf +
    custos.opsPercent +
    custos.promo +
    custos.cupom +
    custos.oferta;
  const denominador = precoFinal - custosSemAds;
  const roasMinimo = denominador > 0 ? (precoFinal / denominador).toFixed(1) : null;
  const roasOk = !roasAlvo || Number(roasAlvo) >= Number(roasMinimo || 0);
  const temDesconto = promocaoPercent > 0 || cupomLojaPercent > 0;

  const acos =
    custos.ads > 0 && precoFinal > 0 ? (custos.ads / precoFinal) * 100 : null;
  const tacosEstimado =
    acos != null ? acos * (1 - (proporcaoOrganica || 50) / 100) : null;
  const tacosOk = tacosEstimado != null && tacosEstimado <= (tacosPercent || 4);

  const generateText = () =>
    `
*Análise de Precificação - Mercado Livre*

💰 Preço de Cadastro: ${formatBRL(precoFinal)}
${temDesconto ? `🏷️ Preço Final (ao cliente): ${formatBRL(precoCliente)}\n` : ""}📊 Custo do Produto: ${formatBRL(custoBase)}
💸 Comissão ML: ${formatBRL(custos.comissao + custos.taxaFixa)} (${formatPct(comissaoPercent)})
🚚 Frete: ${formatBRL(custos.frete)}
${custos.ads > 0 ? `🚀 Mercado Ads: ${formatBRL(custos.ads)}\n` : ""}💳 Parcelamento: consulte no anúncio

📌 *Preço final*: ${formatBRL(temDesconto ? precoCliente : precoFinal)}

Gerado via MAPH PRO ML.
  `.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(generateText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(generateText())}`, "_blank");
  };

  const handlePrint = () => {
    onPrint?.();
    if (!onPrint) window.print();
  };

  const projecaoFaturamento = precoFinal * estimativaVendas;
  const projecaoLucro = lucro * estimativaVendas;
  const projecaoAds = custos.ads * estimativaVendas;
  const projecaoComissao = (custos.comissao + custos.taxaFixa) * estimativaVendas;

  return (
    <div className="flex flex-col gap-4 animate-slide-up print:grid print:grid-cols-2 print:items-start print:gap-3">
      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 print:col-span-2">
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-ml-200 bg-ml-50 px-2.5 py-1 text-xs font-semibold text-ml-700 dark:border-ml-500/30 dark:bg-ml-500/10 dark:text-ml-400">
            <Tag size={10} />
            {formatPct(comissaoPercent)} · {tipoAnuncio === "premium" ? "Premium" : "Clássico"}
          </span>
          <span className="text-xs text-slate-400">
            {formaEnvio === "mercado-envios" ? "Mercado Envios" : "Mercado Flex"}
          </span>
        </div>

        <div className="px-5 py-5 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Preço para Cadastrar no ML
          </p>
          <p className="tabular-nums text-5xl font-black tracking-tight text-slate-50">
            {formatBRL(precoFinal)}
          </p>

          <div className="mt-3 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                lucro >= 0
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
              } print:hidden`}
            >
              {lucro >= 0 ? <TrendingUp size={13} /> : <AlertTriangle size={13} />}
              Lucro Real: {formatBRL(lucro)} ({formatPct(margem)})
            </span>
          </div>

          {temDesconto && (
            <div className="mx-auto mt-3 max-w-xs rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2.5">
              <p className="text-xs text-slate-500">
                Preço exibido ao cliente (após descontos)
              </p>
              <p className="mt-0.5 tabular-nums text-xl font-bold text-slate-100">
                {formatBRL(precoCliente)}
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2">
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
              ROAS mínimo: {roasMinimo ? `x${roasMinimo}` : "—"}{" "}
              {roasAlvo ? `· Seu alvo: x${roasAlvo}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Campanha lucrativa com o ROAS configurado
            </p>
          </div>

          <div
            className={`rounded-xl border px-4 py-3 ${
              tacosOk
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10"
                : "border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10"
            }`}
          >
            <p
              className={`text-xs font-semibold ${
                tacosOk ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"
              }`}
            >
              ACOS {acos != null ? formatPct(acos) : "—"} · TACOS est.{" "}
              {tacosEstimado != null ? formatPct(tacosEstimado) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              Limite TACOS: {formatPct(tacosPercent || 0)} · Orgânico:{" "}
              {formatPct(proporcaoOrganica || 0)}
            </p>
          </div>
        </div>
      </div>

      <CardBox
        title="Níveis de ROAS / ACOS para este produto"
        icon={<TrendingUp size={14} className="text-slate-400" />}
        iconBg="bg-slate-900/70"
      >
        <div className="grid gap-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-3">
            <p className="text-xs font-semibold text-slate-200">BreakEven</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Lucro zero no Ads
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">ACOS</span>
              <span className="font-bold text-slate-100">
                {formatPct(acosBreakeven)}
              </span>
              <span className="text-slate-500">ROAS</span>
              <span className="font-bold text-slate-100">
                {roasBreakeven ? `x${roasBreakeven.toFixed(1)}` : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-ml-200 bg-ml-50 px-4 py-3 dark:border-ml-500/30 dark:bg-ml-500/10">
            <p className="text-xs font-semibold text-ml-700 dark:text-ml-300">Target</p>
            <p className="mt-0.5 text-xs text-slate-300">
              Margem alvo de {formatPct(metaMargem)}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">ACOS</span>
              <span className="font-bold text-slate-100">
                {formatPct(acosTarget)}
              </span>
              <span className="text-slate-500">ROAS</span>
              <span className="font-bold text-slate-100">
                {roasTarget ? `x${roasTarget.toFixed(1)}` : "—"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
            <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">Escala</p>
            <p className="mt-0.5 text-xs text-slate-300">
              Com {formatPct(proporcaoOrganica || 0)} orgânico
            </p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">TACOS</span>
              <span className="font-bold text-slate-100">
                {tacosEscala != null ? formatPct(tacosEscala) : "—"}
              </span>
            </div>
          </div>
        </div>
      </CardBox>

      <CardBox
        title="Detalhamento de Custos"
        icon={<PieChart size={14} className="text-slate-400" />}
        iconBg="bg-slate-900/70"
      >
        <Row label="Custo de compra + material" value={formatBRL(custoBase)} />
        <Row
          label={`Comissão ML (${formatPct(comissaoPercent)} + taxa fixa)`}
          value={formatBRL(custos.comissao + custos.taxaFixa)}
          danger
        />
        <Row label="Frete (Mercado Envios)" value={formatBRL(custos.frete)} danger />
        {custos.ads > 0 && (
          <Row
            label={`Mercado Ads (${modoAds === "roas" ? `ROAS x${roasAlvo}` : "ACOS"})`}
            value={formatBRL(custos.ads)}
            danger
          />
        )}
        <Row
          label="Total de Custos + Taxas"
          value={formatBRL(totalCustos)}
          muted
        />
        <Row
          label="Margem de Contribuição"
          value={formatBRL(margemContribuicao)}
          sub={formatPct(margemContribuicaoPct)}
          positive
        />
        <div className="print:hidden">
          <Row
            label="Margem Líquida (Lucro)"
            value={formatBRL(lucro)}
            sub={formatPct(margem)}
            bold
            positive={lucro >= 0}
            danger={lucro < 0}
          />
        </div>
      </CardBox>

      <CardBox
        title="Distribuição do Preço"
        icon={<PieChart size={14} className="text-slate-400" />}
        iconBg="bg-slate-900/70"
      >
        <div className="flex items-start gap-4">
          <DonutChart data={distribuicao} total={precoFinal} />
          <div className="min-w-0 flex-1">
            {distribuicao.map((d, idx) => (
              <LegendRow
                key={idx}
                cor={d.cor}
                label={d.label}
                valor={d.valor}
                pct={precoFinal > 0 ? (d.valor / precoFinal) * 100 : 0}
              />
            ))}
          </div>
        </div>
      </CardBox>

      <CardBox
        title={`Projeção Mensal (${estimativaVendas} vendas)`}
        icon={<Calendar size={14} className="text-slate-400" />}
        iconBg="bg-slate-900/70"
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3 text-center">
            <p className="text-xs font-semibold text-slate-300">Faturamento</p>
            <p className="mt-0.5 tabular-nums text-lg font-black text-slate-50">
              {formatBRL(projecaoFaturamento)}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Lucro Líquido
            </p>
            <p className="mt-0.5 tabular-nums text-lg font-black text-emerald-700 dark:text-emerald-400">
              {formatBRL(projecaoLucro)}
            </p>
          </div>
        </div>
        {custos.ads > 0 && <Row label="Investimento em Ads" value={formatBRL(projecaoAds)} />}
        <Row label="Comissões ML" value={formatBRL(projecaoComissao)} />
      </CardBox>

      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 print:hidden">
        <div className="flex items-center gap-2.5 border-b border-slate-800 px-5 py-3.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900/70">
            <Share2 size={14} className="text-slate-400" />
          </div>
          <span className="text-sm font-semibold text-slate-100">
            Exportar Resultados
          </span>
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
            {copied ? <CheckCircle size={14} /> : <Copy size={14} />}{" "}
            {copied ? "Copiado!" : "Copiar Texto"}
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

