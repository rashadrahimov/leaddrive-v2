import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    campaign: { findMany: vi.fn() },
    campaignVariant: { update: vi.fn() },
    contact: { findMany: vi.fn(), update: vi.fn() },
    contactEvent: { findMany: vi.fn() },
    organization: { findMany: vi.fn() },
    savedReport: { findMany: vi.fn(), update: vi.fn() },
    escalationRule: { findMany: vi.fn() },
    ticket: { findMany: vi.fn(), updateMany: vi.fn() },
    user: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  renderTemplate: vi.fn().mockReturnValue("<p>rendered</p>"),
}))

vi.mock("@/lib/auto-assign", () => ({
  autoAssignTicket: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/tenant-provisioning", () => ({
  purgeScheduledTenants: vi.fn().mockResolvedValue({ purged: [], errors: [] }),
}))

vi.mock("@/lib/tenant-export", () => ({
  exportTenantData: vi.fn().mockResolvedValue({ filename: "export.zip" }),
}))

vi.mock("@/lib/report-engine", () => ({
  executeReport: vi.fn().mockResolvedValue({ data: [] }),
}))

vi.mock("exceljs", () => {
  return {
    default: {
      Workbook: vi.fn().mockImplementation(() => ({
        addWorksheet: vi.fn().mockReturnValue({ addRow: vi.fn() }),
        xlsx: { writeBuffer: vi.fn().mockResolvedValue(Buffer.from("xlsx")) },
      })),
    },
  }
})

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal() as any
  return { ...actual, writeFileSync: vi.fn(), unlinkSync: vi.fn() }
})

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { POST as abTestPOST } from "@/app/api/cron/ab-test-winner/route"
import { POST as engagementDecayPOST } from "@/app/api/cron/engagement-decay/route"
import { POST as purgeTenantsPOST } from "@/app/api/cron/purge-tenants/route"
import { POST as scheduledReportsPOST } from "@/app/api/cron/scheduled-reports/route"
import { POST as slaEscalationPOST } from "@/app/api/cron/sla-escalation/route"
import { prisma } from "@/lib/prisma"

const CRON_SECRET = "test-cron-secret-123"

function cronReq(url: string, headerStyle: "x-cron-secret" | "bearer" = "x-cron-secret", secret = CRON_SECRET) {
  const headers: Record<string, string> =
    headerStyle === "bearer"
      ? { authorization: `Bearer ${secret}` }
      : { "x-cron-secret": secret }
  return new NextRequest(url, { method: "POST", headers })
}

/* ================================================================== */
/*  A/B Test Winner                                                    */
/* ================================================================== */

describe("Cron — POST /api/cron/ab-test-winner", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", CRON_SECRET)
  })

  it("returns 401 without valid cron secret", async () => {
    const req = cronReq("http://localhost/api/cron/ab-test-winner", "x-cron-secret", "bad")
    const res = await abTestPOST(req)
    expect(res.status).toBe(401)
  })

  it("returns 200 with processed=0 when no campaigns qualify", async () => {
    vi.mocked(prisma.campaign.findMany).mockResolvedValue([])
    const res = await abTestPOST(cronReq("http://localhost/api/cron/ab-test-winner"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.processed).toBe(0)
  })
})

/* ================================================================== */
/*  Engagement Decay                                                   */
/* ================================================================== */

describe("Cron — POST /api/cron/engagement-decay", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", CRON_SECRET)
  })

  it("returns 401 with wrong secret", async () => {
    const res = await engagementDecayPOST(cronReq("http://localhost/api/cron/engagement-decay", "x-cron-secret", "wrong"))
    expect(res.status).toBe(401)
  })

  it("returns success with recalculated/decayed counts", async () => {
    vi.mocked(prisma.contact.findMany).mockResolvedValue([])
    const res = await engagementDecayPOST(cronReq("http://localhost/api/cron/engagement-decay"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.recalculated).toBe(0)
    expect(json.data.decayed).toBe(0)
  })
})

/* ================================================================== */
/*  Purge Tenants                                                      */
/* ================================================================== */

describe("Cron — POST /api/cron/purge-tenants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", CRON_SECRET)
  })

  it("returns 401 without bearer token", async () => {
    const req = new NextRequest("http://localhost/api/cron/purge-tenants", {
      method: "POST",
      headers: { authorization: "Bearer wrong" },
    })
    const res = await purgeTenantsPOST(req)
    expect(res.status).toBe(401)
  })

  it("returns purged=0 when no overdue tenants", async () => {
    vi.mocked(prisma.organization.findMany).mockResolvedValue([])
    const req = cronReq("http://localhost/api/cron/purge-tenants", "bearer")
    const res = await purgeTenantsPOST(req)
    const json = await res.json()
    expect(json.purged).toBe(0)
  })
})

/* ================================================================== */
/*  Scheduled Reports                                                  */
/* ================================================================== */

describe("Cron — POST /api/cron/scheduled-reports", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", CRON_SECRET)
  })

  it("returns 401 without authorization header", async () => {
    const req = new NextRequest("http://localhost/api/cron/scheduled-reports", {
      method: "POST",
    })
    const res = await scheduledReportsPOST(req)
    expect(res.status).toBe(401)
  })

  it("throws RangeError with wrong-length bearer token (timingSafeEqual)", async () => {
    // timingSafeEqual throws RangeError when buffers differ in length;
    // the route does not catch this, so it propagates
    const req = new NextRequest("http://localhost/api/cron/scheduled-reports", {
      method: "POST",
      headers: { authorization: "Bearer bad" },
    })
    await expect(scheduledReportsPOST(req)).rejects.toThrow(RangeError)
  })
})

/* ================================================================== */
/*  SLA Escalation                                                     */
/* ================================================================== */

describe("Cron — POST /api/cron/sla-escalation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", CRON_SECRET)
  })

  it("returns 401 with missing secret", async () => {
    const req = new NextRequest("http://localhost/api/cron/sla-escalation", {
      method: "POST",
    })
    const res = await slaEscalationPOST(req)
    expect(res.status).toBe(401)
  })

  it("returns success when no escalation rules exist", async () => {
    vi.mocked(prisma.escalationRule.findMany).mockResolvedValue([])
    const res = await slaEscalationPOST(cronReq("http://localhost/api/cron/sla-escalation"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.escalatedCount).toBe(0)
    expect(json.data.notifiedCount).toBe(0)
  })
})
