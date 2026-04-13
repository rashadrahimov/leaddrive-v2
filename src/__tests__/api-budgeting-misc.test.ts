import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/* ────────────────── Mocks ────────────────── */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetPlan: { findFirst: vi.fn(), findMany: vi.fn() },
    budgetLine: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    budgetActual: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    budgetChangeLog: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    budgetCostType: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    budgetDirectionTemplate: { findMany: vi.fn() },
    budgetDepartment: { findMany: vi.fn() },
    budgetDepartmentOwner: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    budgetForecastEntry: { upsert: vi.fn() },
    rollingForecastMonth: { findMany: vi.fn() },
    salesForecast: { findMany: vi.fn(), upsert: vi.fn() },
    expenseForecast: { findMany: vi.fn() },
    accountingIntegration: { findMany: vi.fn(), findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), update: vi.fn() },
    accountingImport: { findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
    cashFlowEntry: { findMany: vi.fn() },
    costModelSnapshot: { upsert: vi.fn() },
    user: { findMany: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  logBudgetChange: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
  isAuthError: vi.fn(),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn().mockResolvedValue({
    serviceDetails: {},
    serviceRevenues: { IT: 5000 },
    grandTotalG: 10000,
    summary: { totalCost: 10000, totalRevenue: 5000, margin: -5000, marginPct: -100 },
  }),
}))

vi.mock("@/lib/budgeting/cost-model-map", () => ({
  resolveCostModelKey: vi.fn().mockReturnValue(1000),
  resolvePatternForDept: vi.fn().mockReturnValue("resolved-key"),
  computePlannedForLine: vi.fn().mockReturnValue(0),
  getPeriodMonths: vi.fn().mockReturnValue({ count: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
}))

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "AI narrative response" }],
      }),
    },
  })),
}))

import { POST as postNarrative } from "@/app/api/budgeting/ai-narrative/route"
import { GET as getCategoryMapping, POST as postCategoryMapping } from "@/app/api/budgeting/category-mapping/route"
import { GET as getChangelog, POST as postChangelog } from "@/app/api/budgeting/changelog/route"
import { GET as getCostTypes, POST as postCostType, PUT as putCostType, DELETE as deleteCostType } from "@/app/api/budgeting/cost-types/route"
import { GET as getCsvTemplate } from "@/app/api/budgeting/csv-template/route"
import { GET as getDeptOwners, POST as postDeptOwner, DELETE as deleteDeptOwner } from "@/app/api/budgeting/department-owners/route"
import { POST as importCsv, GET as getImports } from "@/app/api/budgeting/import-csv/route"
import { GET as getIntegrations, POST as postIntegration, DELETE as deleteIntegration } from "@/app/api/budgeting/integrations/route"
import { POST as matrixSeed } from "@/app/api/budgeting/matrix-seed/route"
import { POST as resolveCosts } from "@/app/api/budgeting/resolve-costs/route"
import { POST as autoForecast } from "@/app/api/budgeting/rolling/auto-forecast/route"
import { GET as getSnapshot } from "@/app/api/budgeting/snapshot/route"
import { POST as snapshotActuals } from "@/app/api/budgeting/snapshot-actuals/route"
import { POST as syncActuals } from "@/app/api/budgeting/sync-actuals/route"
import { GET as getCashFlowOdds } from "@/app/api/budgeting/cash-flow/odds/route"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const ORG = "org-test-123"
const USER = "user-1"
const SESSION = { orgId: ORG, userId: USER, role: "admin", name: "Admin" }

function makeReq(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init)
}

function jsonReq(url: string, body: unknown, method = "POST"): NextRequest {
  return makeReq(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

beforeEach(() => { vi.clearAllMocks() })

/* ═══════════════ POST /api/budgeting/ai-narrative ═══════════════ */

describe("POST /api/budgeting/ai-narrative", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await postNarrative(jsonReq("http://localhost:3000/api/budgeting/ai-narrative", { planId: "p1" }))
    expect(res.status).toBe(401)
  })

  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([])
    const res = await postNarrative(jsonReq("http://localhost:3000/api/budgeting/ai-narrative", { planId: "p1" }))
    expect(res.status).toBe(404)
  })
})

/* ═══════════════ GET /api/budgeting/category-mapping ═══════════════ */

describe("GET /api/budgeting/category-mapping", () => {
  it("returns 400 when integrationId missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getCategoryMapping(makeReq("http://localhost:3000/api/budgeting/category-mapping"))
    expect(res.status).toBe(400)
  })

  it("returns 404 when integration not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.accountingIntegration.findFirst).mockResolvedValue(null)
    const res = await getCategoryMapping(makeReq("http://localhost:3000/api/budgeting/category-mapping?integrationId=x"))
    expect(res.status).toBe(404)
  })
})

/* ═══════════════ POST /api/budgeting/category-mapping ═══════════════ */

describe("POST /api/budgeting/category-mapping", () => {
  it("updates category mapping", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.accountingIntegration.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await postCategoryMapping(jsonReq("http://localhost:3000/api/budgeting/category-mapping", {
      integrationId: "int1",
      mapping: { "Office Supplies": "admin" },
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ GET /api/budgeting/changelog ═══════════════ */

describe("GET /api/budgeting/changelog", () => {
  it("returns 400 when planId missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getChangelog(makeReq("http://localhost:3000/api/budgeting/changelog"))
    expect(res.status).toBe(400)
  })

  it("returns changelog items", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetChangeLog.findMany).mockResolvedValue([
      { id: "ch1", action: "update", entityType: "line", entityId: "l1", field: "plannedAmount", oldValue: 100, newValue: 200, userId: USER, snapshot: { category: "Salary" }, createdAt: new Date() },
    ] as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ id: USER, name: "Admin" }] as any)
    const res = await getChangelog(makeReq("http://localhost:3000/api/budgeting/changelog?planId=p1"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.items).toHaveLength(1)
  })
})

/* ═══════════════ POST /api/budgeting/changelog (undo) ═══════════════ */

describe("POST /api/budgeting/changelog (undo)", () => {
  it("returns 404 when change not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetChangeLog.findFirst).mockResolvedValue(null)
    const res = await postChangelog(jsonReq("http://localhost:3000/api/budgeting/changelog", { changeId: "ch1" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 for non-update changes", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetChangeLog.findFirst).mockResolvedValue({ id: "ch1", action: "delete", entityType: "line", field: null, oldValue: null } as any)
    const res = await postChangelog(jsonReq("http://localhost:3000/api/budgeting/changelog", { changeId: "ch1" }))
    expect(res.status).toBe(400)
  })
})

/* ═══════════════ GET/POST/PUT/DELETE /api/budgeting/cost-types ═══════════════ */

describe("GET /api/budgeting/cost-types", () => {
  it("returns cost types list", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetCostType.findMany).mockResolvedValue([{ id: "ct1", key: "labor", label: "Labor" }] as any)
    const res = await getCostTypes(makeReq("http://localhost:3000/api/budgeting/cost-types"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
  })
})

describe("POST /api/budgeting/cost-types", () => {
  it("returns 409 when key already exists", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetCostType.findUnique).mockResolvedValue({ id: "ct1" } as any)
    const res = await postCostType(jsonReq("http://localhost:3000/api/budgeting/cost-types", { key: "labor", label: "Labor" }))
    expect(res.status).toBe(409)
  })

  it("creates cost type successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetCostType.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.budgetCostType.create).mockResolvedValue({ id: "ct1", key: "labor", label: "Labor" } as any)
    const res = await postCostType(jsonReq("http://localhost:3000/api/budgeting/cost-types", { key: "labor", label: "Labor" }))
    expect(res.status).toBe(201)
  })
})

/* ═══════════════ GET /api/budgeting/csv-template ═══════════════ */

describe("GET /api/budgeting/csv-template", () => {
  it("returns 400 when planId missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getCsvTemplate(makeReq("http://localhost:3000/api/budgeting/csv-template"))
    expect(res.status).toBe(400)
  })

  it("returns CSV file", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ name: "Q1 2026" } as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { category: "Salary", department: "IT", lineType: "expense", plannedAmount: 1000 },
    ] as any)
    const res = await getCsvTemplate(makeReq("http://localhost:3000/api/budgeting/csv-template?planId=p1"))
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    const text = await res.text()
    expect(text).toContain("category,department")
    expect(text).toContain("Salary")
  })
})

/* ═══════════════ GET/POST/DELETE /api/budgeting/department-owners ═══════════════ */

describe("GET /api/budgeting/department-owners", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await getDeptOwners(makeReq("http://localhost:3000/api/budgeting/department-owners"))
    expect(res.status).toBe(401)
  })

  it("returns owners list", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.budgetDepartmentOwner.findMany).mockResolvedValue([{ id: "do1" }] as any)
    const res = await getDeptOwners(makeReq("http://localhost:3000/api/budgeting/department-owners"))
    expect(res.status).toBe(200)
  })
})

describe("POST /api/budgeting/department-owners", () => {
  it("returns 403 for non-admin", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...SESSION, role: "member" } as any)
    const res = await postDeptOwner(jsonReq("http://localhost:3000/api/budgeting/department-owners", { departmentId: "d1", userId: "u1" }))
    expect(res.status).toBe(403)
  })
})

/* ═══════════════ POST /api/budgeting/import-csv ═══════════════ */

describe("POST /api/budgeting/import-csv", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await importCsv(jsonReq("http://localhost:3000/api/budgeting/import-csv", { planId: "p1", rows: [{ category: "x", amount: 100 }] }))
    expect(res.status).toBe(401)
  })

  it("imports rows and returns counts", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.accountingImport.create).mockResolvedValue({ id: "imp1" } as any)
    vi.mocked(prisma.accountingImport.update).mockResolvedValue({} as any)
    vi.mocked(prisma.budgetActual.create).mockResolvedValue({} as any)
    const res = await importCsv(jsonReq("http://localhost:3000/api/budgeting/import-csv", {
      planId: "p1",
      rows: [{ category: "Salary", amount: 5000, lineType: "expense" }],
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.matchedRows).toBe(1)
  })
})

/* ═══════════════ GET/POST/DELETE /api/budgeting/integrations ═══════════════ */

describe("GET /api/budgeting/integrations", () => {
  it("returns integrations list", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.accountingIntegration.findMany).mockResolvedValue([{ id: "int1", provider: "quickbooks" }] as any)
    const res = await getIntegrations(makeReq("http://localhost:3000/api/budgeting/integrations"))
    expect(res.status).toBe(200)
  })
})

describe("POST /api/budgeting/integrations", () => {
  it("creates integration and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.accountingIntegration.create).mockResolvedValue({ id: "int1", provider: "xero", name: "Xero" } as any)
    const res = await postIntegration(jsonReq("http://localhost:3000/api/budgeting/integrations", { provider: "xero", name: "Xero" }))
    expect(res.status).toBe(201)
  })
})

/* ═══════════════ POST /api/budgeting/matrix-seed ═══════════════ */

describe("POST /api/budgeting/matrix-seed", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await matrixSeed(jsonReq("http://localhost:3000/api/budgeting/matrix-seed", { planId: "p1" }))
    expect(res.status).toBe(404)
  })

  it("returns 400 when no cost types", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.budgetCostType.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetDepartment.findMany).mockResolvedValue([])
    const res = await matrixSeed(jsonReq("http://localhost:3000/api/budgeting/matrix-seed", { planId: "p1" }))
    expect(res.status).toBe(400)
  })
})

/* ═══════════════ POST /api/budgeting/resolve-costs ═══════════════ */

describe("POST /api/budgeting/resolve-costs", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await resolveCosts(jsonReq("http://localhost:3000/api/budgeting/resolve-costs", { keys: ["coreLabor"] }))
    expect(res.status).toBe(401)
  })

  it("resolves cost model keys", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await resolveCosts(jsonReq("http://localhost:3000/api/budgeting/resolve-costs", { keys: ["coreLabor"] }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveProperty("coreLabor")
  })
})

/* ═══════════════ POST /api/budgeting/rolling/auto-forecast ═══════════════ */

describe("POST /api/budgeting/rolling/auto-forecast", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await autoForecast(jsonReq("http://localhost:3000/api/budgeting/rolling/auto-forecast", { planId: "p1" }))
    expect(res.status).toBe(404)
  })

  it("generates forecast entries", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([])
    vi.mocked(prisma.rollingForecastMonth.findMany).mockResolvedValue([])
    const res = await autoForecast(jsonReq("http://localhost:3000/api/budgeting/rolling/auto-forecast", { planId: "p1" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.categoriesProcessed).toBe(0)
  })
})

/* ═══════════════ GET /api/budgeting/snapshot ═══════════════ */

describe("GET /api/budgeting/snapshot", () => {
  it("returns 400 when planId missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getSnapshot(makeReq("http://localhost:3000/api/budgeting/snapshot"))
    expect(res.status).toBe(400)
  })

  it("returns 400 when at missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getSnapshot(makeReq("http://localhost:3000/api/budgeting/snapshot?planId=p1"))
    expect(res.status).toBe(400)
  })

  it("reconstructs snapshot at given time", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([
      { id: "l1", category: "Salary", lineType: "expense", plannedAmount: 1000, forecastAmount: null },
    ] as any)
    vi.mocked(prisma.budgetActual.findMany).mockResolvedValue([])
    const res = await getSnapshot(makeReq("http://localhost:3000/api/budgeting/snapshot?planId=p1&at=2026-01-01T00:00:00Z"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.lines).toHaveLength(1)
  })
})

/* ═══════════════ POST /api/budgeting/snapshot-actuals ═══════════════ */

describe("POST /api/budgeting/snapshot-actuals", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await snapshotActuals(jsonReq("http://localhost:3000/api/budgeting/snapshot-actuals", {}))
    expect(res.status).toBe(401)
  })
})

/* ═══════════════ POST /api/budgeting/sync-actuals ═══════════════ */

describe("POST /api/budgeting/sync-actuals", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    const res = await syncActuals(jsonReq("http://localhost:3000/api/budgeting/sync-actuals", { planId: "p1" }))
    expect(res.status).toBe(404)
  })

  it("syncs zero lines when no auto-actual lines", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    const res = await syncActuals(jsonReq("http://localhost:3000/api/budgeting/sync-actuals", { planId: "p1" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.synced).toBe(0)
  })
})

/* ═══════════════ GET /api/budgeting/cash-flow/odds ═══════════════ */

describe("GET /api/budgeting/cash-flow/odds", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await getCashFlowOdds(makeReq("http://localhost:3000/api/budgeting/cash-flow/odds"))
    expect(res.status).toBe(401)
  })

  it("returns cash flow statement with sections", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.cashFlowEntry.findMany).mockResolvedValue([])
    const res = await getCashFlowOdds(makeReq("http://localhost:3000/api/budgeting/cash-flow/odds?year=2026"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.sections).toHaveLength(3)
    expect(json.data.sections.map((s: any) => s.activity)).toEqual(["operating", "investing", "financing"])
    expect(json.data.grandInflow).toBe(0)
    expect(json.data.grandOutflow).toBe(0)
  })
})
