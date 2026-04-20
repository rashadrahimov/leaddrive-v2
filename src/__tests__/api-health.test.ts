import { describe, it, expect } from "vitest"
import { GET } from "@/app/api/health/route"

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe("ok")
  })

  it("includes an ISO timestamp close to now", async () => {
    const res = await GET()
    const body = await res.json()
    const t = Date.parse(body.timestamp)
    expect(Number.isFinite(t)).toBe(true)
    expect(Math.abs(t - Date.now())).toBeLessThan(5000)
  })

  it("includes process uptime as a non-negative number", async () => {
    const res = await GET()
    const body = await res.json()
    expect(typeof body.uptime).toBe("number")
    expect(body.uptime).toBeGreaterThanOrEqual(0)
  })
})
