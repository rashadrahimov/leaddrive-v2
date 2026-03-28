export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

export const RATE_LIMIT_CONFIG = {
  api: { maxRequests: 100, windowMs: 60000 } as RateLimitConfig,
  ai: { maxRequests: 20, windowMs: 60000 } as RateLimitConfig,
  public: { maxRequests: 10, windowMs: 60000 } as RateLimitConfig,
}

interface RequestRecord {
  count: number
  resetTime: number
}

// TODO: Replace with Redis-backed rate limiter for production.
// Current in-memory Map resets on PM2 restart and does not work across multiple instances.
// Max entries capped at 10000 to prevent memory leak.
const MAX_STORE_SIZE = 10000
const requestStore = new Map<string, RequestRecord>()

export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const record = requestStore.get(key)

  // Evict expired entries if store grows too large
  if (requestStore.size > MAX_STORE_SIZE) {
    for (const [k, v] of requestStore) {
      if (now > v.resetTime) requestStore.delete(k)
    }
  }

  if (!record || now > record.resetTime) {
    requestStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return true
  }

  if (record.count < config.maxRequests) {
    record.count++
    return true
  }

  return false
}

export function getRateLimitRemaining(
  key: string,
  config: RateLimitConfig
): number {
  const record = requestStore.get(key)
  if (!record || Date.now() > record.resetTime) return config.maxRequests

  return Math.max(0, config.maxRequests - record.count)
}

export function resetRateLimit(key: string): void {
  requestStore.delete(key)
}
