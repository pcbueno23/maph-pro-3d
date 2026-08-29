/**
 * Junta todas as imagens do anúncio (galeria) num único .zip pra baixar de
 * uma vez. A Shopee não expõe a lista de imagens num JSON fácil de ler,
 * então varremos o DOM — confirmado com HTML real capturado da página.
 *
 * Uma heurística por "formato" (quadrada + dentro de <picture>) pegava
 * também fotos de avaliação de clientes, ícones de compartilhar, QR code e
 * selo de libras — tudo usa a mesma estrutura de imagem na página deles.
 * A única forma confiável de isolar SÓ a galeria do produto é pelo
 * container específico do carrossel de miniaturas (confirmado com HTML
 * real: `.Wi_1Rq` engloba as miniaturas, cada uma dentro de `.qIctnQ`).
 *
 * Risco: são classes ofuscadas (geradas pelo build da Shopee) — podem
 * mudar numa atualização deles. Por isso o fallback pro og:image, pra
 * nunca ficar sem nenhuma imagem se isso quebrar.
 *
 * O atributo `src` do <img> (não `.currentSrc`!) já é o arquivo ORIGINAL
 * sem sufixo de redimensionamento — `.currentSrc` pegaria a variante
 * pequena que o navegador escolheu do `srcset` do <picture> (82-164px).
 */
import { zipSync } from "fflate";

const CDN_PATTERN = /susercontent\.com|shopeemobile\.com/i;
const GALLERY_SELECTOR = ".Wi_1Rq img, .qIctnQ img";

export function scrapeGalleryImageUrls(): string[] {
  const urls = new Set<string>();

  for (const img of Array.from(document.querySelectorAll<HTMLImageElement>(GALLERY_SELECTOR))) {
    const src = img.getAttribute("src") || "";
    if (src && CDN_PATTERN.test(src)) urls.add(src);
  }

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
