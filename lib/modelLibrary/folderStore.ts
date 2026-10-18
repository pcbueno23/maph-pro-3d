/**
 * Guarda os FileSystemDirectoryHandle das pastas conectadas no IndexedDB — eles são
 * "structured-cloneable" no Chrome, então sobrevivem a fechar/abrir o navegador sem
 * precisar escolher a pasta de novo toda vez (só confirmar permissão com 1 clique
 * quando o Chrome esquecer — ver lib/modelLibrary/permissions.ts).
 */
import type { ConnectedFolder } from "./types";

const DB_NAME = "mp3d-model-library";
const STORE = "folders";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadStoredFolders(): Promise<ConnectedFolder[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as ConnectedFolder[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFolder(folder: ConnectedFolder): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(folder);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeStoredFolder(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
