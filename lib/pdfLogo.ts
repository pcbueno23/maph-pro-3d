/**
 * Converte qualquer URL ou data URL de imagem exibível no browser
 * em JPEG base64 para jsPDF (evita falha com WebP, GIF e URLs remotas com CORS ok).
 */
export async function rasterizeImageSrcForJsPdf(
  src: string,
  options?: { maxSide?: number; quality?: number },
): Promise<{ format: "JPEG"; data: string } | null> {
  const trimmed = src.trim();
  if (!trimmed) return null;

  const maxSide = options?.maxSide ?? 512;
  const quality = options?.quality ?? 0.88;

  return new Promise((resolve) => {
    const img = new window.Image();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          resolve(null);
          return;
        }
        const scale = Math.min(1, maxSide / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/i);
        resolve(m ? { format: "JPEG", data: m[1] } : null);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = trimmed;
  });
}
