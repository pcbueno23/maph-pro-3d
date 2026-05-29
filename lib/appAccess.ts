import { createClient } from "@supabase/supabase-js";
import { parseSiteConfigData } from "@/lib/siteConfig";

/**
 * Modo pago via variáveis de ambiente (fallback se o admin não definiu no painel).
 * - `APP_PAYWALL_ENABLED=true` → cobrança ativa
 * - `APP_PAYWALL_DISABLED=false` → cobrança ativa (legado)
 * - Padrão sem variáveis → gratuito
 */
export function isPaywallEnabledFromEnv(): boolean {
  const enabled = process.env.APP_PAYWALL_ENABLED?.trim().toLowerCase();
  if (enabled === "true") return true;

  const disabled = process.env.APP_PAYWALL_DISABLED?.trim().toLowerCase();
  if (disabled === "false") return true;
  if (disabled === "true") return false;

  return false;
}

/** @deprecated Preferir `isAppPaywallDisabledAsync()` — só lê env, ignora painel admin. */
export function isAppPaywallDisabled(): boolean {
  return !isPaywallEnabledFromEnv();
}

let paywallCache: { paywallEnabled: boolean; at: number } | null = null;
const PAYWALL_CACHE_MS = 15_000;

export function clearPaywallAccessCache(): void {
  paywallCache = null;
}

async function readPaywallEnabledFromSiteConfig(): Promise<boolean | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const supabase = createClient(url, anon);
  const { data, error } = await supabase
    .from("app_site_config")
    .select("data")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) return null;

  const parsed = parseSiteConfigData(data.data);
  if (typeof parsed.paywall_enabled === "boolean") {
    return parsed.paywall_enabled;
  }
  return null;
}

/** `true` = modo pago (trial + assinatura). Prioridade: painel admin → env → gratuito. */
export async function isPaywallEnabledAsync(): Promise<boolean> {
  const now = Date.now();
  if (paywallCache && now - paywallCache.at < PAYWALL_CACHE_MS) {
    return paywallCache.paywallEnabled;
  }

  const fromDb = await readPaywallEnabledFromSiteConfig();
  const paywallEnabled =
    fromDb !== null ? fromDb : isPaywallEnabledFromEnv();

  paywallCache = { paywallEnabled, at: now };
  return paywallEnabled;
}

/** `true` = app gratuito (sem bloqueio nem página de assinatura). */
export async function isAppPaywallDisabledAsync(): Promise<boolean> {
  return !(await isPaywallEnabledAsync());
}
