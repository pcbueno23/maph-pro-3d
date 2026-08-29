/**
 * Roda só nas páginas do MakerWorld. Se a extensão deixou uma imagem
 * pendente (ver src/lib/makerworldHandoff.ts — gravada pelo modal de
 * recorte na aba da Shopee), preenche sozinho o campo de busca por imagem
 * deles, sem precisar o usuário colar (Ctrl+V) ou selecionar o arquivo.
 *
 * Evidência real do input deles (inspecionado pelo usuário, confirmado
 * MUI): `<input type="file" accept=".jpg, .jpeg, .png, .webp" multiple>`
 * escondido (`display:none`) dentro de um `div[role="button"]` que aceita
 * clique, arrastar-e-soltar ou colar. Setar `.files` + disparar "change"
 * cobre o caminho que o React deles escuta; disparar "drop" no container é
 * o plano B caso o handler real esteja ligado ao dropzone, não ao input.
 */
import { MW_PENDING_KEY, MW_PENDING_FRESH_MS, type MwPendingImage } from "../lib/makerworldHandoff";

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*?);base64/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

function findFileInput(): HTMLInputElement | null {
  return (
    document.querySelector<HTMLInputElement>('input[type="file"][accept*="webp"]') ??
    document.querySelector<HTMLInputElement>('input[type="file"]')
  );
}

function waitForFileInput(timeoutMs = 12000): Promise<HTMLInputElement | null> {
  return new Promise((resolve) => {
    const existing = findFileInput();
    if (existing) {
      resolve(existing);
      return;
    }
    const timer = window.setTimeout(() => {
      obs.disconnect();
      resolve(null);
    }, timeoutMs);
    const obs = new MutationObserver(() => {
      const el = findFileInput();
      if (el) {
        obs.disconnect();
        window.clearTimeout(timer);
        resolve(el);
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
}

function injectFile(input: HTMLInputElement, file: File) {
  const dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));

  const zone = input.closest<HTMLElement>('[role="button"]') ?? input.parentElement;
  if (zone) {
    for (const type of ["dragenter", "dragover", "drop"]) {
      zone.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    }
  }
}

function showToast(text: string) {
  const host = document.createElement("div");
  host.style.cssText = `
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;
  const box = document.createElement("div");
  box.textContent = text;
  box.style.cssText = `
    background: #0f172a; color: #e2e8f0; border: 1px solid rgba(51,65,85,0.9);
    border-radius: 10px; padding: 10px 14px; font-size: 12.5px; font-weight: 600;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35); max-width: 280px;
  `;
  host.appendChild(box);
  document.body.appendChild(host);
  window.setTimeout(() => host.remove(), 4000);
}

async function main() {
  const stored = await chrome.storage.local.get(MW_PENDING_KEY);
  const pending = stored[MW_PENDING_KEY] as MwPendingImage | undefined;
  if (!pending) return;
  await chrome.storage.local.remove(MW_PENDING_KEY);
  if (Date.now() - pending.ts > MW_PENDING_FRESH_MS) return;

  const input = await waitForFileInput();
  if (!input) {
    showToast("Maph Pro 3D: não encontrei o campo de busca por imagem — cole com Ctrl+V ou carregue o arquivo baixado.");
    return;
  }
  injectFile(input, dataUrlToFile(pending.dataUrl, pending.filename));
  showToast("Maph Pro 3D: imagem enviada pro MakerWorld ✓");
}

main();
