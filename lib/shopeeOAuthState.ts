import { createHmac, timingSafeEqual } from "crypto";

/** Mesmo mecanismo do lib/mlOAuthState.ts — o callback da Shopee é navegação simples
 * do navegador (sem header Authorization), então o userId vai assinado no "state". */
const STATE_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const s = process.env.SHOPEE_OAUTH_STATE_SECRET?.trim();
  if (!s) throw new Error("SHOPEE_OAUTH_STATE_SECRET não configurado no servidor.");
  return s;
}

export function signShopeeState(userId: string): string {
  const payload = `${userId}.${Date.now() + STATE_TTL_MS}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("hex");
  return Buffer.from(`${payload}.${sig}`).toString("base64url");
}

export function verifyShopeeState(state: string): { ok: true; userId: string } | { ok: false; error: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    return { ok: false, error: "state inválido." };
  }
  const parts = decoded.split(".");
  if (parts.length !== 3) return { ok: false, error: "state malformado." };
  const [userId, expiresAtRaw, sig] = parts;
  const payload = `${userId}.${expiresAtRaw}`;
  const expected = createHmac("sha256", secret()).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { ok: false, error: "state com assinatura inválida." };
  }
  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return { ok: false, error: "state expirado — tente conectar de novo." };
  }
  return { ok: true, userId };
}
