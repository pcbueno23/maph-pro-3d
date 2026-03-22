import { z } from "zod";
import { MARKETPLACES } from "@/lib/constants";

export type Marketplace = (typeof MARKETPLACES)[number];

/** Canal usado no card do produto (inclui venda direta, salva pela calculadora). */
export type ProductMarketplaceChannel = Marketplace | "Venda Direta";

/** Padrões globais (Configurações) e fallback da calculadora — mesma forma do bloco `advanced` do formulário. */
export const CALCULATOR_ADVANCED_DEFAULTS = {
  taxaFalha: 10,
  maoDeObraTipo: "fixo" as const,
  maoDeObraValor: 0,
  tempoManualMin: 0,
  descontoPercentual: 0,
};

export const calculatorAdvancedObjectSchema = z.object({
  taxaFalha: z
    .union([z.number(), z.nan()])
    .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 10))
    .pipe(z.number().min(0).max(99.9))
    .default(10),
  maoDeObraTipo: z.enum(["fixo", "hora"]).default("fixo"),
  maoDeObraValor: z
    .union([z.number(), z.nan()])
    .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
    .pipe(z.number().min(0))
    .default(0),
  tempoManualMin: z
    .union([z.number(), z.nan()])
    .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
    .pipe(z.number().min(0))
    .default(0),
  descontoPercentual: z
    .union([z.number(), z.nan()])
    .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
    .pipe(z.number().min(0).max(99))
    .default(0),
});

export type CalculatorAdvancedDefaults = z.infer<typeof calculatorAdvancedObjectSchema>;

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
      /** Identificador do insumo de filamento selecionado em /insumos (obrigatório). */
      supplyId: z.string().min(1, "Selecione um filamento"),
    pricePerKg: z.number().min(1, "Informe o custo do filamento/kg"),
    type: z.enum(["PLA", "ABS", "PETG"]),
  }),
  time: z.object({
    hours: z.number().min(0, "Tempo de impressão inválido"),
    powerW: z.number().min(10, "Potência inválida"),
    /** Impressora selecionada na calculadora (opcional). */
    printerId: z.string().optional(),
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
    /**
     * Margem alvo só para venda direta (PIX/cartão), sem marketplace.
     * Se omitida no parse legado, o motor usa margem marketplace + extra das configurações.
     */
    directSaleDesiredMargin: z
      .union([z.number(), z.nan()])
      .optional()
      .transform((n) =>
        typeof n === "number" && !Number.isNaN(n) ? Math.min(100, Math.max(0, n)) : undefined,
      ),
    /** Preço de venda desejado para comparar (ex.: preço do concorrente). Opcional. */
    comparePrice: z
      .union([z.number(), z.nan(), z.undefined()])
      .optional()
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) && n > 0 ? n : undefined)),
  }),
  advanced: calculatorAdvancedObjectSchema.default(CALCULATOR_ADVANCED_DEFAULTS),
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
  /** Margem % usada no preço direto (consumidor final), sem comissão de marketplace. */
  directSaleMarginPercent?: number;
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

  /** Ajustes avançados */
  taxaFalhaPercent: number;
  maoDeObraCusto: number;
  custoTotalAjustado: number;
  descontoPercentualReal: number;
  precoComDesconto: number;
  lucroLiquidoReal: number;
  margemReal: number;
  /** Sugestão/alerta quando lucro real fica abaixo da meta. */
  alertaLucroAbaixoDaMeta: boolean;
}

export interface Product {
  id: string;
  name: string;
  weight: number;
  price: number;
  margin: number | null;
  marketplace: ProductMarketplaceChannel;
  currency: "BRL" | "USD";
  createdAt: string;
  updatedAt: string;
  /** Preços sugeridos por canal e custo de produção no momento do salvamento (opcionais, para estoque). */
  suggestedPriceShopee?: number;
  suggestedPriceML?: number;
  /** Preço sugerido venda direta (PIX/cartão), sem taxa de marketplace. */
  suggestedPriceDirect?: number;
  /** Custo unitário de produção (ex.: custo real ajustado na calculadora). Não varia com o canal de venda. */
  totalCost?: number;
  /** Campos de ficha técnica (opcionais; não afetam a calculadora atual) */
  sku?: string | null;
  description?: string | null;
  /** Tempo estimado do produto (minutos) para uso em ordens/BOM. */
  printTimeMinutes?: number | null;
  /** Impressora padrão (entidade) para custos em ordens. */
  defaultPrinterId?: string | null;
  /** Incluído no catálogo público compartilhável. */
  catalogVisible?: boolean;
  /** Ordem no catálogo (menor primeiro). */
  catalogSort?: number | null;
}

/** Configuração do catálogo público (link + exibir preços). */
export interface CatalogSettings {
  userId: string;
  publicSlug: string;
  showPrices: boolean;
  updatedAt: string;
}

/** Item retornado pela RPC pública `get_catalog_public`. */
export interface PublicCatalogItem {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  weight: number;
  price: number | null;
  currency: string;
  printTimeMinutes: number | null;
  marketplace: string;
  imageUrl: string | null;
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
    cardFeePercent: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 0))
      .default(0),
    /** Pontos percentuais a mais na margem de venda direta vs margem marketplace (ex.: 10 → 30%+10%=40%). */
    directMarginExtraPoints: z
      .union([z.number(), z.nan()])
      .transform((n) => (typeof n === "number" && !Number.isNaN(n) ? n : 10))
      .pipe(z.number().min(0).max(50))
      .default(10),
  }),
  printer: z.object({
    presetId: z.string().optional(),
    customName: z.string().optional(),
    /** Impressora padrão (entidade /impressoras) para pré-preencher a calculadora. */
    defaultPrinterId: z.string().optional(),
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
  /** Presets de “Ajustes avançados” da calculadora (taxa de falha, mão de obra, etc.). */
  advanced: calculatorAdvancedObjectSchema.default(CALCULATOR_ADVANCED_DEFAULTS),
});

export type SettingsValues = z.infer<typeof settingsSchema>;

export interface ProfitSimulationResult {
  profit: number;
  margin: number;
  recommendation: string;
}

// =========================
// Entidades de operação (Print Farm)
// =========================

export type PrinterStatus = "available" | "busy" | "maintenance" | "offline";

export interface Printer {
  id: string;
  userId: string;
  name: string;
  model?: string | null;
  powerW: number;
  energyRateBrlKwh: number;
  status: PrinterStatus;
  purchaseValue?: number | null;
  usefulLifeHours?: number | null;
  createdAt: string;
  updatedAt: string;
}

// Compat: nome antigo (não usar em código novo)
export type EquipmentStatus = PrinterStatus;
export type Equipment = Printer;

export type SupplyCategory = "filament" | "resin" | "ink" | "packaging" | "tool" | "part" | "other";

export interface SupplyItem {
  id: string;
  userId: string;
  name: string;
  category: SupplyCategory;
  unit: string; // ex: g, kg, ml, unit
  unitCost: number;
  stockQty: number;
  minStockQty?: number | null;
  color?: string | null;
  purchaseLink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type StockMovementKind = "in" | "out" | "adjust";

export interface SupplyMovement {
  id: string;
  userId: string;
  supplyId: string;
  kind: StockMovementKind;
  qty: number;
  note?: string | null;
  createdAt: string;
}

export interface ProductMaterial {
  id: string;
  userId: string;
  productId: string;
  supplyId: string;
  qty: number;
  unit?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ProductAssetKind = "image" | "file";

export interface ProductAsset {
  id: string;
  userId: string;
  productId: string;
  kind: ProductAssetKind;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageBucket: string;
  storagePath: string;
  publicUrl?: string | null;
  createdAt: string;
}

export type ProductionOrderStatus =
  | "new"
  | "preparing"
  | "queued"
  | "printing"
  | "post_processing"
  | "ready_to_ship"
  | "done"
  | "cancelled";

export interface ProductionOrder {
  id: string;
  userId: string;
  productId: string;
  printerId?: string | null;
  quantity: number;
  dueDate?: string | null; // YYYY-MM-DD
  status: ProductionOrderStatus;
  notes?: string | null;
  /** ISO: preenchido ao entrar em `printing` (base do cronômetro de impressão). */
  printingStartedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "cancelled";

export interface Quote {
  id: string;
  userId: string;
  clientName: string;
  clientPhone?: string | null;
  quoteDate: string; // YYYY-MM-DD
  deliveryDate?: string | null; // YYYY-MM-DD
  status: QuoteStatus;
  notes?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteItem {
  id: string;
  userId: string;
  quoteId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
}

