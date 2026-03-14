import { useSettingsStore, defaultSettings } from "@/store/settingsStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useSalesStore } from "@/store/salesStore";
import type { SettingsValues } from "@/types";
import { fetchAllUserData, saveUserSettings } from "./supabaseUserData";

/** Carrega configurações, estoque, insumos e vendas da nuvem e preenche os stores.
 * Se a nuvem estiver vazia, usa valores padrão/vazios (não usa dados locais, que podem ser de outro usuário). */
export async function syncUserDataOnLogin(userId: string): Promise<void> {
  const data = await fetchAllUserData(userId);
  const settingsStore = useSettingsStore.getState();
  const inventoryStore = useInventoryStore.getState();
  const suppliesStore = useSuppliesStore.getState();
  const salesStore = useSalesStore.getState();

  // Configurações: nuvem tem prioridade; se nuvem vazia, usar padrões (não usar store/local – podem ser de outro usuário)
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
    settingsStore.updateSettings(defaultSettings);
    await saveUserSettings(userId, defaultSettings);
  }

  // Estoque: nuvem tem prioridade; se nuvem vazia, não usar dados locais (podem ser de outro usuário)
  if (data.inventory.length > 0) {
    inventoryStore.hydrateFromCloud(data.inventory);
  } else {
    inventoryStore.hydrateFromCloud([]);
  }

  // Insumos: nuvem tem prioridade; se vazia, não usar dados locais (podem ser de outro usuário)
  if (data.supplies.length > 0) {
    suppliesStore.hydrateFromCloud(data.supplies);
  } else {
    suppliesStore.hydrateFromCloud([]);
  }

  // Vendas: nuvem tem prioridade; se vazia, não usar dados locais (podem ser de outro usuário)
  if (data.sales.length > 0) {
    salesStore.hydrateFromCloud(data.sales);
  } else {
    salesStore.hydrateFromCloud([]);
  }
}
