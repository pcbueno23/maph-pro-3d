import { supabase } from "@/lib/supabaseClient";
import { rasterizeImageSrcForJsPdf } from "@/lib/pdfLogo";

const BUCKET = "company-logos";

/** Extrai o path dentro do bucket a partir da URL pública do Supabase. */
export function parseCompanyLogoStoragePath(publicUrl: string): string | null {
  try {
    const u = new URL(publicUrl.trim());
    const marker = "/object/public/company-logos/";
    const idx = u.pathname.indexOf(marker);
    if (idx === -1) return null;
    const path = u.pathname.slice(idx + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    return null;
  }
}

/**
 * Carrega a logo para o PDF: prioriza download autenticado no Storage (evita CORS na URL pública),
 * depois signed URL, depois fetch/raster genérico.
 */
export async function rasterizeCompanyLogoForPdf(
  logoSrc: string,
): Promise<{ format: "JPEG"; data: string } | null> {
  const trimmed = logoSrc.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:")) {
    return rasterizeImageSrcForJsPdf(trimmed);
  }

  const storagePath = parseCompanyLogoStoragePath(trimmed);

  if (storagePath && supabase) {
    const { data: blob, error: downErr } = await supabase.storage.from(BUCKET).download(storagePath);
    if (!downErr && blob && blob.size > 0) {
      const objUrl = URL.createObjectURL(blob);
      try {
        const out = await rasterizeImageSrcForJsPdf(objUrl);
        return out;
      } finally {
        URL.revokeObjectURL(objUrl);
      }
    }

    const { data: signed, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 180);
    if (!signErr && signed?.signedUrl) {
      const out = await rasterizeImageSrcForJsPdf(signed.signedUrl);
      if (out) return out;
    }
  }

  return rasterizeImageSrcForJsPdf(trimmed);
}
