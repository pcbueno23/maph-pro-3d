import type { ShopeeInputs } from "../../../lib/engines/shopee/engine";

/**
 * Formato mínimo de `user_settings.data` no Supabase que a extensão precisa
 * ler — só o preset ativo da Shopee. Estruturalmente compatível com
 * `SettingsValues` do app principal (types/index.ts); não importamos o schema
 * zod inteiro aqui pra manter o bundle da extensão pequeno e desacoplado.
 */
export type ShopeePreset = { id: string; name: string; inputs: ShopeeInputs };

export type MinimalUserSettings = {
  marketplacePresets?: {
    shopee?: ShopeePreset[];
    activeShopeeId?: string | null;
  };
};

export function activeShopeePreset(settings: MinimalUserSettings | null): ShopeePreset | null {
  const mp = settings?.marketplacePresets;
  if (!mp?.shopee?.length) return null;
  return mp.shopee.find((p) => p.id === mp.activeShopeeId) ?? null;
}
