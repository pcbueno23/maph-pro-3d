/**
 * Junta todas as imagens do anúncio (galeria) num único .zip pra baixar de
 * uma vez. A Shopee não expõe a lista de imagens num JSON fácil de ler,
 * então varremos o DOM — confirmado com HTML real capturado da página:
 *
 * - Cada miniatura da galeria é um <img> quadrado (82x82) dentro de um
 *   <picture> (com <source> webp redimensionado) — outros usos de imagem
 *   na página (logo da loja, banner, QR code, selo de libras...) não têm
 *   essa combinação exata de "dentro de <picture>" + "quadrada".
 * - O atributo `src` do <img> (não `.currentSrc`!) já é o arquivo ORIGINAL
 *   sem sufixo de redimensionamento — ex.:
 *   "https://down-br.img.susercontent.com/file/br-...-mrp8xibhi3np79".
 *   `.currentSrc` pegaria a variante pequena que o navegador escolheu do
 *   `srcset` do <picture> (82-164px), então não usamos.
 */
import { zipSync } from "fflate";

const CDN_PATTERN = /susercontent\.com|shopeemobile\.com/i;

function isGalleryThumbnail(img: HTMLImageElement): boolean {
  if (!img.closest("picture")) return false;
  const w = Number(img.getAttribute("width")) || img.width;
  const h = Number(img.getAttribute("height")) || img.height;
  if (!w || !h || w !== h) return false; // miniaturas da galeria são sempre quadradas
  return true;
}

export function scrapeGalleryImageUrls(): string[] {
  const urls = new Set<string>();

  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
  for (const img of imgs) {
    if (!isGalleryThumbnail(img)) continue;
    const src = img.getAttribute("src") || "";
    if (!src || !CDN_PATTERN.test(src)) continue;
    urls.add(src);
  }

  // Fallback: se a heurística acima não achar nada (a Shopee mudou o
  // layout), pelo menos pega a imagem principal via og:image.
  if (urls.size === 0) {
    const og = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.getAttribute("content");
    if (og) urls.add(og);
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
