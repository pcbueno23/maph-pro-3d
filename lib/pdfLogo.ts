/**
 * Converte qualquer URL ou data URL de imagem exibível no browser
 * em JPEG base64 para jsPDF (WebP, PNG, JPEG; URLs via fetch + blob).
 */
function drawImageToJpeg(
  img: HTMLImageElement,
  maxSide: number,
  quality: number,
): { format: "JPEG"; data: string } | null {
  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, maxSide / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale));
    const ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, cw, ch);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    const m = dataUrl.match(/^data:image\/jpeg;base64,(.+)$/i);
    return m ? { format: "JPEG", data: m[1] } : null;
  } catch {
    return null;
  }
}

export async function rasterizeImageSrcForJsPdf(
  src: string,
  options?: { maxSide?: number; quality?: number },
): Promise<{ format: "JPEG"; data: string } | null> {
  const trimmed = src.trim();
  if (!trimmed) return null;

  const maxSide = options?.maxSide ?? 512;
  const quality = options?.quality ?? 0.88;

  let loadSrc = trimmed;
  let revoke: (() => void) | undefined;
  let useCorsOnDirectUrl = false;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const res = await fetch(trimmed, { mode: "cors", cache: "no-store" });
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0) {
          const objUrl = URL.createObjectURL(blob);
          loadSrc = objUrl;
          revoke = () => URL.revokeObjectURL(objUrl);
        }
      }
    } catch {
      /* tenta carregar a URL direto abaixo */
    }
    if (loadSrc === trimmed) {
      useCorsOnDirectUrl = true;
    }
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    if (useCorsOnDirectUrl) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => {
      try {
        const out = drawImageToJpeg(img, maxSide, quality);
        revoke?.();
        resolve(out);
      } catch {
        revoke?.();
        resolve(null);
      }
    };
    img.onerror = () => {
      revoke?.();
      resolve(null);
    };
    img.src = loadSrc;
  });
}
