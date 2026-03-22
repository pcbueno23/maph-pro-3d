import type { Marketplace, ProductMarketplaceChannel } from "@/types";

/** Escolha ao salvar produto a partir da calculadora. */
export type SaveProductChannel = "shopee" | "mercado_livre" | "venda_direta";

export function productMarketplaceFromSaveChannel(
  c: SaveProductChannel,
): ProductMarketplaceChannel {
  switch (c) {
    case "shopee":
      return "Shopee";
    case "mercado_livre":
      return "Mercado Livre";
    case "venda_direta":
      return "Venda Direta";
  }
}

/** Para montar o formulário da calculadora a partir do produto salvo (motor só aceita marketplaces clássicos). */
export function calculatorMarketplaceFromProductChannel(
  m: ProductMarketplaceChannel,
): Marketplace {
  if (m === "Venda Direta") return "Shopee";
  return m;
}

/** Texto curto do selo no card de produtos. */
export function productChannelBadgeLabel(m: ProductMarketplaceChannel): string {
  switch (m) {
    case "Mercado Livre":
      return "ML";
    case "Shopee":
      return "SHOPEE";
    case "Amazon":
      return "AMAZON";
    case "Venda Direta":
      return "VENDA DIRETA";
    default:
      return String(m).toUpperCase();
  }
}
