import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, getRateLimitRemaining, resetRateLimit } from "@/lib/rate-limit"

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimit("test-key")
  })

  it("allows requests within the limit", () => {
    const config = { maxRequests: 3, windowMs: 60000 }
    expect(checkRateLimit("test-key", config)).toBe(true)
    expect(checkRateLimit("test-key", config)).toBe(true)
    expect(checkRateLimit("test-key", config)).toBe(true)
  })

  it("blocks requests over the limit", () => {
    const config = { maxRequests: 2, windowMs: 60000 }
    expect(checkRateLimit("test-key", config)).toBe(true)
    expect(checkRateLimit("test-key", config)).toBe(true)
    expect(checkRateLimit("test-key", config)).toBe(false)
  })

  it("tracks different keys independently", () => {
    const config = { maxRequests: 1, windowMs: 60000 }
    expect(checkRateLimit("key-a", config)).toBe(true)
    expect(checkRateLimit("key-b", config)).toBe(true)
    expect(checkRateLimit("key-a", config)).toBe(false)
    expect(checkRateLimit("key-b", config)).toBe(false)
    resetRateLimit("key-a")
    resetRateLimit("key-b")
  })

  it("returns correct remaining count", () => {
    const config = { maxRequests: 5, windowMs: 60000 }
    expect(getRateLimitRemaining("test-key", config)).toBe(5)
    checkRateLimit("test-key", config)
    checkRateLimit("test-key", config)
    expect(getRateLimitRemaining("test-key", config)).toBe(3)
  })

  it("resetRateLimit clears the key", () => {
    const config = { maxRequests: 1, windowMs: 60000 }
    checkRateLimit("test-key", config)
    expect(checkRateLimit("test-key", config)).toBe(false)
    resetRateLimit("test-key")
    expect(checkRateLimit("test-key", config)).toBe(true)
  })

  it("returns full remaining for unknown key", () => {
    const config = { maxRequests: 100, windowMs: 60000 }
    expect(getRateLimitRemaining("never-used", config)).toBe(100)
  })
})
