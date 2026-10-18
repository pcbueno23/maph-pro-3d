/**
 * Cache de miniaturas já geradas (data URL PNG) — renderizar ~900 arquivos toda vez
 * que a página abrir seria lento demais. Chave = nome+tamanho+data de modificação, pra
 * invalidar sozinho se o usuário resliceu/trocou o arquivo na pasta.
 */
const DB_NAME = "mp3d-thumb-cache";
const STORE = "thumbs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function thumbnailCacheKey(name: string, size: number, lastModified: number): string {
  return `${name}:${size}:${lastModified}`;
}

export async function getCachedThumbnail(key: string): Promise<string | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result?.dataUrl as string | undefined) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function setCachedThumbnail(key: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ key, dataUrl, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // cache é só otimização — se falhar (ex.: cota cheia), segue sem ele
  }
}
