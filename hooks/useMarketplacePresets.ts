"use client";

import { useCallback } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { saveUserSettings } from "@/lib/supabaseUserData";
import type { SettingsValues } from "@/types";

export type MarketplacePresetChannel = "shopee" | "mercadoLivre" | "vendaDireta" | "tiktok";

const ACTIVE_KEY: Record<
  MarketplacePresetChannel,
  "activeShopeeId" | "activeMercadoLivreId" | "activeVendaDiretaId" | "activeTiktokId"
> = {
  shopee: "activeShopeeId",
  mercadoLivre: "activeMercadoLivreId",
  vendaDireta: "activeVendaDiretaId",
  tiktok: "activeTiktokId",
};

/**
 * CRUD de presets nomeados por marketplace, persistidos em settings.marketplacePresets
 * (localStorage + Supabase via saveUserSettings, mesmo mecanismo dos presets de impressora
 * em app/impressoras/page.tsx).
 */
export function useMarketplacePresets<T>(channel: MarketplacePresetChannel) {
  const { settings, updateSettings } = useSettingsStore();
  const { user } = useAuthStore();

  const list = settings.marketplacePresets[channel] as unknown as Array<{
    id: string;
    name: string;
    inputs: T;
  }>;
  const activeId = settings.marketplacePresets[ACTIVE_KEY[channel]];

  const persist = useCallback(
    (next: SettingsValues["marketplacePresets"]) => {
      const merged: SettingsValues = { ...settings, marketplacePresets: next };
      updateSettings(merged);
      if (user) saveUserSettings(user.id, merged).catch(() => {});
    },
    [settings, updateSettings, user],
  );

  const save = useCallback(
    (name: string, inputs: T) => {
      const existing = list.find((p) => p.id === activeId);
      let nextList: typeof list;
      let nextActiveId = activeId;
      if (existing && existing.name === name) {
        nextList = list.map((p) => (p.id === existing.id ? { ...p, inputs } : p));
      } else {
        const id = `${channel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        nextList = [...list, { id, name, inputs }];
        nextActiveId = id;
      }
      persist({
        ...settings.marketplacePresets,
        [channel]: nextList,
        [ACTIVE_KEY[channel]]: nextActiveId,
      } as SettingsValues["marketplacePresets"]);
    },
    [list, activeId, channel, persist, settings.marketplacePresets],
  );

  const select = useCallback(
    (id: string) => {
      persist({
        ...settings.marketplacePresets,
        [ACTIVE_KEY[channel]]: id,
      } as SettingsValues["marketplacePresets"]);
    },
    [channel, persist, settings.marketplacePresets],
  );

  const remove = useCallback(
    (id: string) => {
      const nextList = list.filter((p) => p.id !== id);
      const nextActiveId = activeId === id ? null : activeId;
      persist({
        ...settings.marketplacePresets,
        [channel]: nextList,
        [ACTIVE_KEY[channel]]: nextActiveId,
      } as SettingsValues["marketplacePresets"]);
    },
    [list, activeId, channel, persist, settings.marketplacePresets],
  );

  const active = list.find((p) => p.id === activeId) ?? null;

  return { list, activeId, active, save, select, remove };
}
