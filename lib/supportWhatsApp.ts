/**
 * Link curto oficial do WhatsApp (w.app) — padrão MAPH PRO 3D.
 * Sobrescreva com NEXT_PUBLIC_WHATSAPP_SUPPORT_LINK se precisar.
 * @see https://w.app/maphpro3d
 */
export const DEFAULT_WHATSAPP_SUPPORT_LINK = "https://w.app/maphpro3d";

/**
 * Número só para exibição na UI quando NEXT_PUBLIC_WHATSAPP_SUPPORT não está definido
 * (mesmo contato do link w.app padrão: +55 75 99260-9164).
 */
const DEFAULT_WHATSAPP_DISPLAY_DIGITS = "5575992609164";

/**
 * Número do WhatsApp de suporte (somente dígitos, com DDI).
 * Ex.: Brasil 5511999999999 — configure em NEXT_PUBLIC_WHATSAPP_SUPPORT.
 */
export function getWhatsAppSupportDigits(): string | null {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

/** Dígitos para mostrar no card (env ou padrão alinhado ao link w.app). */
export function getWhatsAppSupportDisplayDigits(): string {
  return getWhatsAppSupportDigits() ?? DEFAULT_WHATSAPP_DISPLAY_DIGITS;
}

/**
 * Link principal do botão "Abrir WhatsApp" — w.app (curto) por padrão.
 */
export function getWhatsAppSupportChatLink(): string {
  const fromEnv = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_LINK?.trim();
  if (fromEnv) return fromEnv;
  return DEFAULT_WHATSAPP_SUPPORT_LINK;
}

/** URL wa.me (alternativa); opcionalmente com texto inicial. */
export function getWhatsAppSupportUrl(prefillMessage?: string): string | null {
  const digits = getWhatsAppSupportDigits();
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  const msg =
    prefillMessage?.trim() ||
    process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_MESSAGE?.trim();
  if (!msg) return base;
  const params = new URLSearchParams({ text: msg });
  return `${base}?${params.toString()}`;
}

/** Exibe o número de forma legível (melhor esforço para BR). */
export function formatWhatsAppDisplay(digits: string): string {
  if (digits.startsWith("55") && digits.length >= 12) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
    }
    if (rest.length === 8) {
      return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
    }
  }
  return `+${digits}`;
}
