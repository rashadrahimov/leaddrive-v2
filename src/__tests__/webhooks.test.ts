import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "crypto"

// Mock prisma before importing webhooks
vi.mock("@/lib/prisma", () => ({
  prisma: {
    webhook: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/url-validation", () => ({
  isPrivateUrl: (url: string) => url.includes("127.0.0.1") || url.includes("localhost") || url.includes("10.0."),
}))

import { fireWebhooks } from "@/lib/webhooks"
import { prisma } from "@/lib/prisma"

describe("webhooks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it("dispatches to matching webhooks", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      { id: "1", organizationId: "org1", url: "https://example.com/hook", secret: "s3cret", events: ["deal.created"], isActive: true, createdAt: new Date(), updatedAt: new Date(), name: "test" },
    ] as any)

    await fireWebhooks("org1", "deal.created", { id: "deal-1" })

    // Wait for fire-and-forget dispatch
    await new Promise(r => setTimeout(r, 100))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe("https://example.com/hook")
    expect(opts.headers["X-Webhook-Event"]).toBe("deal.created")
    expect(opts.headers["X-Webhook-Signature"]).toBeTruthy()

    // Verify HMAC signature
    const body = opts.body
    const expectedSig = createHmac("sha256", "s3cret").update(body).digest("hex")
    expect(opts.headers["X-Webhook-Signature"]).toBe(expectedSig)

    vi.unstubAllGlobals()
  })

  it("skips webhooks that don't match the event", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      { id: "1", organizationId: "org1", url: "https://example.com/hook", secret: "s3cret", events: ["ticket.created"], isActive: true, createdAt: new Date(), updatedAt: new Date(), name: "test" },
    ] as any)

    await fireWebhooks("org1", "deal.created", { id: "deal-1" })
    await new Promise(r => setTimeout(r, 100))

    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("blocks SSRF to private URLs", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      { id: "1", organizationId: "org1", url: "http://127.0.0.1:8080/internal", secret: "s3cret", events: ["deal.created"], isActive: true, createdAt: new Date(), updatedAt: new Date(), name: "test" },
    ] as any)

    await fireWebhooks("org1", "deal.created", { id: "deal-1" })
    await new Promise(r => setTimeout(r, 100))

    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it("retries on server error with exponential backoff", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 502 })
      .mockResolvedValueOnce({ ok: true })
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      { id: "1", organizationId: "org1", url: "https://example.com/hook", secret: "s3cret", events: ["deal.created"], isActive: true, createdAt: new Date(), updatedAt: new Date(), name: "test" },
    ] as any)

    await fireWebhooks("org1", "deal.created", { id: "deal-1" })
    // Wait enough for retries (1s + 4s backoff)
    await new Promise(r => setTimeout(r, 6000))

    expect(mockFetch).toHaveBeenCalledTimes(3)
    vi.unstubAllGlobals()
  }, 10000)

  it("does not retry on 4xx client errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404 })
    vi.stubGlobal("fetch", mockFetch)

    vi.mocked(prisma.webhook.findMany).mockResolvedValue([
      { id: "1", organizationId: "org1", url: "https://example.com/hook", secret: "s3cret", events: ["deal.created"], isActive: true, createdAt: new Date(), updatedAt: new Date(), name: "test" },
    ] as any)

    await fireWebhooks("org1", "deal.created", { id: "deal-1" })
    await new Promise(r => setTimeout(r, 500))

    expect(mockFetch).toHaveBeenCalledTimes(1)
    vi.unstubAllGlobals()
  })
})
