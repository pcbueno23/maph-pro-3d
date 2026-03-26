import { supabase } from "@/lib/supabaseClient";
import type { CatalogSettings, PublicCatalogItem } from "@/types";

function mustClient() {
  if (!supabase) throw new Error("Supabase não configurado.");
  return supabase;
}

function randomSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  for (let i = 0; i < 10; i++) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

export async function fetchCatalogSettings(userId: string): Promise<CatalogSettings | null> {
  const client = mustClient();
  const { data, error } = await client
    .from("catalog_settings")
    .select("user_id, public_slug, show_prices, updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("catalog_settings:", error);
    return null;
  }
  if (!data) return null;
  return {
    userId: data.user_id,
    publicSlug: data.public_slug,
    showPrices: data.show_prices,
    updatedAt: data.updated_at,
  };
}

export async function upsertCatalogSettings(
  userId: string,
  input: { publicSlug?: string; showPrices?: boolean },
): Promise<CatalogSettings> {
  const client = mustClient();

  // Se não foi passado um slug explícito, preserva o existente no banco
  // para não sobrescrever com um slug aleatório a cada salvamento parcial.
  let slug: string;
  if (input.publicSlug?.trim()) {
    slug = input.publicSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  } else {
    const existing = await fetchCatalogSettings(userId);
    slug = existing?.publicSlug || randomSlug();
  }

  const payload = {
    user_id: userId,
    public_slug: slug,
    show_prices: input.showPrices ?? true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("catalog_settings")
    .upsert(payload, { onConflict: "user_id" })
    .select("user_id, public_slug, show_prices, updated_at")
    .single();
  if (error || !data) throw error ?? new Error("Falha ao salvar catálogo.");
  return {
    userId: data.user_id,
    publicSlug: data.public_slug,
    showPrices: data.show_prices,
    updatedAt: data.updated_at,
  };
}

export type CatalogPublicPayload =
  | { ok: true; showPrices: boolean; products: PublicCatalogItem[] }
  | { ok: false; error: string };

export async function getCatalogPublicBySlug(slug: string): Promise<CatalogPublicPayload> {
  const client = mustClient();
  const { data, error } = await client.rpc("get_catalog_public", { p_slug: slug });
  if (error) {
    return { ok: false, error: error.message };
  }
  const raw = data as {
    ok?: boolean;
    error?: string;
    showPrices?: boolean;
    products?: PublicCatalogItem[];
  };
  if (!raw || raw.ok === false) {
    return { ok: false, error: raw?.error ?? "not_found" };
  }
  return {
    ok: true,
    showPrices: raw.showPrices ?? true,
    products: (raw.products ?? []) as PublicCatalogItem[],
  };
}
