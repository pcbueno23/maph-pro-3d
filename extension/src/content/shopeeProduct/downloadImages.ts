/**
 * Junta todas as imagens do anúncio (galeria) num único .zip pra baixar de
 * uma vez. Heurística de melhor esforço — a Shopee não expõe a lista de
 * imagens num JSON fácil de ler, então varremos as tags <img> da página
 * procurando o CDN de imagens deles (susercontent.com). Se pegar alguma
 * imagem errada (ex.: avatar do vendedor) ou perder alguma da galeria, é
 * aqui que precisa ajustar — melhor com uma captura de tela real da página
 * pra confirmar o que está sobrando/faltando.
 */
import { zipSync } from "fflate";

const CDN_PATTERN = /susercontent\.com|shopeemobile\.com/i;
const MIN_SIZE_PX = 80; // corta ícones/avatares pequenos, mantém fotos de galeria

export function scrapeGalleryImageUrls(): string[] {
  const urls = new Set<string>();

  const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.getAttribute("content");
  if (og) urls.add(og);

  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
  for (const img of imgs) {
    const src = img.currentSrc || img.src || img.getAttribute("data-src") || "";
    if (!src || !CDN_PATTERN.test(src)) continue;
    if (img.naturalWidth > 0 && img.naturalWidth < MIN_SIZE_PX) continue;
    urls.add(src);
  }

  return Array.from(urls);
}

function guessExt(url: string, contentType: string | null): string {
  const match = url.match(/\.(jpe?g|png|webp|gif)(?:$|[?#])/i);
  if (match) return `.${match[1].toLowerCase().replace("jpeg", "jpg")}`;
  if (contentType?.includes("png")) return ".png";
  if (contentType?.includes("webp")) return ".webp";
  if (contentType?.includes("gif")) return ".gif";
  return ".jpg";
}

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "anuncio"
  );
}

export type DownloadZipResult = { ok: number; total: number };

/** Baixa cada imagem, zipa o que conseguir e dispara o download — segue tentando mesmo se alguma falhar (CORS/404/etc.), em vez de travar tudo por causa de uma imagem só. */
export async function downloadImagesAsZip(urls: string[], titleForFilename: string | null): Promise<DownloadZipResult> {
  const files: Record<string, Uint8Array> = {};
  let ok = 0;

  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i]);
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      const ext = guessExt(urls[i], res.headers.get("content-type"));
      files[`imagem-${String(i + 1).padStart(2, "0")}${ext}`] = buf;
      ok += 1;
    } catch {
      // ignora essa imagem, segue pras próximas
    }
  }

  if (ok === 0) return { ok: 0, total: urls.length };

  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `${slugify(titleForFilename ?? "anuncio")}.zip`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

  return { ok, total: urls.length };
}
