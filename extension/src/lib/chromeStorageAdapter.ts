/**
 * Adapter de storage pro supabase-js usar `chrome.storage.local` em vez de
 * `window.localStorage` — necessário porque o service worker (background) não
 * tem `window`/`localStorage`, só a API de extensão. Content scripts e popup
 * também usam esse mesmo adapter pra manter a sessão sincronizada em todos os
 * contextos da extensão.
 */
export const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    const result = await chrome.storage.local.get(key);
    return typeof result[key] === "string" ? result[key] : null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await chrome.storage.local.set({ [key]: value });
  },
  removeItem: async (key: string): Promise<void> => {
    await chrome.storage.local.remove(key);
  },
};
