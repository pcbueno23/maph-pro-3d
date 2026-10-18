export async function hasReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return (await handle.queryPermission({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}

/** Precisa ser chamado a partir de um clique do usuário (gesto) — o Chrome recusa
 * silenciosamente fora de um handler de clique. */
export async function requestReadPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    return (await handle.requestPermission({ mode: "read" })) === "granted";
  } catch {
    return false;
  }
}
