import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { chromeStorageAdapter } from "./chromeStorageAdapter";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient | null = null;

/**
 * Client Supabase único da extensão (mesma sessão em background, popup e
 * content scripts, via `chrome.storage.local`). Chame uma vez por contexto —
 * cada contexto (background, popup) tem sua própria instância, mas todas leem
 * a mesma sessão persistida.
 */
export function getSupabaseExtensionClient(): SupabaseClient | null {
  if (client) return client;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[Maph Pro 3D] Supabase não configurado — confira extension/.env");
    return null;
  }
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: chromeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
