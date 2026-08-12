import type { Product, SettingsValues } from "@/types";
import { calcularPrecoShopee } from "@/lib/engines/shopee/engine";
import { calcularPrecoML } from "@/lib/engines/ml/engine";
import { calcularPrecoTikTok } from "@/lib/engines/tiktok/engine";
import { calcularPrecoVendaDireta } from "@/lib/engines/vendaDireta/engine";

export type ChannelKey = "shopee" | "mercadoLivre" | "tiktok" | "vendaDireta";

export type ChannelMetric = {
  channelLabel: string;
  price: number;
  marginPercent: number;
  /** null quando o produto não tem tempo de impressão salvo. */
  profitPerHour: number | null;
};

export type ChannelMetrics = Record<ChannelKey, ChannelMetric | null>;

export const CHANNEL_LABELS: Record<ChannelKey, string> = {
  shopee: "Shopee",
  mercadoLivre: "Mercado Livre",
  tiktok: "TikTok Shop",
  vendaDireta: "Venda Direta",
};

function hoursFromMinutes(min: number | null | undefined): number | null {
  if (typeof min !== "number" || !Number.isFinite(min) || min <= 0) return null;
  return min / 60;
}

export type ChannelMetricsCostSource = Pick<Product, "totalCost" | "printTimeMinutes">;

/**
 * Preço/margem/lucro-por-hora estimados pra cada um dos 4 canais, a partir de um custo
 * de produção (`totalCost`) + o preset ativo daquele canal (mesma lógica das caixinhas
 * da aba Custo 3D). `null` quando o canal não tem preset ativo configurado. Aceita
 * qualquer objeto com `totalCost`/`printTimeMinutes` — não só um `Product` salvo — pra
 * dar pra calcular a linha resumida de um kit (custo/tempo somados dos componentes).
 */
export function computeChannelMetrics(
  product: ChannelMetricsCostSource,
  marketplacePresets: SettingsValues["marketplacePresets"],
): ChannelMetrics {
  const totalCost = product.totalCost ?? 0;
  const hours = hoursFromMinutes(product.printTimeMinutes);

  const shopeePreset = marketplacePresets.shopee.find(
    (p) => p.id === marketplacePresets.activeShopeeId,
  );
  const shopee: ChannelMetric | null = shopeePreset
    ? (() => {
        const r = calcularPrecoShopee({
          ...shopeePreset.inputs,
          fullCustoUnidade: totalCost,
          valorCompra: 0,
          modo: "margem",
        });
        return {
          channelLabel: CHANNEL_LABELS.shopee,
          price: r.precoFinalSugerido,
          marginPercent: r.margemReal,
          profitPerHour: hours != null ? r.lucroLiquido / hours : null,
        };
      })()
    : null;

  const mlPreset = marketplacePresets.mercadoLivre.find(
    (p) => p.id === marketplacePresets.activeMercadoLivreId,
  );
  const mercadoLivre: ChannelMetric | null = mlPreset
    ? (() => {
        const r = calcularPrecoML({
          ...mlPreset.inputs,
          fullCustoUnidade: totalCost,
          valorCompra: 0,
          modo: "margem",
        });
        return {
          channelLabel: CHANNEL_LABELS.mercadoLivre,
          price: r.precoFinal,
          marginPercent: r.margem,
          profitPerHour: hours != null ? r.lucro / hours : null,
        };
      })()
    : null;

  const tiktokPreset = marketplacePresets.tiktok.find(
    (p) => p.id === marketplacePresets.activeTiktokId,
  );
  const tiktok: ChannelMetric | null = tiktokPreset
    ? (() => {
        const r = calcularPrecoTikTok({
          ...tiktokPreset.inputs,
          fullCustoUnidade: totalCost,
          valorCompra: 0,
          modo: "margem",
        });
        return {
          channelLabel: CHANNEL_LABELS.tiktok,
          price: r.precoFinalSugerido,
          marginPercent: r.margemReal,
          profitPerHour: hours != null ? r.lucroLiquido / hours : null,
        };
      })()
    : null;

  const vdPreset = marketplacePresets.vendaDireta.find(
    (p) => p.id === marketplacePresets.activeVendaDiretaId,
  );
  const vendaDireta: ChannelMetric | null = vdPreset
    ? (() => {
        const r = calcularPrecoVendaDireta({
          ...vdPreset.inputs,
          fullCustoUnidade: totalCost,
          mode: "margem",
        });
        const marginPercent = r.pricePix > 0 ? (r.lucroPix / r.pricePix) * 100 : 0;
        return {
          channelLabel: CHANNEL_LABELS.vendaDireta,
          price: r.pricePix,
          marginPercent,
          profitPerHour: hours != null ? r.lucroPix / hours : null,
        };
      })()
    : null;

  return { shopee, mercadoLivre, tiktok, vendaDireta };
}

/** Canal com maior lucro/hora entre os calculados (ignora os sem preset/tempo). null se nenhum tiver dado. */
export function bestChannel(
  metrics: ChannelMetrics,
): { key: ChannelKey; metric: ChannelMetric } | null {
  let best: { key: ChannelKey; metric: ChannelMetric } | null = null;
  for (const key of Object.keys(metrics) as ChannelKey[]) {
    const metric = metrics[key];
    if (!metric || metric.profitPerHour == null) continue;
    if (!best || metric.profitPerHour > best.metric.profitPerHour!) {
      best = { key, metric };
    }
  }
  return best;
}
