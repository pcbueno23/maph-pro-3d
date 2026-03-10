export const MARKETPLACES = ["Shopee", "Mercado Livre", "Amazon"] as const;

export type PersonType = "CPF" | "CNPJ";

export interface PrinterPreset {
  id: string;
  name: string;
  averagePowerW: number;
  peakPowerW: number;
}

export const PRINTER_PRESETS: PrinterPreset[] = [
  {
    id: "bambu-x1c",
    name: "Bambu Lab X1 Carbon",
    averagePowerW: 105,
    peakPowerW: 400,
  },
  {
    id: "bambu-p1s",
    name: "Bambu Lab P1S",
    averagePowerW: 105,
    peakPowerW: 280,
  },
  {
    id: "bambu-p1p",
    name: "Bambu Lab P1P",
    averagePowerW: 110,
    peakPowerW: 300,
  },
  {
    id: "bambu-a1",
    name: "Bambu Lab A1",
    averagePowerW: 95,
    peakPowerW: 350,
  },
  {
    id: "bambu-a1-mini",
    name: "Bambu Lab A1 Mini",
    averagePowerW: 85,
    peakPowerW: 280,
  },
  {
    id: "prusa-mk4",
    name: "Prusa MK4",
    averagePowerW: 100,
    peakPowerW: 160,
  },
  {
    id: "elegoo-neptune-4",
    name: "Elegoo Neptune 4",
    averagePowerW: 275,
    peakPowerW: 350,
  },
  {
    id: "elegoo-neptune-4-pro",
    name: "Elegoo Neptune 4 Pro",
    averagePowerW: 325,
    peakPowerW: 400,
  },
  {
    id: "creality-ender-3",
    name: "Creality Ender 3 Pro/V2",
    averagePowerW: 125,
    peakPowerW: 360,
  },
  {
    id: "creality-k1-max",
    name: "Creality K1 Max",
    averagePowerW: 990,
    peakPowerW: 1093,
  },
  {
    id: "anycubic-kobra-2",
    name: "Anycubic Kobra 2",
    averagePowerW: 150,
    peakPowerW: 400,
  },
];

// Taxas padrão aproximadas por marketplace e tipo de pessoa.
// São médias práticas que você pode ajustar manualmente na calculadora se precisar.
export const DEFAULT_MARKETPLACE_FEES: Record<
  (typeof MARKETPLACES)[number],
  Record<PersonType, number>
> = {
  Shopee: {
    // Ex.: 12% + taxa fixa diluída para tickets médios sem frete grátis.
    CPF: 18,
    // CNPJ geralmente tem comissão próxima de 14% + taxa fixa → média ~20%.
    CNPJ: 20,
  },
  "Mercado Livre": {
    // CPF (anúncio Clássico em categorias comuns).
    CPF: 16,
    // CNPJ tende a operar mais em anúncios Premium e full → margem maior.
    CNPJ: 18,
  },
  Amazon: {
    CPF: 15,
    CNPJ: 15,
  },
};

