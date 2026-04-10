"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Save, RotateCcw } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveMarketplaceProduct } from "@/lib/saveMarketplaceProduct";
import { useCalculatorStore } from "@/store/calculatorStore";
import ProductNameAutocomplete from "@/components/marketplaces/shared/ProductNameAutocomplete";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtPct(v: number) {
  return `${(v ?? 0).toFixed(2)}%`;
}

type MachineProfileId =
  | "custom"
  | "mercado_pago"
  | "pagseguro"
  | "ton"
  | "sumup"
  | "stone"
  | "infinitepay";

type MachineRateTable = Record<number, number>; // installments -> fee percent

const DEFAULT_INSTALLMENT_TABLE: MachineRateTable = {
  1: 4.99,
  2: 6.49,
  3: 7.49,
  4: 8.49,
  5: 9.49,
  6: 10.49,
  7: 11.49,
  8: 12.49,
  9: 13.49,
  10: 14.49,
  11: 15.49,
  12: 16.49,
};

const MACHINE_PROFILES: Array<{ id: MachineProfileId; label: string; table: MachineRateTable }> = [
  { id: "custom", label: "Personalizado", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "mercado_pago", label: "Mercado Pago", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "pagseguro", label: "PagSeguro", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "ton", label: "Ton", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "sumup", label: "SumUp", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "stone", label: "Stone", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "infinitepay", label: "InfinitePay", table: DEFAULT_INSTALLMENT_TABLE },
];

type CalcMode = "margem" | "receber_liquido";

function clampNum(v: number, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = Number.isFinite(v) ? v : 0;
  return Math.min(max, Math.max(min, n));
}

function calcGrossFromTarget({
  targetNetReceive,
  taxPercent,
  cardFeePercent,
}: {
  targetNetReceive: number;
  taxPercent: number;
  cardFeePercent: number;
}) {
  const tax = clampNum(taxPercent) / 100;
  const fee = clampNum(cardFeePercent) / 100;
  const denom = 1 - tax - fee;
  return denom > 0 ? targetNetReceive / denom : 0;
}

function calcGrossForMargin({
  cost,
  marginPercent,
  taxPercent,
  cardFeePercent,
}: {
  cost: number;
  marginPercent: number;
  taxPercent: number;
  cardFeePercent: number;
}) {
  const desired = clampNum(marginPercent) / 100;
  const tax = clampNum(taxPercent) / 100;
  const fee = clampNum(cardFeePercent) / 100;
  const denom = 1 - desired - tax - fee;
  return denom > 0 ? cost / denom : 0;
}

function calcNetReceive({
  grossPrice,
  taxPercent,
  cardFeePercent,
}: {
  grossPrice: number;
  taxPercent: number;
  cardFeePercent: number;
}) {
  const tax = grossPrice * (clampNum(taxPercent) / 100);
  const fee = grossPrice * (clampNum(cardFeePercent) / 100);
  return grossPrice - tax - fee;
}

function applyCardFeeOnTop(baseGross: number, cardFeePercent: number) {
  const fee = clampNum(cardFeePercent) / 100;
  const denom = 1 - fee;
  return denom > 0 ? baseGross / denom : 0;
}

export default function VendaDiretaCalculatorPage() {
  const router = useRouter();
  const { settings } = useSettingsStore();
  const { user } = useAuthStore();
  const addProduct = useProductsStore((s) => s.addProduct);
  const lastResults = useCalculatorStore((s) => s.lastResults);
  const lastInput = useCalculatorStore((s) => s.lastInput);

  const [nomeProduto, setNomeProduto] = useState("");
  const [custo, setCusto] = useState(0);
  const [margem, setMargem] = useState(25);
  const [imposto, setImposto] = useState(0);

  // Novos controles
  const [mode, setMode] = useState<CalcMode>("margem");
  const [targetNet, setTargetNet] = useState(100);
  const [pixDiscountPercent, setPixDiscountPercent] = useState(0);

  const [machineProfile, setMachineProfile] = useState<MachineProfileId>("custom");
  const [installments, setInstallments] = useState(6);
  const selectedMachine = useMemo(
    () => MACHINE_PROFILES.find((p) => p.id === machineProfile) ?? MACHINE_PROFILES[0]!,
    [machineProfile],
  );
  const machineTable = selectedMachine.table;
  const feeForInstallments = machineTable[installments] ?? machineTable[1] ?? 0;

  // Antecipação
  const [anticipationEnabled, setAnticipationEnabled] = useState(false);
  const [anticipationRatePerMonth, setAnticipationRatePerMonth] = useState(0);
  const [receiveDays, setReceiveDays] = useState<30 | 14 | 2>(30);
  const anticipationPercent = anticipationEnabled
    ? clampNum(anticipationRatePerMonth) * (clampNum(receiveDays) / 30)
    : 0;

  const lastCost = useMemo(() => {
    const c = lastResults?.custoTotalAjustado;
    return typeof c === "number" && Number.isFinite(c) ? c : null;
  }, [lastResults?.custoTotalAjustado]);

  const basePrice = useMemo(() => {
    const taxPercent = clampNum(imposto);
    if (mode === "receber_liquido") {
      // “Quero receber limpo”: base do PIX é independente de taxa do cartão.
      return calcGrossFromTarget({
        targetNetReceive: clampNum(targetNet),
        taxPercent,
        cardFeePercent: 0,
      });
    }
    // Meta de margem: base não depende de taxa do cartão.
    return calcGrossForMargin({
      cost: clampNum(custo),
      marginPercent: clampNum(margem),
      taxPercent,
      cardFeePercent: 0,
    });
  }, [mode, custo, margem, imposto, targetNet]);

  const pricePix = useMemo(() => {
    const discount = clampNum(pixDiscountPercent) / 100;
    return Math.max(0, basePrice * (1 - discount));
  }, [basePrice, pixDiscountPercent]);

  const priceCard = useMemo(() => {
    const taxPercent = clampNum(imposto);
    const cardFeePercent = clampNum(feeForInstallments) + clampNum(anticipationPercent);
    if (mode === "receber_liquido") {
      // No modo “receber limpo”, cartão calcula independente (taxa entra aqui).
      return calcGrossFromTarget({
        targetNetReceive: clampNum(targetNet),
        taxPercent,
        cardFeePercent,
      });
    }
    // Meta de margem: cartão deriva do base adicionando apenas a taxa do cartão (parcelamento/antecipação).
    return applyCardFeeOnTop(basePrice, cardFeePercent);
  }, [mode, basePrice, imposto, feeForInstallments, anticipationPercent, targetNet]);

  const parcelaValue = useMemo(() => {
    const n = Math.max(1, Math.round(clampNum(installments, 1, 12)));
    return priceCard / n;
  }, [priceCard, installments]);

  const netCard = useMemo(() => {
    const taxPercent = clampNum(imposto);
    const cardFeePercent = clampNum(feeForInstallments) + clampNum(anticipationPercent);
    return calcNetReceive({ grossPrice: priceCard, taxPercent, cardFeePercent });
  }, [priceCard, imposto, feeForInstallments, anticipationPercent]);

  const netPix = useMemo(() => {
    // PIX: sem taxa de maquininha; só imposto (se informado)
    return calcNetReceive({ grossPrice: pricePix, taxPercent: clampNum(imposto), cardFeePercent: 0 });
  }, [pricePix, imposto]);

  const lucroPix = useMemo(() => netPix - clampNum(custo), [netPix, custo]);
  const lucroCard = useMemo(() => netCard - clampNum(custo), [netCard, custo]);

  const diffPixVsCardPct = useMemo(() => {
    if (pricePix <= 0) return 0;
    return ((priceCard - pricePix) / pricePix) * 100;
  }, [pricePix, priceCard]);

  async function handleSave() {
    const customName = nomeProduto.trim();
    const name =
      customName ||
      "Simulação " +
        new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });

    await saveMarketplaceProduct({
      payload: {
        name,
        weightGrams: 0,
        channelPrice: pricePix,
        channelMarginPercent: Number.isFinite(margem) ? margem : null,
        marketplace: "Venda Direta",
        suggestedPriceDirect: pricePix,
        totalCost: custo,
      },
      settings,
      user,
      addProduct,
      router,
    });
  }

  function buildWhatsAppText() {
    const n = Math.max(1, Math.round(clampNum(installments, 1, 12)));
    return `
💰 *Formas de pagamento*

${nomeProduto.trim() ? `📦 *Produto:* ${nomeProduto.trim()}\n` : ""}PIX: ${fmtBRL(pricePix)}
Cartão ${n}x: ${fmtBRL(parcelaValue)} (${fmtBRL(priceCard)})

📊 Diferença PIX vs Cartão: +${diffPixVsCardPct.toFixed(1)}%
    `.trim();
  }

  async function handleCopyWhatsApp() {
    const text = buildWhatsAppText();
    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Calculadora venda direta
            </p>
            <p className="mt-1 text-sm text-slate-300">
              Precificação para PIX e cartão, com margem e taxas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setNomeProduto("");
              setCusto(0);
              setMargem(25);
              setImposto(0);
              setMode("margem");
              setTargetNet(100);
              setPixDiscountPercent(0);
              setMachineProfile("custom");
              setInstallments(6);
              setAnticipationEnabled(false);
              setAnticipationRatePerMonth(0);
              setReceiveDays(30);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div className="glass-panel rounded-2xl p-5 space-y-4">
          <ProductNameAutocomplete
            label="Nome do produto (opcional)"
            value={nomeProduto}
            onChange={setNomeProduto}
            placeholder="Ex.: Suporte de celular"
            onPick={(p) => {
              setNomeProduto(p.name);
              if (typeof p.totalCost === "number" && Number.isFinite(p.totalCost)) {
                setCusto(p.totalCost);
              }
            }}
          />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Custo unitário
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (lastCost != null) setCusto(lastCost);
                      const suggestedName =
                        typeof lastInput?.productName === "string"
                          ? lastInput.productName.trim()
                          : "";
                      if (suggestedName && !nomeProduto.trim()) setNomeProduto(suggestedName);
                    }}
                    disabled={lastCost == null}
                    className="text-[11px] font-semibold text-emerald-300 disabled:opacity-50"
                  >
                    usar último custo 3D
                  </button>
                </div>
                <input
                  type="number"
                  value={custo}
                  onChange={(e) => setCusto(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Modo de cálculo
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.currentTarget.value as CalcMode)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  <option value="margem">Meta de margem (%)</option>
                  <option value="receber_liquido">Quero receber (líquido)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  {mode === "margem" ? "Margem desejada (%)" : "Quero receber (R$) líquido"}
                </label>
                {mode === "margem" ? (
                  <input
                    type="number"
                    value={margem}
                    onChange={(e) => setMargem(parseFloat(e.currentTarget.value) || 0)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                ) : (
                  <input
                    type="number"
                    value={targetNet}
                    onChange={(e) => setTargetNet(parseFloat(e.currentTarget.value) || 0)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                )}
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Imposto (%)
                </label>
                <input
                  type="number"
                  value={imposto}
                  onChange={(e) => setImposto(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Desconto PIX (%)
                </label>
                <input
                  type="number"
                  value={pixDiscountPercent}
                  onChange={(e) => setPixDiscountPercent(parseFloat(e.currentTarget.value) || 0)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Selecionar maquininha
                </label>
                <select
                  value={machineProfile}
                  onChange={(e) => setMachineProfile(e.currentTarget.value as MachineProfileId)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  {MACHINE_PROFILES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                  Parcelamento (1x até 12x)
                </label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(parseInt(e.currentTarget.value, 10) || 1)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-3 px-4 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x ({fmtPct(machineTable[n] ?? 0)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">Antecipação</span>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={anticipationEnabled}
                    onChange={(e) => setAnticipationEnabled(e.currentTarget.checked)}
                    className="h-4 w-4 accent-emerald-400"
                  />
                  Antecipação automática
                </label>
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Taxa antecipação (% ao mês)
                  </label>
                  <input
                    type="number"
                    value={anticipationRatePerMonth}
                    onChange={(e) => setAnticipationRatePerMonth(parseFloat(e.currentTarget.value) || 0)}
                    disabled={!anticipationEnabled}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Prazo recebimento
                  </label>
                  <select
                    value={receiveDays}
                    onChange={(e) => setReceiveDays(parseInt(e.currentTarget.value, 10) as 30 | 14 | 2)}
                    disabled={!anticipationEnabled}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                  >
                    <option value={30}>30 dias</option>
                    <option value={14}>14 dias</option>
                    <option value={2}>2 dias</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] mb-2 text-slate-400">
                    Taxa efetiva
                  </label>
                  <div className="w-full rounded-xl border border-slate-800 bg-slate-950/40 py-2.5 px-3 text-sm text-slate-100">
                    {anticipationEnabled ? fmtPct(anticipationPercent) : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-neon-emerald disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Salvar produto
              </button>
            </div>
          </div>

        <div className="glass-panel rounded-2xl p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Preço PIX
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-50 tabular-nums">
                  {fmtBRL(pricePix)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Valor total: {fmtBRL(pricePix)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  Preço cartão ({installments}x)
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-50 tabular-nums">
                  {fmtBRL(priceCard)}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {installments}x de {fmtBRL(parcelaValue)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 print:hidden">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-sm text-slate-300">Lucro (PIX)</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-300">
                  {fmtBRL(lucroPix)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-slate-300">Lucro (Cartão)</span>
                <span className="text-sm font-semibold tabular-nums text-emerald-300">
                  {fmtBRL(lucroCard)}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Diferença PIX vs Cartão
              </p>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">PIX</p>
                  <p className="mt-1 text-slate-50 tabular-nums font-semibold">{fmtBRL(pricePix)}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">Cartão {installments}x</p>
                  <p className="mt-1 text-slate-50 tabular-nums font-semibold">{fmtBRL(priceCard)}</p>
                </div>
                <div className="rounded-xl bg-slate-950/40 border border-slate-800 p-3">
                  <p className="text-slate-500">Diferença</p>
                  <p className="mt-1 text-amber-200 tabular-nums font-semibold">
                    +{diffPixVsCardPct.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Tabela de taxas (maquininha)
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      n === installments
                        ? "border-emerald-500/30 bg-emerald-500/10"
                        : "border-slate-800 bg-slate-950/40"
                    }`}
                  >
                    <span className="text-slate-300">{n}x</span>
                    <span className="tabular-nums text-slate-50 font-semibold">
                      {fmtPct(machineTable[n] ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Taxa cartão (selecionada): {fmtPct(feeForInstallments)}{" "}
                {anticipationEnabled ? `+ antecipação ${fmtPct(anticipationPercent)}` : ""}
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4 print:hidden">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Simulação de lucro por forma de pagamento
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-xs">
                  <thead className="bg-slate-900/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-300">Forma</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">Preço</th>
                      <th className="px-3 py-2 text-right font-semibold text-slate-300">Lucro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">PIX</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">{fmtBRL(pricePix)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtBRL(lucroPix)}</td>
                    </tr>
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">Crédito {installments}x</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">{fmtBRL(priceCard)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{fmtBRL(lucroCard)}</td>
                    </tr>
                    <tr className="bg-slate-950/20">
                      <td className="px-3 py-2 text-slate-200">Parcela (cliente)</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-100">
                        {installments}x de {fmtBRL(parcelaValue)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopyWhatsApp()}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/15"
                >
                  <Copy className="h-4 w-4" />
                  Copiar preço para WhatsApp
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Copia um texto pronto com PIX e cartão {installments}x.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}

