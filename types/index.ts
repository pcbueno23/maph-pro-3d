import { z } from "zod";
import { MARKETPLACES } from "@/lib/constants";

export type Marketplace = (typeof MARKETPLACES)[number];

export const calculatorSchema = z
  .object({
  productName: z.string().optional(),
  material: z.object({
    // Peso unitário da peça. Obrigatório apenas quando houver 1 peça por impressão.
    weight: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    // Opcional: peso total da placa vindo do fatiador.
    // Quando informado junto com unitsPerBatch, usamos (pesoPlaca / unitsPerBatch)
    // como peso efetivo por peça nos cálculos.
    plateWeight: z
      .union([z.number(), z.nan(), z.undefined()])
      .optional()
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) && n > 0 ? n : undefined,
      ),
    pricePerKg: z.number().min(1, "Informe o custo do filamento/kg"),
    type: z.enum(["PLA", "ABS", "PETG"]),
  }),
  time: z.object({
    hours: z.number().min(0, "Tempo de impressão inválido"),
    powerW: z.number().min(10, "Potência inválida"),
    unitsPerBatch: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 1))
      .pipe(z.number().min(1))
      .default(1),
  }),
  costs: z.object({
    kwhPrice: z.number().min(0.01),
    printerCost: z.number().min(0),
    lifetimeHours: z.number().min(1),
    residualValue: z.number().min(0).default(0),
    annualMaintenance: z.number().min(0).default(0),
    infrastructureYear: z.number().min(0).default(0),
    yearlyPrintHours: z.number().min(0).default(1),
    packaging: z.number().min(0),
  }),
  pricing: z.object({
    marketplace: z.enum(MARKETPLACES),
    personType: z.enum(["CPF", "CNPJ"]),
    marketplaceFee: z.number().min(0).max(100),
    // Margem alvo em %, permitindo até 100% (dobrar o valor do custo).
    // Valores muito altos podem fazer o divisor do cálculo ficar <= 0;
    // nesses casos o motor volta para custo + frete + impostos.
    desiredMargin: z.number().min(0).max(100),
    shippingEstimate: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .pipe(z.number().min(0)),
    taxPercent: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .pipe(z.number().min(0).max(100)),
    taxMode: z.enum(["gross", "net_marketplace"]).default("net_marketplace"),
    mlClassic: z.boolean().default(false),
    freeShipping: z.boolean().default(false),
    discountPercent: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .pipe(z.number().min(0).max(99)),
    cardFeePercent: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .pipe(z.number().min(0).max(100))
      .default(0),
    /** Preço de venda desejado para comparar (ex.: preço do concorrente). Opcional. */
    comparePrice: z
      .union([z.number(), z.nan(), z.undefined()])
      .optional()
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) && n > 0 ? n : undefined)),
  }),
})
  .superRefine((data, ctx) => {
    if (data.time.unitsPerBatch <= 1 && data.material.weight < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["material", "weight"],
        message: "Informe o peso da peça.",
      });
    }
    if (data.time.unitsPerBatch > 1 && !data.material.plateWeight) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["material", "plateWeight"],
        message: "Informe o peso total da placa quando houver mais de uma peça por impressão.",
      });
    }
  });

export type CalculatorFormValues = z.infer<typeof calculatorSchema>;

export interface CalculatorResults {
  filamentCost: number;
  energyCost: number;
  depreciationCost: number;
  packagingCost: number;
  totalCost: number;
  unitsPerBatch?: number;
  plateTotalCost?: number;
  minimumPrice: number;
  suggestedPrice: number;
  suggestedPriceShopee: number;
  suggestedPriceML: number;
  suggestedPriceDirectCash?: number;
  suggestedPriceDirectCard?: number;
  kitSuggestedPriceShopee?: number;
  kitSuggestedPriceML?: number;
  kitSuggestedPriceDirectCash?: number;
  kitSuggestedPriceDirectCard?: number;
  kitMarginShopee?: number;
  kitMarginML?: number;
  kitMarginDirectCash?: number;
  kitMarginDirectCard?: number;
  profitPerSale: number;
  margin: number;
  /** Detalhamento cascata (Shopee) */
  cascataShopee: {
    sellingPrice: number;
    marketplaceFeePercent: number;
    marketplaceFeeAmount: number;
    /** Taxa comissão em decimal (ex.: 0.20). */
    commissionRateDecimal: number;
    commissionAmount: number;
    fixedFeeAmount: number;
    shippingAmount: number;
    taxPercent: number;
    taxAmount: number;
    energyCost: number;
    filamentCost: number;
    depreciationCost: number;
    packagingCost: number;
    totalCost: number;
    netProfit: number;
    marginPercent: number;
  };
  /** Detalhamento cascata (Mercado Livre) */
  cascataML: {
    sellingPrice: number;
    marketplaceFeePercent: number;
    marketplaceFeeAmount: number;
    commissionRateDecimal: number;
    commissionAmount: number;
    fixedFeeAmount: number;
    shippingAmount: number;
    taxPercent: number;
    taxAmount: number;
    energyCost: number;
    filamentCost: number;
    depreciationCost: number;
    packagingCost: number;
    totalCost: number;
    netProfit: number;
    marginPercent: number;
  };
  /** Preço a anunciar para manter margem ao dar desconto (quando discountPercent > 0) */
  priceToAnnounceForPromo: number | null;
  /** Lucro por hora (netProfit / hours) - usa o pior canal para exibição */
  profitPerHour: number;
  /** Se preço para comparar foi informado: resultado ao vender a esse preço (Shopee, ML e direto) */
  compareAtPriceResult: {
    sellingPrice: number;
    shopee: {
      marketplaceFeePercent: number;
      marketplaceFeeAmount: number;
      netProfit: number;
      marginPercent: number;
      profitPerHour: number;
    };
    ml: {
      marketplaceFeePercent: number;
      marketplaceFeeAmount: number;
      netProfit: number;
      marginPercent: number;
      profitPerHour: number;
    };
    directCash: {
      marketplaceFeePercent: number;
      marketplaceFeeAmount: number;
      netProfit: number;
      marginPercent: number;
      profitPerHour: number;
    };
    directCard: {
      marketplaceFeePercent: number;
      marketplaceFeeAmount: number;
      netProfit: number;
      marginPercent: number;
      profitPerHour: number;
    };
  } | null;
}

export interface Product {
  id: string;
  name: string;
  weight: number;
  price: number;
  margin: number | null;
  marketplace: Marketplace;
  currency: "BRL" | "USD";
  createdAt: string;
  updatedAt: string;
  /** Preços sugeridos por canal e custo de produção no momento do salvamento (opcionais, para estoque). */
  suggestedPriceShopee?: number;
  suggestedPriceML?: number;
  totalCost?: number;
}

export const settingsSchema = z.object({
  currency: z.enum(["BRL", "USD"]),
  defaults: z.object({
    kwhPrice: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    printerCost: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    residualValue: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(0),
    lifetimeHours: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    annualMaintenance: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(0),
    infrastructureYear: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(0),
    yearlyPrintHours: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(1000),
    packaging: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    desiredMargin: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0)),
    shippingEstimateDefault: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(0),
    shopeeFreeShippingDefault: z.boolean().default(false),
    taxMode: z.enum(["gross", "net_marketplace"]).default("net_marketplace"),
    mlClassic: z.boolean().default(false),
    // Presets editáveis de comissão efetiva média por marketplace
    shopeeBaseCommission: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 14))
      .default(14),
    shopeeFreeShippingCommission: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 20))
      .default(20),
    mlClassicCommission: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 13))
      .default(13),
    mlPremiumCommission: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 16))
      .default(16),
  }),
  printer: z.object({
    presetId: z.string().optional(),
    customName: z.string().optional(),
    customPowerW: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? n : undefined,
      )
      .optional(),
    customPrinterCost: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? n : undefined,
      )
      .optional(),
    customLifetimeHours: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? n : undefined,
      )
      .optional(),
    customAnnualMaintenance: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? n : undefined,
      )
      .optional(),
    customYearlyPrintHours: z
      .union([z.number(), z.nan(), z.undefined()])
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? n : undefined,
      )
      .optional(),
    customPresets: z
      .array(
        z.object({
          id: z.string(),
          name: z.string().min(1),
          averagePowerW: z.number().min(1),
          printerCost: z.number().min(0),
          lifetimeHours: z.number().min(1),
          annualMaintenance: z.number().min(0).default(0),
          yearlyPrintHours: z.number().min(0).default(1),
        }),
      )
      .default([]),
  }),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export interface ProfitSimulationResult {
  profit: number;
  margin: number;
  recommendation: string;
}

