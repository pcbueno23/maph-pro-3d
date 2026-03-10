import { useSettingsStore, defaultSettings } from "@/store/settingsStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useSalesStore } from "@/store/salesStore";
import type { SettingsValues } from "@/types";
import type { InventoryItem } from "@/store/inventoryStore";
import type { Supply } from "@/store/suppliesStore";
import type { Sale } from "@/store/salesStore";
import {
  fetchAllUserData,
  saveUserSettings,
  saveUserInventory,
  saveUserSupplies,
  saveUserSales,
} from "./supabaseUserData";

const INV_KEY = "precifica3d-inventory";
const SUP_KEY = "precifica3d-supplies";
const SALES_KEY = "precifica3d-sales";

function readLocalInventory(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INV_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalSupplies(): Supply[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SUP_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readLocalSales(): Sale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SALES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Carrega configurações, estoque, insumos e vendas da nuvem e preenche os stores.
 * Se a nuvem estiver vazia, envia os dados locais (localStorage) para a nuvem e mantém os stores. */
export async function syncUserDataOnLogin(userId: string): Promise<void> {
  const data = await fetchAllUserData(userId);
  const settingsStore = useSettingsStore.getState();
  const inventoryStore = useInventoryStore.getState();
  const suppliesStore = useSuppliesStore.getState();
  const salesStore = useSalesStore.getState();

  // Configurações: nuvem tem prioridade; se nuvem vazia, envia o que está no store (já veio do localStorage)
  if (data.settings) {
    const merged: SettingsValues = {
      ...defaultSettings,
      ...data.settings,
      defaults: {
        ...defaultSettings.defaults,
        ...(data.settings.defaults ?? defaultSettings.defaults),
      },
      printer: {
        ...defaultSettings.printer,
        ...(data.settings.printer ?? defaultSettings.printer),
      },
    };
    settingsStore.updateSettings(merged);
  } else {
    await saveUserSettings(userId, settingsStore.settings);
  }

  // Estoque: nuvem tem prioridade; se nuvem vazia, envia localStorage para a nuvem e hidrata o store
  if (data.inventory.length > 0) {
    inventoryStore.hydrateFromCloud(data.inventory);
  } else {
    const local = readLocalInventory();
    if (local.length > 0) {
      await saveUserInventory(userId, local);
      inventoryStore.hydrateFromCloud(local);
    }
  }

  // Insumos
  if (data.supplies.length > 0) {
    suppliesStore.hydrateFromCloud(data.supplies);
  } else {
    const local = readLocalSupplies();
    if (local.length > 0) {
      await saveUserSupplies(userId, local);
      suppliesStore.hydrateFromCloud(local);
    }
  }

  // Vendas
  if (data.sales.length > 0) {
    salesStore.hydrateFromCloud(data.sales);
  } else {
    const local = readLocalSales();
    if (local.length > 0) {
      await saveUserSales(userId, local);
      salesStore.hydrateFromCloud(local);
    }
  }
}
