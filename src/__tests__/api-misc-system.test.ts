import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest, NextResponse } from "next/server"

/* ── mocks ──────────────────────────────────────────────── */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    kbCategory: { findMany: vi.fn(), create: vi.fn(), delete: vi.fn() },
    kbArticle: { updateMany: vi.fn() },
    leadAssignmentRule: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    slaPolicy: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    emailLog: { findUnique: vi.fn(), update: vi.fn() },
    campaign: { update: vi.fn() },
    campaignVariant: { update: vi.fn() },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
  requireAuth: vi.fn(),
  isAuthError: vi.fn().mockImplementation((v: any) => v instanceof Response),
}))

vi.mock("@/lib/ai/predictive", () => ({
  calculateChurnRisk: vi.fn(),
  predictDealWin: vi.fn(),
  dealVelocityAnalysis: vi.fn(),
  generateRevenueForecast: vi.fn(),
}))

vi.mock("@/lib/whatsapp", () => ({
  sendWhatsAppMessage: vi.fn(),
  sendWhatsAppTemplate: vi.fn(),
}))

vi.mock("@/lib/contact-events", () => ({
  trackContactEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/url-validation", () => ({
  isPrivateUrl: vi.fn().mockReturnValue(false),
}))

/* ── imports ─────────────────────────────────────────────── */

import { GET as churnRiskGET } from "@/app/api/v1/analytics/churn-risk/route"
import { GET as dealPredGET } from "@/app/api/v1/analytics/deal-prediction/route"
import { GET as dealVelGET } from "@/app/api/v1/analytics/deal-velocity/route"
import { GET as forecastGET } from "@/app/api/v1/analytics/forecast/route"
import { GET as kbCatGET, POST as kbCatPOST } from "@/app/api/v1/kb-categories/route"
import { DELETE as kbCatDELETE } from "@/app/api/v1/kb-categories/[id]/route"
import { GET as leadRulesGET, POST as leadRulesPOST } from "@/app/api/v1/lead-rules/route"
import { PUT as leadRulesPUT, DELETE as leadRulesDELETE } from "@/app/api/v1/lead-rules/[id]/route"
import { GET as slaPoliciesGET, POST as slaPoliciesPOST } from "@/app/api/v1/sla-policies/route"
import { PUT as slaPoliciesPUT, DELETE as slaPoliciesDELETE } from "@/app/api/v1/sla-policies/[id]/route"
import { GET as trackClickGET } from "@/app/api/v1/tracking/click/route"
import { GET as trackOpenGET } from "@/app/api/v1/tracking/open/route"
import { POST as whatsappSendPOST } from "@/app/api/v1/whatsapp/send/route"
import { POST as whatsappTestPOST } from "@/app/api/v1/whatsapp/test/route"

import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { calculateChurnRisk, predictDealWin, dealVelocityAnalysis, generateRevenueForecast } from "@/lib/ai/predictive"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/whatsapp"
import { isPrivateUrl } from "@/lib/url-validation"

/* ── helpers ─────────────────────────────────────────────── */

const AUTH = { orgId: "org-1", userId: "user-1", role: "admin", email: "a@b.com", name: "Test" }

function req(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getOrgId).mockResolvedValue("org-1")
  vi.mocked(getSession).mockResolvedValue(AUTH as any)
})

/* ── Analytics: Churn Risk ───────────────────────────────── */

describe("Analytics Churn Risk", () => {
  it("GET returns risk data", async () => {
    vi.mocked(calculateChurnRisk).mockResolvedValue([{ companyId: "c1", risk: 0.8 }] as any)

    const res = await churnRiskGET(req("/api/v1/analytics/churn-risk"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("GET returns 401 without session", async () => {
    vi.mocked(getSession).mockResolvedValue(null as any)
    const res = await churnRiskGET(req("/api/v1/analytics/churn-risk"))
    expect(res.status).toBe(401)
  })
})

/* ── Analytics: Deal Prediction ──────────────────────────── */

describe("Analytics Deal Prediction", () => {
  it("GET returns prediction", async () => {
    vi.mocked(predictDealWin).mockResolvedValue({ probability: 0.75, factors: [] } as any)

    const res = await dealPredGET(req("/api/v1/analytics/deal-prediction?dealId=d1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.probability).toBe(0.75)
  })

  it("GET requires dealId", async () => {
    const res = await dealPredGET(req("/api/v1/analytics/deal-prediction"))
    expect(res.status).toBe(400)
  })
})

/* ── Analytics: Deal Velocity ────────────────────────────── */

describe("Analytics Deal Velocity", () => {
  it("GET returns velocity data", async () => {
    vi.mocked(dealVelocityAnalysis).mockResolvedValue({ avgDays: 30, stages: [] } as any)

    const res = await dealVelGET(req("/api/v1/analytics/deal-velocity"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.avgDays).toBe(30)
  })
})

/* ── Analytics: Forecast ─────────────────────────────────── */

describe("Analytics Forecast", () => {
  it("GET returns forecast", async () => {
    vi.mocked(generateRevenueForecast).mockResolvedValue({ months: [], total: 100000 } as any)

    const res = await forecastGET(req("/api/v1/analytics/forecast?months=3"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.total).toBe(100000)
  })
})

/* ── KB Categories ───────────────────────────────────────── */

describe("KB Categories", () => {
  it("GET returns categories with article count", async () => {
    vi.mocked(prisma.kbCategory.findMany).mockResolvedValue([
      { id: "cat1", name: "FAQ", _count: { articles: 5 } },
    ] as any)

    const res = await kbCatGET(req("/api/v1/kb-categories"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST creates category", async () => {
    vi.mocked(prisma.kbCategory.create).mockResolvedValue({ id: "cat2", name: "Guides" } as any)

    const res = await kbCatPOST(
      req("/api/v1/kb-categories", { method: "POST", body: JSON.stringify({ name: "Guides" }) })
    )
    expect(res.status).toBe(201)
  })

  it("DELETE removes category and unsets articles", async () => {
    vi.mocked(prisma.kbArticle.updateMany).mockResolvedValue({ count: 2 } as any)
    vi.mocked(prisma.kbCategory.delete).mockResolvedValue({} as any)

    const res = await kbCatDELETE(req("/api/v1/kb-categories/cat1", { method: "DELETE" }), params("cat1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.kbArticle.updateMany).toHaveBeenCalled()
  })
})

/* ── Lead Rules ──────────────────────────────────────────── */

describe("Lead Rules", () => {
  it("GET returns rules", async () => {
    vi.mocked(prisma.leadAssignmentRule.findMany).mockResolvedValue([{ id: "lr1", name: "Auto assign" }] as any)

    const res = await leadRulesGET(req("/api/v1/lead-rules"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST creates rule", async () => {
    vi.mocked(prisma.leadAssignmentRule.create).mockResolvedValue({ id: "lr2", name: "New" } as any)

    const res = await leadRulesPOST(
      req("/api/v1/lead-rules", {
        method: "POST",
        body: JSON.stringify({ name: "New", method: "round_robin" }),
      })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("PUT updates rule", async () => {
    vi.mocked(prisma.leadAssignmentRule.findFirst).mockResolvedValue({ id: "lr1" } as any)
    vi.mocked(prisma.leadAssignmentRule.update).mockResolvedValue({ id: "lr1", name: "Updated" } as any)

    const res = await leadRulesPUT(
      req("/api/v1/lead-rules/lr1", { method: "PUT", body: JSON.stringify({ name: "Updated" }) }),
      params("lr1")
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE removes rule", async () => {
    vi.mocked(prisma.leadAssignmentRule.findFirst).mockResolvedValue({ id: "lr1" } as any)
    vi.mocked(prisma.leadAssignmentRule.delete).mockResolvedValue({} as any)

    const res = await leadRulesDELETE(req("/api/v1/lead-rules/lr1", { method: "DELETE" }), params("lr1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE returns 404 for missing rule", async () => {
    vi.mocked(prisma.leadAssignmentRule.findFirst).mockResolvedValue(null)

    const res = await leadRulesDELETE(req("/api/v1/lead-rules/bad", { method: "DELETE" }), params("bad"))
    expect(res.status).toBe(404)
  })
})

/* ── SLA Policies ────────────────────────────────────────── */

describe("SLA Policies", () => {
  it("GET returns policies", async () => {
    vi.mocked(prisma.slaPolicy.findMany).mockResolvedValue([{ id: "s1", name: "Standard" }] as any)

    const res = await slaPoliciesGET(req("/api/v1/sla-policies"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data).toHaveLength(1)
  })

  it("POST creates policy", async () => {
    vi.mocked(prisma.slaPolicy.create).mockResolvedValue({ id: "s2", name: "Premium" } as any)

    const res = await slaPoliciesPOST(
      req("/api/v1/sla-policies", {
        method: "POST",
        body: JSON.stringify({
          name: "Premium", priority: "high", firstResponseHours: 1, resolutionHours: 4,
        }),
      })
    )
    expect(res.status).toBe(201)
  })

  it("PUT updates policy", async () => {
    vi.mocked(prisma.slaPolicy.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.slaPolicy.findFirst).mockResolvedValue({ id: "s1", name: "Updated" } as any)

    const res = await slaPoliciesPUT(
      req("/api/v1/sla-policies/s1", { method: "PUT", body: JSON.stringify({ name: "Updated" }) }),
      params("s1")
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE removes policy", async () => {
    vi.mocked(prisma.slaPolicy.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await slaPoliciesDELETE(req("/api/v1/sla-policies/s1", { method: "DELETE" }), params("s1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("DELETE returns 404 for missing policy", async () => {
    vi.mocked(prisma.slaPolicy.deleteMany).mockResolvedValue({ count: 0 } as any)

    const res = await slaPoliciesDELETE(req("/api/v1/sla-policies/bad", { method: "DELETE" }), params("bad"))
    expect(res.status).toBe(404)
  })
})

/* ── Tracking: Click ─────────────────────────────────────── */

describe("Tracking Click", () => {
  it("GET redirects to target URL", async () => {
    const res = await trackClickGET(req("/api/v1/tracking/click?url=https://example.com&logId=log1"))
    expect(res.status).toBe(302)
  })

  it("GET returns 400 without url param", async () => {
    const res = await trackClickGET(req("/api/v1/tracking/click"))
    expect(res.status).toBe(400)
  })

  it("GET rejects private URLs (SSRF protection)", async () => {
    vi.mocked(isPrivateUrl).mockReturnValue(true)
    const res = await trackClickGET(req("/api/v1/tracking/click?url=http://169.254.169.254"))
    expect(res.status).toBe(400)
  })
})

/* ── Tracking: Open ──────────────────────────────────────── */

describe("Tracking Open", () => {
  it("GET returns 1x1 pixel", async () => {
    const res = await trackOpenGET(req("/api/v1/tracking/open?logId=log1"))
    expect(res.headers.get("Content-Type")).toBe("image/gif")
  })

  it("GET records open event when logId provided", async () => {
    vi.mocked(prisma.emailLog.findUnique).mockResolvedValue({
      id: "log1", openedAt: null, campaignId: "camp1", variantId: null,
      contactId: "c1", organizationId: "org-1",
    } as any)
    vi.mocked(prisma.emailLog.update).mockResolvedValue({} as any)
    vi.mocked(prisma.campaign.update).mockResolvedValue({} as any)

    const res = await trackOpenGET(req("/api/v1/tracking/open?logId=log1"))
    expect(res.headers.get("Content-Type")).toBe("image/gif")
    expect(prisma.emailLog.update).toHaveBeenCalled()
  })
})

/* ── WhatsApp Send ───────────────────────────────────────── */

describe("WhatsApp Send", () => {
  it("POST sends text message", async () => {
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true, messageId: "m1" } as any)

    const res = await whatsappSendPOST(
      req("/api/v1/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({ to: "+994501234567", message: "Hello" }),
      })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("POST sends template message", async () => {
    vi.mocked(sendWhatsAppTemplate).mockResolvedValue({ success: true } as any)

    const res = await whatsappSendPOST(
      req("/api/v1/whatsapp/send", {
        method: "POST",
        body: JSON.stringify({ to: "+994501234567", templateName: "hello_world" }),
      })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("POST rejects missing to+message", async () => {
    const res = await whatsappSendPOST(
      req("/api/v1/whatsapp/send", { method: "POST", body: JSON.stringify({}) })
    )
    expect(res.status).toBe(400)
  })
})

/* ── WhatsApp Test ───────────────────────────────────────── */

describe("WhatsApp Test", () => {
  it("POST sends test message", async () => {
    vi.mocked(sendWhatsAppMessage).mockResolvedValue({ success: true } as any)

    const res = await whatsappTestPOST(
      req("/api/v1/whatsapp/test", {
        method: "POST",
        body: JSON.stringify({ to: "+994501234567" }),
      })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("POST rejects missing phone", async () => {
    const res = await whatsappTestPOST(
      req("/api/v1/whatsapp/test", { method: "POST", body: JSON.stringify({}) })
    )
    expect(res.status).toBe(400)
  })
})
