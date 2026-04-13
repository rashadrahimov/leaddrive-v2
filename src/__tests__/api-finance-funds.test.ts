import { describe, it, expect, vi, beforeEach } from "vitest"

/* ------------------------------------------------------------------ */
/*  Mocks                                                              */
/* ------------------------------------------------------------------ */
vi.mock("@/lib/prisma", () => ({
  prisma: {
    fund: { findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fundRule: { findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    fundTransaction: { findMany: vi.fn(), create: vi.fn() },
    cashFlowEntry: { findMany: vi.fn() },
    bill: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    billPayment: { findMany: vi.fn(), create: vi.fn() },
    paymentRegistryEntry: { findMany: vi.fn(), create: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
    paymentOrder: { count: vi.fn() },
  },
}))
vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  requireAuth: vi.fn(),
  isAuthError: vi.fn().mockReturnValue(false),
}))
vi.mock("@/lib/finance/telegram-notify", () => ({
  notifyBillPaymentRecorded: vi.fn(),
}))
vi.mock("@/lib/constants", () => ({
  DEFAULT_CURRENCY: "AZN",
  PAGE_SIZE: { DEFAULT: 50 },
}))

import { prisma } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"
import { NextRequest } from "next/server"

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function makeReq(url = "http://localhost/x", method = "GET", body?: unknown): NextRequest {
  const opts: RequestInit = { method }
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" }
    opts.body = JSON.stringify(body)
  }
  return new NextRequest(url, opts)
}

const params = (id = "fund-1") => Promise.resolve({ id })

beforeEach(() => {
  vi.resetAllMocks()
  // Default requireAuth mock to return valid auth
  vi.mocked(requireAuth).mockResolvedValue({ orgId: "org-1", userId: "u-1" } as any)
  vi.mocked(isAuthError).mockReturnValue(false)
})

/* ================================================================== */
/*  funds/[id] — GET / PUT / DELETE                                    */
/* ================================================================== */
import { GET as fundGet, PUT as fundPut, DELETE as fundDelete } from "@/app/api/finance/funds/[id]/route"

describe("GET /api/finance/funds/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await fundGet(makeReq(), { params: params() })
    expect(res.status).toBe(401)
  })

  it("returns 404 when fund does not exist", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue(null)
    const res = await fundGet(makeReq(), { params: params() })
    expect(res.status).toBe(404)
  })

  it("returns the fund with rules included", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const fund = { id: "fund-1", name: "Emergency Fund", rules: [] }
    vi.mocked(prisma.fund.findFirst).mockResolvedValue(fund as any)
    const res = await fundGet(makeReq(), { params: params() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe("Emergency Fund")
  })
})

describe("PUT /api/finance/funds/[id]", () => {
  it("returns 404 when fund does not belong to org", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue(null)
    const res = await fundPut(makeReq("http://localhost/x", "PUT", { name: "New" }), { params: params() })
    expect(res.status).toBe(404)
  })

  it("updates fund name", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue({ id: "fund-1" } as any)
    vi.mocked(prisma.fund.update).mockResolvedValue({ id: "fund-1", name: "Renamed" } as any)
    const res = await fundPut(makeReq("http://localhost/x", "PUT", { name: "Renamed" }), { params: params() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe("Renamed")
  })
})

describe("DELETE /api/finance/funds/[id]", () => {
  it("returns 404 for nonexistent fund", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue(null)
    const res = await fundDelete(makeReq("http://localhost/x", "DELETE"), { params: params() })
    expect(res.status).toBe(404)
  })

  it("deletes the fund", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue({ id: "fund-1" } as any)
    vi.mocked(prisma.fund.delete).mockResolvedValue({} as any)
    const res = await fundDelete(makeReq("http://localhost/x", "DELETE"), { params: params() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.success).toBe(true)
  })
})

/* ================================================================== */
/*  funds/[id]/rules — GET / POST                                     */
/* ================================================================== */
import { GET as rulesGet, POST as rulesPost } from "@/app/api/finance/funds/[id]/rules/route"

describe("GET /api/finance/funds/[id]/rules", () => {
  it("returns rules for the fund", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const rules = [{ id: "r1", name: "Auto-allocate" }]
    vi.mocked(prisma.fundRule.findMany).mockResolvedValue(rules as any)
    const res = await rulesGet(makeReq(), { params: params() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

describe("POST /api/finance/funds/[id]/rules", () => {
  it("returns 400 when validation fails (missing name)", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await rulesPost(makeReq("http://localhost/x", "POST", { triggerType: "invoice_paid" }), { params: params() })
    expect(res.status).toBe(400)
  })

  it("creates a new fund rule", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const rule = { id: "r2", name: "Tax reserve", triggerType: "invoice_paid", percentage: 10 }
    vi.mocked(prisma.fundRule.create).mockResolvedValue(rule as any)
    const res = await rulesPost(
      makeReq("http://localhost/x", "POST", { name: "Tax reserve", triggerType: "invoice_paid", percentage: 10 }),
      { params: params() },
    )
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.name).toBe("Tax reserve")
  })
})

/* ================================================================== */
/*  funds/[id]/transactions — GET / POST                               */
/* ================================================================== */
import { GET as txGet, POST as txPost } from "@/app/api/finance/funds/[id]/transactions/route"

describe("GET /api/finance/funds/[id]/transactions", () => {
  it("returns transactions for fund", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fundTransaction.findMany).mockResolvedValue([{ id: "tx-1", type: "deposit", amount: 100 }] as any)
    const res = await txGet(makeReq(), { params: params() })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

describe("POST /api/finance/funds/[id]/transactions", () => {
  it("returns 400 for withdrawal exceeding balance", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findFirst).mockResolvedValue({ id: "fund-1", currentBalance: 50, currency: "AZN" } as any)
    const res = await txPost(
      makeReq("http://localhost/x", "POST", { type: "withdrawal", amount: 100 }),
      { params: params() },
    )
    expect(res.status).toBe(400)
  })

  it("creates a deposit transaction and updates balance", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.fund.findMany).mockResolvedValue([{ currentBalance: 200 }] as any)
    vi.mocked(prisma.cashFlowEntry.findMany).mockResolvedValue([])
    vi.mocked(prisma.fundTransaction.create).mockResolvedValue({ id: "tx-2", type: "deposit", amount: 500 } as any)
    vi.mocked(prisma.fund.update).mockResolvedValue({} as any)

    const res = await txPost(
      makeReq("http://localhost/x", "POST", { type: "deposit", amount: 500 }),
      { params: params() },
    )
    expect(res.status).toBe(201)
    expect(prisma.fund.update).toHaveBeenCalled()
  })
})

/* ================================================================== */
/*  payables/[id] — GET / PUT / DELETE                                 */
/* ================================================================== */
import { GET as billGet, PUT as billPut, DELETE as billDelete } from "@/app/api/finance/payables/[id]/route"

describe("GET /api/finance/payables/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await billGet(makeReq(), { params: params("bill-1") })
    expect(res.status).toBe(401)
  })

  it("returns 404 for nonexistent bill", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bill.findFirst).mockResolvedValue(null)
    const res = await billGet(makeReq(), { params: params("bill-1") })
    expect(res.status).toBe(404)
  })

  it("returns the bill with payments and vendor", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const bill = { id: "bill-1", vendorName: "AWS", payments: [], vendor: { id: "v1", name: "AWS" } }
    vi.mocked(prisma.bill.findFirst).mockResolvedValue(bill as any)
    const res = await billGet(makeReq(), { params: params("bill-1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.vendorName).toBe("AWS")
  })
})

describe("PUT /api/finance/payables/[id]", () => {
  it("returns 404 when bill not found", async () => {
    vi.mocked(prisma.bill.findFirst).mockResolvedValue(null)
    const res = await billPut(makeReq("http://localhost/x", "PUT", { vendorName: "GCP" }), { params: params("bill-1") })
    expect(res.status).toBe(404)
  })

  it("updates bill fields", async () => {
    vi.mocked(prisma.bill.findFirst).mockResolvedValue({ id: "bill-1" } as any)
    vi.mocked(prisma.bill.update).mockResolvedValue({ id: "bill-1", vendorName: "GCP" } as any)
    const res = await billPut(makeReq("http://localhost/x", "PUT", { vendorName: "GCP" }), { params: params("bill-1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.vendorName).toBe("GCP")
  })
})

describe("DELETE /api/finance/payables/[id]", () => {
  it("returns 404 for nonexistent bill", async () => {
    vi.mocked(prisma.bill.findFirst).mockResolvedValue(null)
    const res = await billDelete(makeReq("http://localhost/x", "DELETE"), { params: params("bill-1") })
    expect(res.status).toBe(404)
  })

  it("deletes the bill", async () => {
    vi.mocked(prisma.bill.findFirst).mockResolvedValue({ id: "bill-1" } as any)
    vi.mocked(prisma.bill.delete).mockResolvedValue({} as any)
    const res = await billDelete(makeReq("http://localhost/x", "DELETE"), { params: params("bill-1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.success).toBe(true)
  })
})

/* ================================================================== */
/*  payables/[id]/payments — GET / POST                                */
/* ================================================================== */
import { GET as paymentsGet, POST as paymentsPost } from "@/app/api/finance/payables/[id]/payments/route"

describe("GET /api/finance/payables/[id]/payments", () => {
  it("returns payments for a bill", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.billPayment.findMany).mockResolvedValue([{ id: "bp-1", amount: 200 }] as any)
    const res = await paymentsGet(makeReq(), { params: params("bill-1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

describe("POST /api/finance/payables/[id]/payments", () => {
  it("returns 400 for missing amount", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const res = await paymentsPost(makeReq("http://localhost/x", "POST", {}), { params: params("bill-1") })
    expect(res.status).toBe(400)
  })

  it("creates a payment and updates bill totals", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.billPayment.create).mockResolvedValue({ id: "bp-2", amount: 300 } as any)
    vi.mocked(prisma.bill.findUnique).mockResolvedValue({
      id: "bill-1", billNumber: "AP-001", vendorName: "AWS", vendorId: null,
      totalAmount: 1000, paidAmount: 200, balanceDue: 800, status: "pending", category: "cloud",
    } as any)
    vi.mocked(prisma.bill.update).mockResolvedValue({} as any)
    vi.mocked(prisma.paymentRegistryEntry.create).mockResolvedValue({} as any)

    const res = await paymentsPost(
      makeReq("http://localhost/x", "POST", { amount: 300 }),
      { params: params("bill-1") },
    )
    expect(res.status).toBe(201)
    expect(prisma.bill.update).toHaveBeenCalled()
    expect(prisma.paymentRegistryEntry.create).toHaveBeenCalled()
  })
})

/* ================================================================== */
/*  payables/stats                                                     */
/* ================================================================== */
import { GET as payablesStatsGet } from "@/app/api/finance/payables/stats/route"

describe("GET /api/finance/payables/stats", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await payablesStatsGet(makeReq("http://localhost/api/finance/payables/stats"))
    expect(res.status).toBe(401)
  })

  it("returns aging buckets and totals", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.bill.findMany).mockResolvedValue([
      { id: "b1", vendorName: "V1", vendorId: null, balanceDue: 500, dueDate: new Date(Date.now() - 10 * 86400000), status: "overdue" },
    ] as any)

    const res = await payablesStatsGet(makeReq("http://localhost/api/finance/payables/stats"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty("total")
    expect(json.data).toHaveProperty("aging")
    expect(json.data).toHaveProperty("topVendors")
    expect(json.data.aging).toHaveLength(4)
  })
})

/* ================================================================== */
/*  registry                                                           */
/* ================================================================== */
import { GET as registryGet } from "@/app/api/finance/registry/route"

describe("GET /api/finance/registry", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await registryGet(makeReq("http://localhost/api/finance/registry"))
    expect(res.status).toBe(401)
  })

  it("returns entries with stats and pagination", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const entries = [{ id: "re-1", direction: "outgoing", amount: 100 }]
    vi.mocked(prisma.paymentRegistryEntry.findMany).mockResolvedValue(entries as any)
    vi.mocked(prisma.paymentRegistryEntry.count).mockResolvedValue(1 as any)
    vi.mocked(prisma.paymentRegistryEntry.aggregate)
      .mockResolvedValueOnce({ _sum: { amount: 5000 } } as any)   // incoming
      .mockResolvedValueOnce({ _sum: { amount: 3000 } } as any)   // outgoing
    vi.mocked(prisma.paymentOrder.count).mockResolvedValue(2 as any)

    const res = await registryGet(makeReq("http://localhost/api/finance/registry?direction=outgoing"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.stats.totalIncoming).toBe(5000)
    expect(json.stats.totalOutgoing).toBe(3000)
    expect(json.stats.netFlow).toBe(2000)
    expect(json.stats.pendingOrdersCount).toBe(2)
    expect(json.total).toBe(1)
    expect(json.page).toBe(1)
  })
})
