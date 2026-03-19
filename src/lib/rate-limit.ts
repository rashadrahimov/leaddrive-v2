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

// In-memory rate limiter (Redis for production)
const requestStore = new Map<string, RequestRecord>()

export function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now()
  const record = requestStore.get(key)

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
