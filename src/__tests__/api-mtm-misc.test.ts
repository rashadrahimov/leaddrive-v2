import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mtmCustomer: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    mtmTask: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    mtmPhoto: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    mtmAlert: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    mtmSetting: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    mtmAgent: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    organization: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/api-auth", () => ({
  getOrgId: vi.fn(),
}))

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-pw"), compare: vi.fn() },
}))

vi.mock("jsonwebtoken", () => ({
  default: { sign: vi.fn().mockReturnValue("mock-jwt-token") },
}))

vi.mock("fs/promises", () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

import { GET as ListCustomers, POST as CreateCustomer } from "@/app/api/v1/mtm/customers/route"
import { GET as GetCustomer, PUT as UpdateCustomer, DELETE as DeleteCustomer } from "@/app/api/v1/mtm/customers/[id]/route"
import { GET as ListTasks, POST as CreateTask } from "@/app/api/v1/mtm/tasks/route"
import { PUT as UpdateTask, DELETE as DeleteTask } from "@/app/api/v1/mtm/tasks/[id]/route"
import { GET as ListPhotos } from "@/app/api/v1/mtm/photos/route"
import { GET as ListAlerts } from "@/app/api/v1/mtm/alerts/route"
import { GET as GetSettings, PUT as UpdateSettings } from "@/app/api/v1/mtm/settings/route"
import { POST as MobileAuth } from "@/app/api/v1/mtm/mobile/auth/route"
import { GET as MobilePing } from "@/app/api/v1/mtm/mobile/ping/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import bcrypt from "bcryptjs"

const ORG = "org-1"

function makeReq(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"))
}

function makeJsonReq(url: string, method: string, body: unknown): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── GET /api/v1/mtm/customers ─────────────────────────────
describe("GET /api/v1/mtm/customers", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await ListCustomers(makeReq("/api/v1/mtm/customers"))
    expect(res.status).toBe(401)
  })

  it("returns paginated customers", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findMany).mockResolvedValue([{ id: "c1", name: "Shop A" }] as any)
    vi.mocked(prisma.mtmCustomer.count).mockResolvedValue(1)

    const res = await ListCustomers(makeReq("/api/v1/mtm/customers"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.customers).toHaveLength(1)
    expect(json.data.total).toBe(1)
  })

  it("filters by search, category, and status", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findMany).mockResolvedValue([])
    vi.mocked(prisma.mtmCustomer.count).mockResolvedValue(0)

    await ListCustomers(makeReq("/api/v1/mtm/customers?search=shop&category=A&status=ACTIVE"))

    const callArgs = vi.mocked(prisma.mtmCustomer.findMany).mock.calls[0][0] as any
    expect(callArgs.where.OR).toBeDefined()
    expect(callArgs.where.category).toBe("A")
    expect(callArgs.where.status).toBe("ACTIVE")
  })
})

// ─── POST /api/v1/mtm/customers ────────────────────────────
describe("POST /api/v1/mtm/customers", () => {
  it("creates customer and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.create).mockResolvedValue({ id: "c-new", name: "New Shop" } as any)

    const body = { name: "New Shop", category: "A", address: "Main St", latitude: "40.1", longitude: "49.8" }
    const res = await CreateCustomer(makeJsonReq("/api/v1/mtm/customers", "POST", body))
    expect(res.status).toBe(201)

    const createArgs = vi.mocked(prisma.mtmCustomer.create).mock.calls[0][0] as any
    expect(createArgs.data.organizationId).toBe(ORG)
    expect(createArgs.data.latitude).toBe(40.1)
    expect(createArgs.data.longitude).toBe(49.8)
  })

  it("returns 400 on create failure", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.create).mockRejectedValue(new Error("Validation error"))

    const res = await CreateCustomer(makeJsonReq("/api/v1/mtm/customers", "POST", { name: "X" }))
    expect(res.status).toBe(400)
  })
})

// ─── GET /api/v1/mtm/customers/[id] ────────────────────────
describe("GET /api/v1/mtm/customers/[id]", () => {
  it("returns 404 when not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue(null)

    const res = await GetCustomer(makeReq("/api/v1/mtm/customers/c1"), makeParams("c1"))
    expect(res.status).toBe(404)
  })

  it("returns customer data", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.findFirst).mockResolvedValue({ id: "c1", name: "Shop A" } as any)

    const res = await GetCustomer(makeReq("/api/v1/mtm/customers/c1"), makeParams("c1"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Shop A")
  })
})

// ─── PUT /api/v1/mtm/customers/[id] ────────────────────────
describe("PUT /api/v1/mtm/customers/[id]", () => {
  it("returns 404 when not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.updateMany).mockResolvedValue({ count: 0 })

    const res = await UpdateCustomer(
      makeJsonReq("/api/v1/mtm/customers/c1", "PUT", { name: "Updated" }),
      makeParams("c1")
    )
    expect(res.status).toBe(404)
  })

  it("updates customer successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.updateMany).mockResolvedValue({ count: 1 })

    const res = await UpdateCustomer(
      makeJsonReq("/api/v1/mtm/customers/c1", "PUT", { name: "Updated", category: "A" }),
      makeParams("c1")
    )
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── DELETE /api/v1/mtm/customers/[id] ─────────────────────
describe("DELETE /api/v1/mtm/customers/[id]", () => {
  it("returns 404 when not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.deleteMany).mockResolvedValue({ count: 0 })

    const res = await DeleteCustomer(makeReq("/api/v1/mtm/customers/c1"), makeParams("c1"))
    expect(res.status).toBe(404)
  })

  it("deletes customer successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmCustomer.deleteMany).mockResolvedValue({ count: 1 })

    const res = await DeleteCustomer(makeReq("/api/v1/mtm/customers/c1"), makeParams("c1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── GET /api/v1/mtm/tasks ─────────────────────────────────
describe("GET /api/v1/mtm/tasks", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await ListTasks(makeReq("/api/v1/mtm/tasks"))
    expect(res.status).toBe(401)
  })

  it("returns paginated tasks with filters", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmTask.findMany).mockResolvedValue([{ id: "t1", title: "Task 1" }] as any)
    vi.mocked(prisma.mtmTask.count).mockResolvedValue(1)

    const res = await ListTasks(makeReq("/api/v1/mtm/tasks?agentId=a1&status=PENDING&priority=URGENT"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.tasks).toHaveLength(1)

    const callArgs = vi.mocked(prisma.mtmTask.findMany).mock.calls[0][0] as any
    expect(callArgs.where.agentId).toBe("a1")
    expect(callArgs.where.status).toBe("PENDING")
    expect(callArgs.where.priority).toBe("URGENT")
  })
})

// ─── POST /api/v1/mtm/tasks ────────────────────────────────
describe("POST /api/v1/mtm/tasks", () => {
  it("creates task and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmTask.create).mockResolvedValue({ id: "t-new" } as any)

    const body = { agentId: "a1", title: "Visit shop", priority: "HIGH", dueDate: "2026-04-15" }
    const res = await CreateTask(makeJsonReq("/api/v1/mtm/tasks", "POST", body))
    expect(res.status).toBe(201)

    const createArgs = vi.mocked(prisma.mtmTask.create).mock.calls[0][0] as any
    expect(createArgs.data.organizationId).toBe(ORG)
    expect(createArgs.data.agentId).toBe("a1")
    expect(createArgs.data.priority).toBe("HIGH")
    expect(createArgs.data.dueDate).toEqual(new Date("2026-04-15"))
  })
})

// ─── PUT /api/v1/mtm/tasks/[id] ────────────────────────────
describe("PUT /api/v1/mtm/tasks/[id]", () => {
  it("returns 404 when task not found", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmTask.updateMany).mockResolvedValue({ count: 0 })

    const res = await UpdateTask(
      makeJsonReq("/api/v1/mtm/tasks/t1", "PUT", { title: "X", agentId: "a1" }),
      makeParams("t1")
    )
    expect(res.status).toBe(404)
  })

  it("sets completedAt when status is COMPLETED", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmTask.updateMany).mockResolvedValue({ count: 1 })

    await UpdateTask(
      makeJsonReq("/api/v1/mtm/tasks/t1", "PUT", { title: "Done", agentId: "a1", status: "COMPLETED" }),
      makeParams("t1")
    )

    const updateArgs = vi.mocked(prisma.mtmTask.updateMany).mock.calls[0][0] as any
    expect(updateArgs.data.completedAt).toBeInstanceOf(Date)
    expect(updateArgs.data.status).toBe("COMPLETED")
  })
})

// ─── DELETE /api/v1/mtm/tasks/[id] ─────────────────────────
describe("DELETE /api/v1/mtm/tasks/[id]", () => {
  it("deletes task successfully", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmTask.deleteMany).mockResolvedValue({ count: 1 })

    const res = await DeleteTask(makeReq("/api/v1/mtm/tasks/t1"), makeParams("t1"))
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})

// ─── GET /api/v1/mtm/photos ────────────────────────────────
describe("GET /api/v1/mtm/photos", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await ListPhotos(makeReq("/api/v1/mtm/photos"))
    expect(res.status).toBe(401)
  })

  it("returns paginated photos with filters", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmPhoto.findMany).mockResolvedValue([{ id: "p1", url: "/img.jpg" }] as any)
    vi.mocked(prisma.mtmPhoto.count).mockResolvedValue(1)

    const res = await ListPhotos(makeReq("/api/v1/mtm/photos?agentId=a1&status=APPROVED"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.photos).toHaveLength(1)

    const callArgs = vi.mocked(prisma.mtmPhoto.findMany).mock.calls[0][0] as any
    expect(callArgs.where.agentId).toBe("a1")
    expect(callArgs.where.status).toBe("APPROVED")
  })
})

// ─── GET /api/v1/mtm/alerts ────────────────────────────────
describe("GET /api/v1/mtm/alerts", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await ListAlerts(makeReq("/api/v1/mtm/alerts"))
    expect(res.status).toBe(401)
  })

  it("returns alerts filtered by resolved and type", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmAlert.findMany).mockResolvedValue([{ id: "al1", type: "GPS_SPOOF" }] as any)
    vi.mocked(prisma.mtmAlert.count).mockResolvedValue(1)

    const res = await ListAlerts(makeReq("/api/v1/mtm/alerts?resolved=false&type=GPS_SPOOF"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.alerts).toHaveLength(1)

    const callArgs = vi.mocked(prisma.mtmAlert.findMany).mock.calls[0][0] as any
    expect(callArgs.where.isResolved).toBe(false)
    expect(callArgs.where.type).toBe("GPS_SPOOF")
  })
})

// ─── GET /api/v1/mtm/settings ──────────────────────────────
describe("GET /api/v1/mtm/settings", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getOrgId).mockResolvedValue(null)
    const res = await GetSettings(makeReq("/api/v1/mtm/settings"))
    expect(res.status).toBe(401)
  })

  it("returns merged settings with defaults", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmSetting.findMany).mockResolvedValue([
      { key: "gpsInterval", value: 60 },
      { key: "geofenceRadius", value: 200 },
    ] as any)

    const res = await GetSettings(makeReq("/api/v1/mtm/settings"))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.gpsInterval).toBe(60)
    expect(json.data.geofenceRadius).toBe(200)
    expect(json.data.photoRequired).toBe(true) // default preserved
  })
})

// ─── PUT /api/v1/mtm/settings ──────────────────────────────
describe("PUT /api/v1/mtm/settings", () => {
  it("upserts settings keys", async () => {
    vi.mocked(getOrgId).mockResolvedValue(ORG)
    vi.mocked(prisma.mtmSetting.upsert).mockResolvedValue({} as any)

    const body = { gpsInterval: 15, photoRequired: false }
    const res = await UpdateSettings(makeJsonReq("/api/v1/mtm/settings", "PUT", body))
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(prisma.mtmSetting.upsert).toHaveBeenCalledTimes(2)
  })
})

// ─── POST /api/v1/mtm/mobile/auth ──────────────────────────
describe("POST /api/v1/mtm/mobile/auth", () => {
  it("returns 400 when email or password missing", async () => {
    const res = await MobileAuth(makeJsonReq("/api/v1/mtm/mobile/auth", "POST", { email: "x@test.com" }))
    expect(res.status).toBe(400)
  })

  it("returns 401 when agent not found", async () => {
    vi.mocked(prisma.mtmAgent.findFirst).mockResolvedValue(null)

    const res = await MobileAuth(
      makeJsonReq("/api/v1/mtm/mobile/auth", "POST", { email: "ghost@test.com", password: "pw" })
    )
    expect(res.status).toBe(401)
  })

  it("authenticates via agent passwordHash and returns JWT", async () => {
    vi.mocked(prisma.mtmAgent.findFirst).mockResolvedValue({
      id: "a1",
      name: "Agent",
      email: "agent@test.com",
      phone: null,
      role: "AGENT",
      avatar: null,
      passwordHash: "hashed",
      userId: null,
      organizationId: ORG,
      organization: { id: ORG, name: "Test Org" },
    } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never)
    vi.mocked(prisma.mtmAgent.update).mockResolvedValue({} as any)

    const res = await MobileAuth(
      makeJsonReq("/api/v1/mtm/mobile/auth", "POST", { email: "agent@test.com", password: "secret" })
    )
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.token).toBe("mock-jwt-token")
    expect(json.data.agent.id).toBe("a1")
  })

  it("returns 401 on wrong password", async () => {
    vi.mocked(prisma.mtmAgent.findFirst).mockResolvedValue({
      id: "a1",
      passwordHash: "hashed",
      userId: null,
      organizationId: ORG,
      organization: { id: ORG, name: "Org" },
    } as any)
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never)

    const res = await MobileAuth(
      makeJsonReq("/api/v1/mtm/mobile/auth", "POST", { email: "a@test.com", password: "wrong" })
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Invalid password")
  })
})

// ─── GET /api/v1/mtm/mobile/ping ───────────────────────────
describe("GET /api/v1/mtm/mobile/ping", () => {
  it("returns server name from first org", async () => {
    vi.mocked(prisma.organization.findFirst).mockResolvedValue({ name: "Acme Corp" } as any)

    const res = await MobilePing()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("Acme Corp")
    expect(json.data.version).toBe("2.0")
  })

  it("returns default name on error", async () => {
    vi.mocked(prisma.organization.findFirst).mockRejectedValue(new Error("DB down"))

    const res = await MobilePing()
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.name).toBe("LeadDrive CRM")
  })
})
