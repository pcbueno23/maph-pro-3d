/** Mantém só dígitos. */
export function digitsOnlyPhone(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Valida WhatsApp BR: 10 ou 11 dígitos (DDD + número; 11º dígito opcional é o 9).
 */
export function isValidBrazilWhatsapp(value: string): boolean {
  const d = digitsOnlyPhone(value);
  if (d.length < 10 || d.length > 11) return false;
  const ddd = Number.parseInt(d.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  return true;
}

export function formatBrazilWhatsappDisplay(value: string): string {
  const d = digitsOnlyPhone(value);
  if (d.length === 11) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }
  return value.trim();
}

export function normalizeBrazilWhatsapp(value: string): string {
  return digitsOnlyPhone(value);
}

export const WHATSAPP_INVALID_MESSAGE =
  "Informe um WhatsApp válido com DDD (10 ou 11 dígitos).";
