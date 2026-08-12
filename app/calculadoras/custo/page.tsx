"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Save } from "lucide-react";
import { InputPanel } from "@/components/calculator/InputPanel";
import { useCalculator } from "@/hooks/useCalculator";
import { LAB_PRINTING_SUPPLY_FALLBACK_ID } from "@/lib/calculatorLabDefaults";
import { aplicarTaxaFalha } from "@/lib/precoCompleto";
import { useCalculatorStore } from "@/store/calculatorStore";
import { useSettingsStore } from "@/store/settingsStore";
import { calcularPrecoShopee } from "@/lib/engines/shopee/engine";
import { calcularPrecoML } from "@/lib/engines/ml/engine";
import { calcularPrecoVendaDireta } from "@/lib/engines/vendaDireta/engine";
import { calcularPrecoTikTok } from "@/lib/engines/tiktok/engine";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number) {
  return `${(v ?? 0).toFixed(1)}%`;
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4 text-sm text-slate-300">
      <span className="text-slate-400">{label}</span>
      <span className="shrink-0 tabular-nums text-slate-200">{fmtBRL(value)}</span>
    </div>
  );
}

function LucroHoraRow({ value }: { value: number | null }) {
  if (value == null) return null;
  return (
    <div className="flex justify-between gap-4 border-t border-slate-800 pt-1.5 text-sm">
      <span className="text-slate-400">
        Lucro/h <span className="text-slate-500">(comparativo)</span>
      </span>
      <span
        className={`shrink-0 tabular-nums font-semibold ${
          value >= 0 ? "text-emerald-300" : "text-rose-300"
        }`}
      >
        {fmtBRL(value)}/h
      </span>
    </div>
  );
}

/** Caixa de precificação rápida por marketplace, alimentada pelo preset ativo daquele canal. */
function MarketplacePresetBox({
  title,
  presetName,
  hasPreset,
  onConfigure,
  quickMargin,
  onQuickMarginChange,
  children,
}: {
  title: string;
  presetName?: string | null;
  hasPreset: boolean;
  onConfigure: () => void;
  quickMargin: number;
  onQuickMarginChange: (v: number) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</p>
          {hasPreset && presetName ? (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Preset: <span className="text-slate-300">{presetName}</span>
            </p>
          ) : null}
        </div>
        {hasPreset ? (
          <label className="flex items-center gap-2 text-[11px] text-slate-400">
            Margem %
            <input
              type="number"
              value={quickMargin}
              onChange={(e) => onQuickMarginChange(parseFloat(e.currentTarget.value) || 0)}
              className="w-16 rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-right text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/25"
            />
          </label>
        ) : null}
      </div>

      {hasPreset ? (
        <div className="mt-3">{children}</div>
      ) : (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 px-3 py-3">
          <p className="text-xs text-slate-500">Nenhum preset salvo pra esse canal ainda.</p>
          <button
            type="button"
            onClick={onConfigure}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Configurar
          </button>
        </div>
      )}
    </div>
  );
}

export default function Custo3DPage() {
  const router = useRouter();
  const { form, results } = useCalculator();
  const requestSave = useCalculatorStore((s) => s.requestSave);
  const { settings } = useSettingsStore();
  const [saving, setSaving] = useState(false);

  const unitCost = useMemo(() => {
    if (!results) return null;
    const adj = results.custoTotalAjustado;
    if (typeof adj === "number" && Number.isFinite(adj)) return Math.max(0, adj);
    return Math.max(0, Number(results.totalCost ?? 0));
  }, [results]);

  const mp = settings.marketplacePresets;
  const activeShopeePreset = mp.shopee.find((p) => p.id === mp.activeShopeeId) ?? null;
  const activeMlPreset = mp.mercadoLivre.find((p) => p.id === mp.activeMercadoLivreId) ?? null;
  const activeVdPreset = mp.vendaDireta.find((p) => p.id === mp.activeVendaDiretaId) ?? null;
  const activeTiktokPreset = mp.tiktok.find((p) => p.id === mp.activeTiktokId) ?? null;

  const [shopeeQuickMargin, setShopeeQuickMargin] = useState(20);
  useEffect(() => {
    if (activeShopeePreset) setShopeeQuickMargin(activeShopeePreset.inputs.metaLucroPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeShopeePreset?.id]);

  const [mlQuickMargin, setMlQuickMargin] = useState(20);
  useEffect(() => {
    if (activeMlPreset) setMlQuickMargin(activeMlPreset.inputs.metaLucroPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMlPreset?.id]);

  const [vdQuickMargin, setVdQuickMargin] = useState(25);
  useEffect(() => {
    if (activeVdPreset) setVdQuickMargin(activeVdPreset.inputs.margem);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVdPreset?.id]);

  const [tiktokQuickMargin, setTiktokQuickMargin] = useState(20);
  useEffect(() => {
    if (activeTiktokPreset) setTiktokQuickMargin(activeTiktokPreset.inputs.metaLucroPercent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTiktokPreset?.id]);

  const shopeeResult = useMemo(() => {
    if (!activeShopeePreset || unitCost == null) return null;
    return calcularPrecoShopee({
      ...activeShopeePreset.inputs,
      fullCustoUnidade: unitCost,
      valorCompra: 0,
      modo: "margem",
      metaLucroPercent: shopeeQuickMargin,
    });
  }, [activeShopeePreset, unitCost, shopeeQuickMargin]);

  const mlResult = useMemo(() => {
    if (!activeMlPreset || unitCost == null) return null;
    return calcularPrecoML({
      ...activeMlPreset.inputs,
      fullCustoUnidade: unitCost,
      valorCompra: 0,
      modo: "margem",
      metaLucroPercent: mlQuickMargin,
    });
  }, [activeMlPreset, unitCost, mlQuickMargin]);

  const vdResult = useMemo(() => {
    if (!activeVdPreset || unitCost == null) return null;
    return calcularPrecoVendaDireta({
      ...activeVdPreset.inputs,
      fullCustoUnidade: unitCost,
      mode: "margem",
      margem: vdQuickMargin,
    });
  }, [activeVdPreset, unitCost, vdQuickMargin]);

  const tiktokResult = useMemo(() => {
    if (!activeTiktokPreset || unitCost == null) return null;
    return calcularPrecoTikTok({
      ...activeTiktokPreset.inputs,
      fullCustoUnidade: unitCost,
      valorCompra: 0,
      modo: "margem",
      metaLucroPercent: tiktokQuickMargin,
    });
  }, [activeTiktokPreset, unitCost, tiktokQuickMargin]);

  // Horas de impressão por peça (mesma base usada pelo motor genérico), pra calcular
  // lucro/h independente por marketplace e comparar qual canal vale mais produzir em escala.
  const hoursPerUnit = results?.printHoursPerUnit ?? 0;
  const shopeeLucroHora =
    shopeeResult && hoursPerUnit > 0 ? shopeeResult.lucroLiquido / hoursPerUnit : null;
  const mlLucroHora = mlResult && hoursPerUnit > 0 ? mlResult.lucro / hoursPerUnit : null;
  const vdLucroHoraPix =
    vdResult && hoursPerUnit > 0 ? vdResult.lucroPix / hoursPerUnit : null;
  const vdLucroHoraCard =
    vdResult && hoursPerUnit > 0 ? vdResult.lucroCard / hoursPerUnit : null;
  const tiktokLucroHora =
    tiktokResult && hoursPerUnit > 0 ? tiktokResult.lucroLiquido / hoursPerUnit : null;

  const custoBreakdown = useMemo(() => {
    if (!results) return null;
    const f = Number(results.filamentCost ?? 0);
    const e = Number(results.energyCost ?? 0);
    const d = Number(results.depreciationCost ?? 0);
    const p = Number(results.packagingCost ?? 0);
    const labor = Number(results.maoDeObraCusto ?? 0);
    const taxa = Number(results.taxaFalhaPercent ?? 0);
    const mioloSemEmbalagem = f + e + d;
    const mioloComFalha = aplicarTaxaFalha(mioloSemEmbalagem, taxa);
    const impactoFalha = Math.max(0, mioloComFalha - mioloSemEmbalagem);
    return { f, e, d, p, labor, taxa, impactoFalha };
  }, [results]);

  return (
    <div className="space-y-4">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <InputPanel
            form={form}
            hidePricingSection
            materialSupplyFallbackId={LAB_PRINTING_SUPPLY_FALLBACK_ID}
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              Custo unitário (base)
            </p>
            <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-300">
              {unitCost != null ? fmtBRL(unitCost) : "—"}
            </p>

            {results && custoBreakdown && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  O que compõe esse valor
                </p>
                <div className="mt-3 space-y-2">
                  <Row label="Filamento (por unidade)" value={custoBreakdown.f} />
                  <Row label="Energia elétrica (por unidade)" value={custoBreakdown.e} />
                  <Row label="Depreciação e custos fixos da impressora" value={custoBreakdown.d} />
                  <Row label="Embalagem" value={custoBreakdown.p} />
                  {custoBreakdown.impactoFalha > 0.0005 && (
                    <Row
                      label={`Taxa de falha (${custoBreakdown.taxa}% sobre impressão)`}
                      value={custoBreakdown.impactoFalha}
                    />
                  )}
                  {custoBreakdown.labor > 0.0005 && (
                    <Row label="Mão de obra (por peça)" value={custoBreakdown.labor} />
                  )}
                </div>
                <div className="mt-3 flex justify-between gap-4 border-t border-slate-800 pt-3 text-sm font-semibold text-slate-100">
                  <span>Total (custo ajustado)</span>
                  <span className="tabular-nums text-cyan-200">
                    {unitCost != null ? fmtBRL(unitCost) : "—"}
                  </span>
                </div>
                {custoBreakdown.taxa > 0 && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    A taxa de falha incide sobre filamento, energia e depreciação (não sobre
                    embalagem).
                  </p>
                )}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!results || saving}
                onClick={() => {
                  setSaving(true);
                  requestSave("venda_direta");
                  window.setTimeout(() => setSaving(false), 600);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-neon-cyan disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar produto (base)
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/shopee")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Shopee
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/mercado-livre")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Mercado Livre
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/tiktok")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para TikTok Shop
              </button>
              <button
                type="button"
                disabled={unitCost == null}
                onClick={() => router.push("/calculadoras/venda-direta")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-semibold text-slate-100 hover:bg-slate-900"
              >
                <ArrowRight className="h-4 w-4" />
                Ir para Venda Direta
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Dica: nas calculadoras de canal, use o botão “Usar custo do último cálculo 3D”.
            </p>
          </div>

          <MarketplacePresetBox
            title="Shopee"
            presetName={activeShopeePreset?.name}
            hasPreset={!!activeShopeePreset}
            onConfigure={() => router.push("/calculadoras/shopee")}
            quickMargin={shopeeQuickMargin}
            onQuickMarginChange={setShopeeQuickMargin}
          >
            {shopeeResult && (
              <div className="space-y-1.5">
                <Row label="Preço sugerido" value={shopeeResult.precoFinalSugerido} />
                <Row label="Lucro líquido" value={shopeeResult.lucroLiquido} />
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Margem real</span>
                  <span
                    className={`shrink-0 tabular-nums font-semibold ${
                      shopeeResult.margemReal >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {fmtPct(shopeeResult.margemReal)}
                  </span>
                </div>
                <LucroHoraRow value={shopeeLucroHora} />
              </div>
            )}
          </MarketplacePresetBox>

          <MarketplacePresetBox
            title="Mercado Livre"
            presetName={activeMlPreset?.name}
            hasPreset={!!activeMlPreset}
            onConfigure={() => router.push("/calculadoras/mercado-livre")}
            quickMargin={mlQuickMargin}
            onQuickMarginChange={setMlQuickMargin}
          >
            {mlResult && (
              <div className="space-y-1.5">
                <Row label="Preço sugerido" value={mlResult.precoFinal} />
                <Row label="Lucro líquido" value={mlResult.lucro} />
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Margem real</span>
                  <span
                    className={`shrink-0 tabular-nums font-semibold ${
                      mlResult.margem >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {fmtPct(mlResult.margem)}
                  </span>
                </div>
                <LucroHoraRow value={mlLucroHora} />
              </div>
            )}
          </MarketplacePresetBox>

          <MarketplacePresetBox
            title="TikTok Shop"
            presetName={activeTiktokPreset?.name}
            hasPreset={!!activeTiktokPreset}
            onConfigure={() => router.push("/calculadoras/tiktok")}
            quickMargin={tiktokQuickMargin}
            onQuickMarginChange={setTiktokQuickMargin}
          >
            {tiktokResult && (
              <div className="space-y-1.5">
                <Row label="Preço sugerido" value={tiktokResult.precoFinalSugerido} />
                <Row label="Lucro líquido" value={tiktokResult.lucroLiquido} />
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-slate-400">Margem real</span>
                  <span
                    className={`shrink-0 tabular-nums font-semibold ${
                      tiktokResult.margemReal >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {fmtPct(tiktokResult.margemReal)}
                  </span>
                </div>
                <LucroHoraRow value={tiktokLucroHora} />
              </div>
            )}
          </MarketplacePresetBox>

          <MarketplacePresetBox
            title="Venda Direta"
            presetName={activeVdPreset?.name}
            hasPreset={!!activeVdPreset}
            onConfigure={() => router.push("/calculadoras/venda-direta")}
            quickMargin={vdQuickMargin}
            onQuickMarginChange={setVdQuickMargin}
          >
            {vdResult && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">PIX</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-100">
                    {fmtBRL(vdResult.pricePix)}
                  </p>
                  <p
                    className={`mt-1 text-xs tabular-nums ${
                      vdResult.lucroPix >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    lucro {fmtBRL(vdResult.lucroPix)}
                  </p>
                  {vdLucroHoraPix != null && (
                    <p
                      className={`text-[11px] tabular-nums ${
                        vdLucroHoraPix >= 0 ? "text-emerald-300/80" : "text-rose-300/80"
                      }`}
                    >
                      {fmtBRL(vdLucroHoraPix)}/h
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Cartão</p>
                  <p className="mt-1 text-sm font-bold tabular-nums text-slate-100">
                    {fmtBRL(vdResult.priceCard)}
                  </p>
                  <p
                    className={`mt-1 text-xs tabular-nums ${
                      vdResult.lucroCard >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    lucro {fmtBRL(vdResult.lucroCard)}
                  </p>
                  {vdLucroHoraCard != null && (
                    <p
                      className={`text-[11px] tabular-nums ${
                        vdLucroHoraCard >= 0 ? "text-emerald-300/80" : "text-rose-300/80"
                      }`}
                    >
                      {fmtBRL(vdLucroHoraCard)}/h
                    </p>
                  )}
                </div>
              </div>
            )}
          </MarketplacePresetBox>
        </div>
      </div>
    </div>
  );
}

