import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

/* ────────────────── Mocks ────────────────── */

vi.mock("@/lib/prisma", () => ({
  prisma: {
    budgetPlan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetLine: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetActual: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    budgetDirectionTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    budgetApprovalComment: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    budgetDepartmentOwner: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    salesForecast: { findMany: vi.fn() },
    expenseForecast: { findMany: vi.fn() },
  },
  logBudgetChange: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
  getSession: vi.fn(),
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn(),
}))

vi.mock("@/lib/cost-model/db", () => ({
  loadAndCompute: vi.fn().mockResolvedValue({ serviceDetails: {} }),
}))

vi.mock("@/lib/budgeting/cost-model-map", () => ({
  computePlannedForLine: vi.fn().mockReturnValue(0),
  getPeriodMonths: vi.fn().mockReturnValue({ count: 12, months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }),
}))

import { GET as getPlan, PUT as putPlan, DELETE as deletePlan } from "@/app/api/budgeting/plans/[id]/route"
import { GET as getComments, POST as postComment } from "@/app/api/budgeting/plans/[id]/comments/route"
import { POST as createVersion } from "@/app/api/budgeting/plans/[id]/create-version/route"
import { GET as getVersions } from "@/app/api/budgeting/plans/[id]/versions/route"
import { GET as getDiff } from "@/app/api/budgeting/plans/[id]/diff/route"
import { POST as applyTemplates } from "@/app/api/budgeting/plans/[id]/apply-templates/route"
import { PUT as putLine, DELETE as deleteLine } from "@/app/api/budgeting/lines/[id]/route"
import { PUT as putActual, DELETE as deleteActual } from "@/app/api/budgeting/actuals/[id]/route"
import { PUT as putTemplate, DELETE as deleteTemplate } from "@/app/api/budgeting/templates/[id]/route"
import { POST as seedTemplates } from "@/app/api/budgeting/templates/seed/route"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const ORG = "org-test-123"
const USER = "user-1"
const SESSION = { orgId: ORG, userId: USER, role: "admin", name: "Test Admin" }

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

const params = (id: string) => Promise.resolve({ id })

beforeEach(() => { vi.clearAllMocks() })

/* ═══════════════ GET /api/budgeting/plans/[id] ═══════════════ */

describe("GET /api/budgeting/plans/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await getPlan(makeReq("http://localhost:3000/api/budgeting/plans/p1"), { params: params("p1") })
    expect(res.status).toBe(401)
  })

  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await getPlan(makeReq("http://localhost:3000/api/budgeting/plans/p1"), { params: params("p1") })
    expect(res.status).toBe(404)
  })

  it("returns plan with lines and actuals", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const plan = { id: "p1", name: "Q1", lines: [], actuals: [] }
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(plan as any)
    const res = await getPlan(makeReq("http://localhost:3000/api/budgeting/plans/p1"), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.id).toBe("p1")
  })
})

/* ═══════════════ PUT /api/budgeting/plans/[id] ═══════════════ */

describe("PUT /api/budgeting/plans/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await putPlan(jsonReq("http://localhost:3000/api/budgeting/plans/p1", { name: "x" }, "PUT"), { params: params("p1") })
    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid JSON", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const req = makeReq("http://localhost:3000/api/budgeting/plans/p1", { method: "PUT", body: "not-json" })
    const res = await putPlan(req, { params: params("p1") })
    expect(res.status).toBe(400)
  })

  it("returns 403 when non-admin tries to approve", async () => {
    vi.mocked(getSession).mockResolvedValue({ ...SESSION, role: "member" } as any)
    vi.mocked(prisma.budgetDepartmentOwner.findMany).mockResolvedValue([])
    const res = await putPlan(jsonReq("http://localhost:3000/api/budgeting/plans/p1", { status: "approved" }, "PUT"), { params: params("p1") })
    expect(res.status).toBe(403)
  })

  it("updates plan name successfully", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.budgetPlan.updateMany).mockResolvedValue({ count: 1 } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", name: "Updated" } as any)
    vi.mocked(prisma.user.findMany).mockResolvedValue([])
    const res = await putPlan(jsonReq("http://localhost:3000/api/budgeting/plans/p1", { name: "Updated" }, "PUT"), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ DELETE /api/budgeting/plans/[id] ═══════════════ */

describe("DELETE /api/budgeting/plans/[id]", () => {
  it("deletes plan and returns success", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await deletePlan(makeReq("http://localhost:3000/api/budgeting/plans/p1", { method: "DELETE" }), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ GET /api/budgeting/plans/[id]/comments ═══════════════ */

describe("GET /api/budgeting/plans/[id]/comments", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    const res = await getComments(makeReq("http://localhost:3000/api/budgeting/plans/p1/comments"), { params: params("p1") })
    expect(res.status).toBe(401)
  })

  it("returns comments list", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const comments = [{ id: "c1", comment: "Looks good" }]
    vi.mocked(prisma.budgetApprovalComment.findMany).mockResolvedValue(comments as any)
    const res = await getComments(makeReq("http://localhost:3000/api/budgeting/plans/p1/comments"), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
  })
})

/* ═══════════════ POST /api/budgeting/plans/[id]/comments ═══════════════ */

describe("POST /api/budgeting/plans/[id]/comments", () => {
  it("returns 404 when plan does not exist", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await postComment(jsonReq("http://localhost:3000/api/budgeting/plans/p1/comments", { comment: "hello" }), { params: params("p1") })
    expect(res.status).toBe(404)
  })

  it("creates a comment and returns 201", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1" } as any)
    const created = { id: "c1", comment: "Nice", status: "comment" }
    vi.mocked(prisma.budgetApprovalComment.create).mockResolvedValue(created as any)
    const res = await postComment(jsonReq("http://localhost:3000/api/budgeting/plans/p1/comments", { comment: "Nice" }), { params: params("p1") })
    expect(res.status).toBe(201)
  })
})

/* ═══════════════ POST /api/budgeting/plans/[id]/create-version ═══════════════ */

describe("POST /api/budgeting/plans/[id]/create-version", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await createVersion(jsonReq("http://localhost:3000/api/budgeting/plans/p1/create-version", {}), { params: params("p1") })
    expect(res.status).toBe(404)
  })

  it("creates a new version with incremented version number", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const plan = { id: "p1", name: "Q1", version: 1, periodType: "annual", year: 2026, lines: [] }
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(plan as any)
    vi.mocked(prisma.budgetPlan.update).mockResolvedValue(plan as any)
    const newPlan = { id: "p2", name: "Q1", version: 2, versionLabel: "v2", status: "draft" }
    vi.mocked(prisma.budgetPlan.create).mockResolvedValue(newPlan as any)
    const res = await createVersion(jsonReq("http://localhost:3000/api/budgeting/plans/p1/create-version", {}), { params: params("p1") })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.data.version).toBe(2)
  })
})

/* ═══════════════ GET /api/budgeting/plans/[id]/versions ═══════════════ */

describe("GET /api/budgeting/plans/[id]/versions", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await getVersions(makeReq("http://localhost:3000/api/budgeting/plans/p1/versions"), { params: params("p1") })
    expect(res.status).toBe(404)
  })

  it("returns version chain", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1", amendmentOf: null } as any)
    const versions = [{ id: "p1", version: 1 }, { id: "p2", version: 2, amendmentOf: "p1" }]
    vi.mocked(prisma.budgetPlan.findMany).mockResolvedValue(versions as any)
    const res = await getVersions(makeReq("http://localhost:3000/api/budgeting/plans/p1/versions"), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(2)
  })
})

/* ═══════════════ GET /api/budgeting/plans/[id]/diff ═══════════════ */

describe("GET /api/budgeting/plans/[id]/diff", () => {
  it("returns 400 when compareWith is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const res = await getDiff(makeReq("http://localhost:3000/api/budgeting/plans/p1/diff"), { params: params("p1") })
    expect(res.status).toBe(400)
  })

  it("returns diff between two plans", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const linesA = [{ category: "Salary", department: "IT", lineType: "expense", plannedAmount: 1000 }]
    const linesB = [{ category: "Salary", department: "IT", lineType: "expense", plannedAmount: 1200 }]
    vi.mocked(prisma.budgetLine.findMany)
      .mockResolvedValueOnce(linesA as any)
      .mockResolvedValueOnce(linesB as any)
    const res = await getDiff(makeReq("http://localhost:3000/api/budgeting/plans/p1/diff?compareWith=p2"), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.totalChanges).toBe(1)
    expect(json.diff[0].status).toBe("changed")
    expect(json.diff[0].delta).toBe(200)
  })
})

/* ═══════════════ POST /api/budgeting/plans/[id]/apply-templates ═══════════════ */

describe("POST /api/budgeting/plans/[id]/apply-templates", () => {
  it("returns 404 when plan not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue(null)
    const res = await applyTemplates(jsonReq("http://localhost:3000/api/budgeting/plans/p1/apply-templates", { templateIds: ["t1"] }), { params: params("p1") })
    expect(res.status).toBe(404)
  })

  it("applies templates and returns created/skipped counts", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ id: "p1" } as any)
    vi.mocked(prisma.budgetDirectionTemplate.findMany).mockResolvedValue([
      { id: "t1", name: "Salary", lineType: "expense", department: null, lineSubtype: null, defaultAmount: 5000, unitPrice: null, unitCost: null, quantity: null, costModelKey: null },
    ] as any)
    vi.mocked(prisma.budgetLine.findMany).mockResolvedValue([])
    vi.mocked(prisma.budgetLine.create).mockResolvedValue({} as any)
    const res = await applyTemplates(jsonReq("http://localhost:3000/api/budgeting/plans/p1/apply-templates", { templateIds: ["t1"] }), { params: params("p1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.created).toBe(1)
    expect(json.data.skipped).toBe(0)
  })
})

/* ═══════════════ PUT /api/budgeting/lines/[id] ═══════════════ */

describe("PUT /api/budgeting/lines/[id]", () => {
  it("returns 403 when plan is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetLine.findFirst).mockResolvedValue({ id: "l1", planId: "p1" } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "approved" } as any)
    const res = await putLine(jsonReq("http://localhost:3000/api/budgeting/lines/l1", { plannedAmount: 100 }, "PUT"), { params: params("l1") })
    expect(res.status).toBe(403)
  })

  it("updates line successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetLine.findFirst)
      .mockResolvedValueOnce({ id: "l1", planId: "p1", plannedAmount: 50 } as any)
      .mockResolvedValueOnce({ id: "l1", planId: "p1", plannedAmount: 100 } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "draft" } as any)
    vi.mocked(prisma.budgetLine.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await putLine(jsonReq("http://localhost:3000/api/budgeting/lines/l1", { plannedAmount: 100 }, "PUT"), { params: params("l1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ DELETE /api/budgeting/lines/[id] ═══════════════ */

describe("DELETE /api/budgeting/lines/[id]", () => {
  it("returns 403 when plan is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetLine.findFirst).mockResolvedValue({ id: "l1", planId: "p1" } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "approved" } as any)
    const res = await deleteLine(makeReq("http://localhost:3000/api/budgeting/lines/l1", { method: "DELETE" }), { params: params("l1") })
    expect(res.status).toBe(403)
  })

  it("deletes line from draft plan", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetLine.findFirst).mockResolvedValue({ id: "l1", planId: "p1" } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "draft" } as any)
    vi.mocked(prisma.budgetLine.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await deleteLine(makeReq("http://localhost:3000/api/budgeting/lines/l1", { method: "DELETE" }), { params: params("l1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ PUT /api/budgeting/actuals/[id] ═══════════════ */

describe("PUT /api/budgeting/actuals/[id]", () => {
  it("returns 404 when actual not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetActual.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.budgetActual.updateMany).mockResolvedValue({ count: 0 } as any)
    const res = await putActual(jsonReq("http://localhost:3000/api/budgeting/actuals/a1", { actualAmount: 200 }, "PUT"), { params: params("a1") })
    expect(res.status).toBe(404)
  })

  it("updates actual successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetActual.findFirst)
      .mockResolvedValueOnce({ id: "a1", planId: "p1", actualAmount: 100 } as any)
      .mockResolvedValueOnce({ id: "a1", planId: "p1", actualAmount: 200 } as any)
    vi.mocked(prisma.budgetActual.updateMany).mockResolvedValue({ count: 1 } as any)
    const res = await putActual(jsonReq("http://localhost:3000/api/budgeting/actuals/a1", { actualAmount: 200 }, "PUT"), { params: params("a1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ DELETE /api/budgeting/actuals/[id] ═══════════════ */

describe("DELETE /api/budgeting/actuals/[id]", () => {
  it("returns 403 when plan is approved", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetActual.findFirst).mockResolvedValue({ id: "a1", planId: "p1" } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "approved" } as any)
    const res = await deleteActual(makeReq("http://localhost:3000/api/budgeting/actuals/a1", { method: "DELETE" }), { params: params("a1") })
    expect(res.status).toBe(403)
  })

  it("deletes actual from draft plan", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetActual.findFirst).mockResolvedValue({ id: "a1", planId: "p1" } as any)
    vi.mocked(prisma.budgetPlan.findFirst).mockResolvedValue({ status: "draft" } as any)
    vi.mocked(prisma.budgetActual.deleteMany).mockResolvedValue({ count: 1 } as any)
    const res = await deleteActual(makeReq("http://localhost:3000/api/budgeting/actuals/a1", { method: "DELETE" }), { params: params("a1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

/* ═══════════════ PUT /api/budgeting/templates/[id] ═══════════════ */

describe("PUT /api/budgeting/templates/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await putTemplate(jsonReq("http://localhost:3000/api/budgeting/templates/t1", { name: "x" }, "PUT"), { params: params("t1") })
    expect(res.status).toBe(401)
  })

  it("updates template successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    const template = { id: "t1", name: "Updated", lineType: "expense" }
    vi.mocked(prisma.budgetDirectionTemplate.update).mockResolvedValue(template as any)
    const res = await putTemplate(jsonReq("http://localhost:3000/api/budgeting/templates/t1", { name: "Updated" }, "PUT"), { params: params("t1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe("Updated")
  })
})

/* ═══════════════ DELETE /api/budgeting/templates/[id] ═══════════════ */

describe("DELETE /api/budgeting/templates/[id]", () => {
  it("deletes template", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDirectionTemplate.delete).mockResolvedValue({} as any)
    const res = await deleteTemplate(makeReq("http://localhost:3000/api/budgeting/templates/t1", { method: "DELETE" }), { params: params("t1") })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toBeNull()
  })
})

/* ═══════════════ POST /api/budgeting/templates/seed ═══════════════ */

describe("POST /api/budgeting/templates/seed", () => {
  it("returns 401 when unauthenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null as any)
    const res = await seedTemplates(jsonReq("http://localhost:3000/api/budgeting/templates/seed", { pack: "it-saas" }))
    expect(res.status).toBe(401)
  })

  it("seeds templates for a pack", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.budgetDirectionTemplate.count).mockResolvedValue(0)
    vi.mocked(prisma.budgetDirectionTemplate.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.budgetDirectionTemplate.create).mockResolvedValue({} as any)
    const res = await seedTemplates(jsonReq("http://localhost:3000/api/budgeting/templates/seed", { pack: "it-saas" }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.created).toBeGreaterThan(0)
  })
})
