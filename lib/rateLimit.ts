/**
 * Rate limiter in-memory simples.
 *
 * Funciona em dev e em deploy single-instance (ex: VPS, Railway, Fly.io).
 * Em ambientes serverless/multi-instância (Vercel Edge, Lambda), use Redis
 * (ex: Upstash com @upstash/ratelimit) para garantir consistência global.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Remove entradas expiradas para não deixar o Map crescer indefinidamente. */
function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

let cleanupScheduled = false;
function scheduleCleanup() {
  if (cleanupScheduled) return;
  cleanupScheduled = true;
  setTimeout(() => {
    cleanup();
    cleanupScheduled = false;
  }, 60_000);
}

/**
 * Verifica se a chave ultrapassou o limite.
 * @param key    Identificador único (ex: `ip:endpoint`)
 * @param limit  Máximo de requisições no janela
 * @param windowMs Duração da janela em ms (padrão: 60 000 = 1 min)
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  scheduleCleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count += 1;
  const remaining = Math.max(0, limit - entry.count);
  return { allowed: entry.count <= limit, remaining, resetAt: entry.resetAt };
}
