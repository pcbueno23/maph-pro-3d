import type { SettingsValues } from "@/types";
import type { InventoryItem } from "@/store/inventoryStore";
import type { Supply } from "@/store/suppliesStore";
import type { Sale } from "@/store/salesStore";
import { supabase } from "./supabaseClient";

export async function fetchUserSettings(userId: string): Promise<SettingsValues | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_settings")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[Supabase] fetchUserSettings:", error);
    return null;
  }
  if (!data?.data) return null;
  return data.data as SettingsValues;
}

export async function saveUserSettings(userId: string, settings: SettingsValues): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("user_settings").upsert(
    { user_id: userId, data: settings, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error && process.env.NODE_ENV === "development") console.error("[Supabase] saveUserSettings:", error);
}

export async function fetchUserInventory(userId: string): Promise<InventoryItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_inventory")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[Supabase] fetchUserInventory:", error);
    return [];
  }
  if (!data?.data || !Array.isArray(data.data)) return [];
  return data.data as InventoryItem[];
}

export async function saveUserInventory(userId: string, items: InventoryItem[]): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("user_inventory").upsert(
    { user_id: userId, data: items, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error && process.env.NODE_ENV === "development") console.error("[Supabase] saveUserInventory:", error);
}

export async function fetchUserSupplies(userId: string): Promise<Supply[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_supplies")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[Supabase] fetchUserSupplies:", error);
    return [];
  }
  if (!data?.data || !Array.isArray(data.data)) return [];
  return data.data as Supply[];
}

export async function saveUserSupplies(userId: string, supplies: Supply[]): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("user_supplies").upsert(
    { user_id: userId, data: supplies, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error && process.env.NODE_ENV === "development") console.error("[Supabase] saveUserSupplies:", error);
}

export async function fetchUserSales(userId: string): Promise<Sale[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_sales")
    .select("data")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV === "development") console.error("[Supabase] fetchUserSales:", error);
    return [];
  }
  if (!data?.data || !Array.isArray(data.data)) return [];
  return data.data as Sale[];
}

export async function saveUserSales(userId: string, sales: Sale[]): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("user_sales").upsert(
    { user_id: userId, data: sales, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  if (error && process.env.NODE_ENV === "development") console.error("[Supabase] saveUserSales:", error);
}

/** Carrega todos os dados do usuário da nuvem e retorna para os stores hidratarem. */
export async function fetchAllUserData(userId: string): Promise<{
  settings: SettingsValues | null;
  inventory: InventoryItem[];
  supplies: Supply[];
  sales: Sale[];
}> {
  const [settings, inventory, supplies, sales] = await Promise.all([
    fetchUserSettings(userId),
    fetchUserInventory(userId),
    fetchUserSupplies(userId),
    fetchUserSales(userId),
  ]);
  return {
    settings: settings ?? null,
    inventory: inventory ?? [],
    supplies: supplies ?? [],
    sales: sales ?? [],
  };
}
