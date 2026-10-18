/**
 * TypeScript (lib.dom) já tipa FileSystemDirectoryHandle/FileSystemFileHandle e a
 * iteração async (entries/values/keys), mas NÃO tipa `showDirectoryPicker` nem
 * `queryPermission`/`requestPermission` em FileSystemHandle — parte mais nova da
 * File System Access API (só Chrome/Edge). Usada pela Biblioteca de Modelos 3D.
 */

interface FileSystemHandlePermissionDescriptor {
  mode?: "read" | "readwrite";
}

interface FileSystemHandle {
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface DirectoryPickerOptions {
  id?: string;
  mode?: "read" | "readwrite";
  startIn?: string;
}

interface Window {
  showDirectoryPicker?(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}
