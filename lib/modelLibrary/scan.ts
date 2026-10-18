/**
 * Varre recursivamente uma pasta conectada atrás de arquivos .stl/.3mf — ignora
 * qualquer outro tipo (gcode, imagens etc. ficam de fora, igual o pedido original).
 * Chama `onEntry` incrementalmente (não espera a varredura inteira terminar) porque
 * bibliotecas como a do usuário passam de 900 arquivos — a tela já vai enchendo.
 */
import type { ModelFileEntry, ModelFileType } from "./types";

function extOf(name: string): ModelFileType | null {
  const lower = name.toLowerCase();
  if (lower.endsWith(".stl")) return "stl";
  if (lower.endsWith(".3mf")) return "3mf";
  return null;
}

export async function scanFolder(
  root: FileSystemDirectoryHandle,
  folderId: string,
  folderLabel: string,
  onEntry: (entry: ModelFileEntry) => void,
  signal?: { cancelled: boolean },
  path: string[] = [],
): Promise<void> {
  for await (const [name, handle] of root.entries()) {
    if (signal?.cancelled) return;
    if (handle.kind === "directory") {
      await scanFolder(handle as FileSystemDirectoryHandle, folderId, folderLabel, onEntry, signal, [...path, name]);
      continue;
    }
    const ext = extOf(name);
    if (!ext) continue;
    const fileHandle = handle as FileSystemFileHandle;
    let file: File;
    try {
      file = await fileHandle.getFile();
    } catch {
      continue; // arquivo pode ter sido movido/apagado entre a listagem e a leitura
    }
    onEntry({
      id: `${folderId}:${[...path, name].join("/")}`,
      name,
      ext,
      path,
      size: file.size,
      lastModified: file.lastModified,
      handle: fileHandle,
      folderId,
      folderLabel,
    });
  }
}
