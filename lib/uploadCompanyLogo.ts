import { supabase } from "@/lib/supabaseClient";

const BUCKET = "company-logos";

/** Converte data URL de imagem em Blob (JPEG/PNG/WebP via prefixo). */
export function dataUrlToBlob(dataUrl: string): Blob | null {
  const trimmed = dataUrl.trim();
  const m = trimmed.match(/^data:image\/([\w+.-]+);base64,(.+)$/i);
  if (!m) return null;
  const ext = m[1].toLowerCase();
  const mime =
    ext === "jpg" || ext === "jpeg"
      ? "image/jpeg"
      : ext === "png"
        ? "image/png"
        : ext === "webp"
          ? "image/webp"
          : `image/${ext}`;
  const b64 = m[2].replace(/\s/g, "");
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

/**
 * Envia logo para Storage e devolve URL pública.
 * O path fica em {userId}/logo.jpg para um arquivo por conta.
 */
export async function uploadCompanyLogoFromDataUrl(
  userId: string,
  dataUrl: string,
): Promise<{ publicUrl: string } | { error: string }> {
  if (!supabase) {
    return { error: "Supabase não configurado." };
  }
  const blob = dataUrlToBlob(dataUrl);
  if (!blob) {
    return { error: "Imagem inválida (data URL)." };
  }

  const path = `${userId}/logo.jpg`;
  const contentType = blob.type === "image/jpeg" || blob.type === "image/jpg" ? "image/jpeg" : blob.type || "image/jpeg";

  const { error: upError } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true,
    contentType,
  });

  if (upError) {
    return {
      error:
        upError.message ||
        "Falha ao enviar logo. Aplique a migração `20260320_company_logos_storage.sql` no Supabase (bucket company-logos).",
    };
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    return { error: "Não foi possível obter a URL pública do logo." };
  }
  return { publicUrl: data.publicUrl };
}
