export type ModelFileType = "stl" | "3mf";

export type ModelFileEntry = {
  /** Estável dentro da sessão: pasta + caminho relativo — usado como key do React e do cache de miniatura. */
  id: string;
  name: string;
  ext: ModelFileType;
  /** Segmentos de subpasta dentro da pasta conectada (ex.: ["brinquedos", "Rex_Clamp"]). */
  path: string[];
  size: number;
  lastModified: number;
  handle: FileSystemFileHandle;
  folderId: string;
  folderLabel: string;
};

export type ConnectedFolder = {
  id: string;
  label: string;
  handle: FileSystemDirectoryHandle;
};

export type FolderStatus = "ready" | "needs-permission" | "scanning" | "error";
