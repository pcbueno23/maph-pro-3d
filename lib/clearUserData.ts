import { useProductsStore } from "@/store/productsStore";
import { useSettingsStore, defaultSettings } from "@/store/settingsStore";
import { useInventoryStore } from "@/store/inventoryStore";
import { useSuppliesStore } from "@/store/suppliesStore";
import { useSalesStore } from "@/store/salesStore";
import { useCalculatorStore } from "@/store/calculatorStore";

/**
 * Limpa todos os dados do usuário nos stores e no localStorage.
 * Deve ser chamado no logout para que o próximo usuário (ou nova sessão)
 * não veja dados da conta anterior. Também zera a calculadora (última conta, produto carregado).
 */
export function clearUserData(): void {
  if (typeof window === "undefined") return;

  useProductsStore.getState().hydrateFromCloud([]);
  useSettingsStore.getState().updateSettings(defaultSettings);
  useInventoryStore.getState().hydrateFromCloud([]);
  useSuppliesStore.getState().hydrateFromCloud([]);
  useSalesStore.getState().clearSales();
  useCalculatorStore.getState().clearOnLogout();
}
