/**
 * Cache leve (chrome.storage.local, sobrevive à navegação entre páginas) dos
 * itens já vistos numa busca. Quando o usuário clica num anúncio que a
 * extensão já capturou na grade de resultados, a página do produto mostra
 * esse dado na hora em vez de ficar "Buscando dados..." esperando uma nova
 * captura de `pdp/get_pc` — a captura ao vivo continua rodando por trás e
 * atualiza se trouxer algo mais completo.
 */
import type { ParsedItem } from "./shopeeParse";

const PREFIX = "mp3d_cache_";
const TTL_MS = 15 * 60 * 1000; // 15 min — dado de busca é "fresco o suficiente" por esse tempo

type SerializedItem = Omit<ParsedItem, "createdAt"> & { createdAt: number | null };
type CachedEntry = { item: SerializedItem; cachedAt: number };

function key(shopId: string, itemId: string) {
  return `${PREFIX}${shopId}_${itemId}`;
}

function serialize(item: ParsedItem): SerializedItem {
  return { ...item, createdAt: item.createdAt ? item.createdAt.getTime() : null };
}

function deserialize(item: SerializedItem): ParsedItem {
  return { ...item, createdAt: item.createdAt ? new Date(item.createdAt) : null };
}

/** Limpeza probabilística (não a cada chamada) pra não deixar o storage crescer sem parar com o tempo de uso. */
async function maybeCleanup() {
  if (Math.random() > 0.05) return;
  try {
    const all = await chrome.storage.local.get(null);
    const now = Date.now();
    const staleKeys = Object.keys(all).filter((k) => {
      if (!k.startsWith(PREFIX)) return false;
      const entry = all[k] as CachedEntry | undefined;
      return !entry || now - entry.cachedAt > TTL_MS;
    });
    if (staleKeys.length > 0) await chrome.storage.local.remove(staleKeys);
  } catch {
    /* ignora — limpeza é só manutenção, não crítica */
  }
}

/** Guarda vários itens de uma vez (uma chamada de storage só, não uma por item). */
export async function cacheParsedItems(items: ParsedItem[]): Promise<void> {
  const updates: Record<string, CachedEntry> = {};
  const now = Date.now();
  for (const item of items) {
    if (!item.shopId || !item.itemId) continue;
    updates[key(item.shopId, item.itemId)] = { item: serialize(item), cachedAt: now };
  }
  if (Object.keys(updates).length === 0) return;
  try {
    await chrome.storage.local.set(updates);
  } catch {
    /* ignora — cache é só uma otimização de velocidade, não essencial */
  }
  void maybeCleanup();
}

export async function getCachedItem(shopId: string, itemId: string): Promise<ParsedItem | null> {
  try {
    const k = key(shopId, itemId);
    const result = await chrome.storage.local.get(k);
    const entry = result[k] as CachedEntry | undefined;
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TTL_MS) return null;
    return deserialize(entry.item);
  } catch {
    return null;
  }
}
