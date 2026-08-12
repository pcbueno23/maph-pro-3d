"use client";

import { useCallback } from "react";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
import { useProductsStore } from "@/store/productsStore";
import { saveUserSettings } from "@/lib/supabaseUserData";
import type { KitComponent, ProductKit, SettingsValues } from "@/types";

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `kit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * CRUD de kits (produtos salvos somados, com quantidade) persistidos em
 * settings.productKits (localStorage + Supabase via saveUserSettings, mesmo
 * mecanismo dos presets de marketplace em hooks/useMarketplacePresets.ts).
 *
 * Sem conceito de "kit ativo": o usuário escolhe qual carregar toda vez que abre
 * o seletor de kit numa calculadora.
 */
export function useProductKits() {
  const { settings, updateSettings } = useSettingsStore();
  const { user } = useAuthStore();
  const { products } = useProductsStore();

  const kits = settings.productKits;

  const persist = useCallback(
    (nextKits: ProductKit[]) => {
      const merged: SettingsValues = { ...settings, productKits: nextKits };
      updateSettings(merged);
      if (user) saveUserSettings(user.id, merged).catch(() => {});
    },
    [settings, updateSettings, user],
  );

  const save = useCallback(
    (name: string, components: KitComponent[]) => {
      const existing = kits.find((k) => k.name === name);
      const nextKits = existing
        ? kits.map((k) => (k.id === existing.id ? { ...k, components } : k))
        : [...kits, { id: generateId(), name, components }];
      persist(nextKits);
    },
    [kits, persist],
  );

  const remove = useCallback(
    (id: string) => {
      persist(kits.filter((k) => k.id !== id));
    },
    [kits, persist],
  );

  /** Soma o custo de produção atual de cada componente × quantidade; ignora componentes removidos. */
  const computeKitCost = useCallback(
    (kit: ProductKit): number => {
      return kit.components.reduce((sum, c) => {
        const product = products.find((p) => p.id === c.productId);
        return sum + (product?.totalCost ?? 0) * c.qty;
      }, 0);
    },
    [products],
  );

  /** Soma o peso de cada componente × quantidade (útil pro campo de peso/frete do ML). */
  const computeKitWeight = useCallback(
    (kit: ProductKit): number => {
      return kit.components.reduce((sum, c) => {
        const product = products.find((p) => p.id === c.productId);
        return sum + (product?.weight ?? 0) * c.qty;
      }, 0);
    },
    [products],
  );

  return { kits, save, remove, computeKitCost, computeKitWeight };
}
