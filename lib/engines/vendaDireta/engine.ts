export type MachineProfileId =
  | "custom"
  | "mercado_pago"
  | "pagseguro"
  | "ton"
  | "sumup"
  | "stone"
  | "infinitepay";

export type MachineRateTable = Record<number, number>; // installments -> fee percent

export const DEFAULT_INSTALLMENT_TABLE: MachineRateTable = {
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

export const MACHINE_PROFILES: Array<{ id: MachineProfileId; label: string; table: MachineRateTable }> = [
  { id: "custom", label: "Personalizado", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "mercado_pago", label: "Mercado Pago", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "pagseguro", label: "PagSeguro", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "ton", label: "Ton", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "sumup", label: "SumUp", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "stone", label: "Stone", table: DEFAULT_INSTALLMENT_TABLE },
  { id: "infinitepay", label: "InfinitePay", table: DEFAULT_INSTALLMENT_TABLE },
];

export type VendaDiretaCalcMode = "margem" | "receber_liquido";

export type VendaDiretaInputs = {
  /** Custo final vindo do módulo de custo 3D (opcional, mesmo padrão de ShopeeInputs/MlInputs). */
  fullCustoUnidade: number;
  margem: number;
  imposto: number;
  mode: VendaDiretaCalcMode;
  targetNet: number;
  pixDiscountPercent: number;
  machineProfile: MachineProfileId;
  installments: number;
  anticipationEnabled: boolean;
  anticipationRatePerMonth: number;
  receiveDays: 30 | 14 | 2;
};

export type VendaDiretaResult = {
  pricePix: number;
  priceCard: number;
  parcelaValue: number;
  netPix: number;
  netCard: number;
  lucroPix: number;
  lucroCard: number;
  diffPixVsCardPct: number;
  feeForInstallments: number;
  anticipationPercent: number;
};

export function clampNum(v: number, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = Number.isFinite(v) ? v : 0;
  return Math.min(max, Math.max(min, n));
}

export function calcGrossFromTarget({
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

export function calcGrossForMargin({
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

export function calcNetReceive({
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

export function applyCardFeeOnTop(baseGross: number, cardFeePercent: number) {
  const fee = clampNum(cardFeePercent) / 100;
  const denom = 1 - fee;
  return denom > 0 ? baseGross / denom : 0;
}

export function formatBRL(v: number) {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(v: number) {
  return `${(v ?? 0).toFixed(2)}%`;
}

export function calcularPrecoVendaDireta(inputs: VendaDiretaInputs): VendaDiretaResult {
  const {
    fullCustoUnidade,
    margem,
    imposto,
    mode,
    targetNet,
    pixDiscountPercent,
    machineProfile,
    installments,
    anticipationEnabled,
    anticipationRatePerMonth,
    receiveDays,
  } = inputs;

  const selectedMachine =
    MACHINE_PROFILES.find((p) => p.id === machineProfile) ?? MACHINE_PROFILES[0]!;
  const machineTable = selectedMachine.table;
  const feeForInstallments = machineTable[installments] ?? machineTable[1] ?? 0;

  const anticipationPercent = anticipationEnabled
    ? clampNum(anticipationRatePerMonth) * (clampNum(receiveDays) / 30)
    : 0;

  const taxPercent = clampNum(imposto);

  const basePrice =
    mode === "receber_liquido"
      ? calcGrossFromTarget({ targetNetReceive: clampNum(targetNet), taxPercent, cardFeePercent: 0 })
      : calcGrossForMargin({
          cost: clampNum(fullCustoUnidade),
          marginPercent: clampNum(margem),
          taxPercent,
          cardFeePercent: 0,
        });

  const discount = clampNum(pixDiscountPercent) / 100;
  const pricePix = Math.max(0, basePrice * (1 - discount));

  const cardFeePercent = clampNum(feeForInstallments) + clampNum(anticipationPercent);
  const priceCard =
    mode === "receber_liquido"
      ? calcGrossFromTarget({ targetNetReceive: clampNum(targetNet), taxPercent, cardFeePercent })
      : applyCardFeeOnTop(basePrice, cardFeePercent);

  const n = Math.max(1, Math.round(clampNum(installments, 1, 12)));
  const parcelaValue = priceCard / n;

  const netCard = calcNetReceive({ grossPrice: priceCard, taxPercent, cardFeePercent });
  const netPix = calcNetReceive({ grossPrice: pricePix, taxPercent, cardFeePercent: 0 });

  const lucroPix = netPix - clampNum(fullCustoUnidade);
  const lucroCard = netCard - clampNum(fullCustoUnidade);

  const diffPixVsCardPct = pricePix <= 0 ? 0 : ((priceCard - pricePix) / pricePix) * 100;

  return {
    pricePix,
    priceCard,
    parcelaValue,
    netPix,
    netCard,
    lucroPix,
    lucroCard,
    diffPixVsCardPct,
    feeForInstallments,
    anticipationPercent,
  };
}
