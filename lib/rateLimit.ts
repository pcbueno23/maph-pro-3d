/**
 * Rate limiter global via Upstash Redis.
 *
 * Funciona corretamente em ambientes serverless/multi-instância (Vercel, Lambda).
 * Requer UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN nas env vars.
 *
 * Fallback: se as env vars não estiverem configuradas (dev sem .env.local),
 * permite todas as requisições para não bloquear o desenvolvimento local.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Cache de instâncias por configuração (limit + window) para não recriar a cada request
const limiterCache = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null; // fallback: sem Redis configurado
  }

  const cacheKey = `${limit}:${windowMs}`;
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!;

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs / 1000} s`),
    analytics: false,
  });

  limiterCache.set(cacheKey, limiter);
  return limiter;
}

/**
 * Verifica se a chave ultrapassou o limite.
 * @param key      Identificador único (ex: `stripe-checkout:1.2.3.4`)
 * @param limit    Máximo de requisições na janela
 * @param windowMs Duração da janela em ms (padrão: 60 000 = 1 min)
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limiter = getLimiter(limit, windowMs);

  // Sem Redis configurado: permite tudo (útil em dev)
  if (!limiter) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const { success, remaining, reset } = await limiter.limit(key);
  return { allowed: success, remaining, resetAt: reset };
}
