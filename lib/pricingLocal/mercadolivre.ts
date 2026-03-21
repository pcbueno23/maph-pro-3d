import type { MLListingType, MLReputation } from "./types";

/**
 * Taxa fixa ML para anúncios Premium em itens &lt; R$ 79 (aprox. tabela histórica).
 * Clássico: no app principal usa fixo R$ 6,50; aqui repetimos para o lab.
 */
const ML_PREMIUM_FIXED_BANDS: { max: number; fee: number }[] = [
  { max: 12.5, fee: 6.25 },
  { max: 29, fee: 6.25 },
  { max: 50, fee: 6.5 },
  { max: 79, fee: 6.75 },
];

function mlPremiumFixedFee(price: number): number {
  if (price >= 79) return 0;
  const band = ML_PREMIUM_FIXED_BANDS.find((b) => price <= b.max);
  return band ? band.fee : price / 2;
}

const CLASSIC_FLAT_FIXED = 6.5;

export function getMercadoLivreFees(
  price: number,
  listing: MLListingType,
  commissionPercent: number
): {
  percentDecimal: number;
  fixedFee: number;
} {
  const pct = Math.max(0, Math.min(0.5, commissionPercent / 100));
  const fixedFee =
    listing === "classico" ? CLASSIC_FLAT_FIXED : mlPremiumFixedFee(price);
  return { percentDecimal: pct, fixedFee };
}

/**
 * Faixas de preço do produto (R$) — colunas da tabela de frete ML (lab).
 * Ordem: 0–18,99 | 19–48,99 | 49–78,99 | 79–99,99 | 100–119,99 | 120–149,99 | 150–199,99 | ≥200
 */
export const ML_FREIGHT_PRICE_MAX: number[] = [
  18.99, 48.99, 78.99, 99.99, 119.99, 149.99, 199.99, Number.POSITIVE_INFINITY,
];

/**
 * Tabela de frete (R$) pago pelo vendedor: [faixa de peso][faixa de preço].
 * Peso em kg; preço = preço de venda do anúncio.
 * Fonte: tabela fornecida pelo usuário (reputação verde / sem ajuste).
 * Linha “Mais de 150 kg”: colunas 4–8 extrapoladas (a colagem original parou em R$ 166,15).
 */
const ML_FREIGHT_MATRIX: number[][] = [
  [5.65, 6.55, 7.75, 12.35, 14.35, 16.45, 18.45, 20.95],
  [5.95, 6.65, 7.85, 13.25, 15.45, 17.65, 19.85, 22.55],
  [6.05, 6.75, 7.95, 13.85, 16.15, 18.45, 20.75, 23.65],
  [6.15, 6.85, 8.05, 14.15, 16.45, 18.85, 21.15, 24.65],
  [6.25, 6.95, 8.15, 14.45, 16.85, 19.25, 21.65, 24.65],
  [6.35, 7.95, 8.55, 15.75, 18.35, 21.05, 23.65, 26.25],
  [6.45, 8.15, 8.95, 17.05, 19.85, 22.65, 25.55, 28.35],
  [6.55, 8.35, 9.75, 18.45, 21.55, 24.65, 27.75, 30.75],
  [6.65, 8.55, 9.95, 25.45, 28.55, 32.65, 35.75, 39.75],
  [6.75, 8.75, 10.15, 27.05, 31.05, 36.05, 40.05, 44.05],
  [6.85, 8.95, 10.35, 28.85, 33.65, 38.45, 43.25, 48.05],
  [6.95, 9.15, 10.55, 29.65, 34.55, 39.55, 44.45, 49.35],
  [7.05, 9.55, 10.95, 41.25, 48.05, 54.95, 61.75, 68.65],
  [7.15, 9.95, 11.35, 42.15, 49.25, 56.25, 63.25, 70.25],
  [7.25, 10.15, 11.55, 45.05, 52.45, 59.95, 67.45, 74.95],
  [7.35, 10.35, 11.75, 48.55, 56.05, 63.55, 70.75, 78.65],
  [7.45, 10.55, 11.95, 54.75, 63.85, 72.95, 82.05, 91.15],
  [7.65, 10.95, 12.15, 64.05, 75.05, 84.75, 95.35, 105.95],
  [7.75, 11.15, 12.35, 65.95, 75.45, 85.55, 96.25, 106.95],
  [7.85, 11.35, 12.55, 67.75, 78.95, 88.95, 99.15, 107.05],
  [7.95, 11.55, 12.75, 70.25, 81.05, 92.05, 102.55, 110.75],
  [8.05, 11.75, 12.95, 74.95, 86.45, 98.15, 109.35, 118.15],
  [8.15, 11.95, 13.15, 80.25, 92.95, 105.05, 117.15, 126.55],
  [8.25, 12.15, 13.35, 83.95, 97.05, 109.85, 122.45, 132.25],
  [8.35, 12.35, 13.55, 93.25, 107.45, 122.05, 136.05, 146.95],
  [8.45, 12.55, 13.75, 106.55, 123.95, 139.55, 155.55, 167.95],
  [8.55, 12.75, 13.95, 119.25, 138.05, 156.05, 173.95, 187.95],
  [8.65, 12.75, 14.15, 126.55, 146.15, 165.65, 184.65, 199.45],
  // Mais de 150 kg: primeiras 3 colunas do usuário; demais = incremento sobre linha 125–150 kg
  [8.75, 12.95, 14.35, 133.85, 154.25, 166.15, 195.35, 211.05],
];

/** Rótulos das faixas de peso (para UI / debug). */
export const ML_FREIGHT_WEIGHT_ROW_LABELS: string[] = [
  "Até 0,3 kg",
  "De 0,3 a 0,5 kg",
  "De 0,5 a 1 kg",
  "De 1 a 1,5 kg",
  "De 1,5 a 2 kg",
  "De 2 a 3 kg",
  "De 3 a 4 kg",
  "De 4 a 5 kg",
  "De 5 a 6 kg",
  "De 6 a 7 kg",
  "De 7 a 8 kg",
  "De 8 a 9 kg",
  "De 9 a 11 kg",
  "De 11 a 13 kg",
  "De 13 a 15 kg",
  "De 15 a 17 kg",
  "De 17 a 20 kg",
  "De 20 a 25 kg",
  "De 25 a 30 kg",
  "De 30 a 40 kg",
  "De 40 a 50 kg",
  "De 50 a 60 kg",
  "De 60 a 70 kg",
  "De 70 a 80 kg",
  "De 80 a 90 kg",
  "De 90 a 100 kg",
  "De 100 a 125 kg",
  "De 125 a 150 kg",
  "Mais de 150 kg",
];

function getMlFreightPriceColumnIndex(price: number): number {
  const p = Math.max(0, price);
  for (let i = 0; i < ML_FREIGHT_PRICE_MAX.length; i++) {
    if (p <= ML_FREIGHT_PRICE_MAX[i]) return i;
  }
  return ML_FREIGHT_PRICE_MAX.length - 1;
}

function getMlFreightWeightRowIndex(weightKg: number): number {
  const w = Math.max(0, weightKg);
  if (w <= 0.3) return 0;
  if (w <= 0.5) return 1;
  if (w <= 1) return 2;
  if (w <= 1.5) return 3;
  if (w <= 2) return 4;
  if (w <= 3) return 5;
  if (w <= 4) return 6;
  if (w <= 5) return 7;
  if (w <= 6) return 8;
  if (w <= 7) return 9;
  if (w <= 8) return 10;
  if (w <= 9) return 11;
  if (w <= 11) return 12;
  if (w <= 13) return 13;
  if (w <= 15) return 14;
  if (w <= 17) return 15;
  if (w <= 20) return 16;
  if (w <= 25) return 17;
  if (w <= 30) return 18;
  if (w <= 40) return 19;
  if (w <= 50) return 20;
  if (w <= 60) return 21;
  if (w <= 70) return 22;
  if (w <= 80) return 23;
  if (w <= 90) return 24;
  if (w <= 100) return 25;
  if (w <= 125) return 26;
  if (w <= 150) return 27;
  return 28;
}

/** Valor base da tabela (verde / sem reputação), em R$. */
export function lookupMercadoLivreFreightTable(
  price: number,
  weightKg: number
): number {
  const pi = getMlFreightPriceColumnIndex(price);
  const wi = getMlFreightWeightRowIndex(weightKg);
  return ML_FREIGHT_MATRIX[wi][pi];
}

const REP_MULT: Record<MLReputation, number> = {
  verde_lider: 1,
  sem: 1,
  amarela: 1.12,
  vermelha: 1.28,
};

/**
 * Frete pago pelo vendedor conforme tabela (preço × peso).
 * Reputação amarela/vermelha aplica multiplicador aproximado sobre o valor base.
 */
export function estimateMercadoLivreFreightSeller(
  price: number,
  weightGrams: number,
  reputation: MLReputation
): number | null {
  const weightKg = weightGrams / 1000;
  if (!Number.isFinite(price) || !Number.isFinite(weightKg)) return null;
  const base = lookupMercadoLivreFreightTable(price, weightKg);
  const mult = REP_MULT[reputation] ?? 1;
  return Math.round(base * mult * 100) / 100;
}
