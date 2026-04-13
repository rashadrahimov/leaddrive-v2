import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextResponse } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  logAudit: vi.fn(),
}))

vi.mock("@/lib/api-auth", () => ({
  getSession: vi.fn(),
  getOrgId: vi.fn(),
  requireAuth: vi.fn(),
  isAuthError: vi.fn().mockImplementation((result: any) => result instanceof NextResponse),
}))

vi.mock("@/lib/field-filter", () => ({
  getFieldPermissions: vi.fn().mockResolvedValue([]),
  filterEntityFields: vi.fn().mockImplementation((data: any) => data),
  filterWritableFields: vi.fn().mockImplementation((data: any) => data),
}))

vi.mock("@/lib/sharing-rules", () => ({
  applyRecordFilter: vi.fn().mockImplementation((_o: any, _u: any, _r: any, _e: any, where: any) => where),
}))

vi.mock("@/lib/notifications", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/workflow-engine", () => ({
  executeWorkflows: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from "@/app/api/v1/tasks/route"
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/v1/tasks/[id]/route"
import { prisma } from "@/lib/prisma"
import { getSession, getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"
import { createNotification } from "@/lib/notifications"

const SESSION = { orgId: "org-1", userId: "user-1", role: "admin", email: "a@b.com", name: "Test" }

function makeRequest(url: string, opts?: RequestInit) {
  return new Request(url, opts) as any
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/v1/tasks
// ---------------------------------------------------------------------------
describe("GET /api/v1/tasks", () => {
  it("returns 401 when no orgId", async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    vi.mocked(getOrgId).mockResolvedValue(null as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tasks"))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe("Unauthorized")
  })

  it("returns 400 for invalid page (NaN)", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tasks?page=abc"))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe("Invalid page or limit")
  })

  it("returns 400 for page < 1", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tasks?page=0"))
    expect(res.status).toBe(400)
  })

  it("returns 400 for limit > 200", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)

    const res = await GET(makeRequest("http://localhost/api/v1/tasks?limit=201"))
    expect(res.status).toBe(400)
  })

  it("returns tasks with filters (assignedTo, status)", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const mockTasks = [{ id: "t1", title: "Task 1", status: "pending", assignedTo: "user-1" }]
    vi.mocked(prisma.task.findMany).mockResolvedValue(mockTasks as any)
    vi.mocked(prisma.task.count).mockResolvedValue(1)

    const res = await GET(makeRequest("http://localhost/api/v1/tasks?assignedTo=user-1&status=pending"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.tasks).toHaveLength(1)
    expect(body.data.total).toBe(1)

    const findManyCall = vi.mocked(prisma.task.findMany).mock.calls[0][0] as any
    expect(findManyCall.where.assignedTo).toBe("user-1")
    expect(findManyCall.where.status).toBe("pending")
  })

  it("BUG: catch block returns success:true instead of 500", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.task.findMany).mockRejectedValue(new Error("DB down"))

    const res = await GET(makeRequest("http://localhost/api/v1/tasks"))
    const body = await res.json()
    // This is the documented bug: catch returns success:true with empty data
    expect(body.success).toBe(true)
    expect(body.data.tasks).toEqual([])
    expect(body.data.total).toBe(0)
    // Should have been 500, but the implementation returns 200
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// POST /api/v1/tasks
// ---------------------------------------------------------------------------
describe("POST /api/v1/tasks", () => {
  it("creates a task and returns 201", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const created = { id: "t-new", title: "New Task", status: "pending", priority: "medium", assignedTo: "user-1" }
    vi.mocked(prisma.task.create).mockResolvedValue(created as any)

    const res = await POST(makeRequest("http://localhost/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "New Task", assignedTo: "user-1" }),
    }))

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("t-new")
  })

  it("returns 400 when title is missing", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")

    const res = await POST(makeRequest("http://localhost/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({}),
    }))

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it("applies defaults: status=pending, priority=medium", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.task.create).mockResolvedValue({ id: "t1", title: "X", status: "pending", priority: "medium" } as any)

    await POST(makeRequest("http://localhost/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "X" }),
    }))

    const createCall = vi.mocked(prisma.task.create).mock.calls[0][0] as any
    expect(createCall.data.status).toBe("pending")
    expect(createCall.data.priority).toBe("medium")
  })

  it("sends warning notification for urgent priority", async () => {
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const created = { id: "t-urg", title: "Urgent!", status: "pending", priority: "urgent", assignedTo: "user-2" }
    vi.mocked(prisma.task.create).mockResolvedValue(created as any)

    await POST(makeRequest("http://localhost/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ title: "Urgent!", priority: "urgent", assignedTo: "user-2" }),
    }))

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "warning",
        userId: "user-2",
      })
    )
  })
})

// ---------------------------------------------------------------------------
// GET /api/v1/tasks/:id
// ---------------------------------------------------------------------------
describe("GET /api/v1/tasks/:id", () => {
  it("returns a task when found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    const task = { id: "t1", title: "Found", organizationId: "org-1" }
    vi.mocked(prisma.task.findFirst).mockResolvedValue(task as any)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/tasks/t1"), makeParams("t1"))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.id).toBe("t1")
  })

  it("returns 404 when task not found", async () => {
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    vi.mocked(getOrgId).mockResolvedValue("org-1")
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null)

    const res = await GET_BY_ID(makeRequest("http://localhost/api/v1/tasks/nope"), makeParams("nope"))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe("Not found")
  })
})

// ---------------------------------------------------------------------------
// PATCH /api/v1/tasks/:id
// ---------------------------------------------------------------------------
describe("PATCH /api/v1/tasks/:id", () => {
  it("returns auth error when requireAuth fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    )

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tasks/t1", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      makeParams("t1")
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when task not found", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null)

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tasks/t1", { method: "PATCH", body: JSON.stringify({ title: "X" }) }),
      makeParams("t1")
    )
    expect(res.status).toBe(404)
  })

  it("updates a task successfully", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SESSION as any)
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const existing = { id: "t1", title: "Old", organizationId: "org-1" }
    vi.mocked(prisma.task.findFirst).mockResolvedValue(existing as any)
    const updated = { id: "t1", title: "New Title", organizationId: "org-1" }
    vi.mocked(prisma.task.update).mockResolvedValue(updated as any)

    const res = await PATCH(
      makeRequest("http://localhost/api/v1/tasks/t1", {
        method: "PATCH",
        body: JSON.stringify({ title: "New Title" }),
      }),
      makeParams("t1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.title).toBe("New Title")

    // Verify update was called with where: { id } (no orgId in update where)
    const updateCall = vi.mocked(prisma.task.update).mock.calls[0][0] as any
    expect(updateCall.where).toEqual({ id: "t1" })
  })

  it("sets completedAt when status=completed", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SESSION as any)
    vi.mocked(getSession).mockResolvedValue(SESSION as any)
    const existing = { id: "t1", title: "Task", status: "pending", organizationId: "org-1" }
    vi.mocked(prisma.task.findFirst).mockResolvedValue(existing as any)
    vi.mocked(prisma.task.update).mockResolvedValue({ ...existing, status: "completed" } as any)

    await PATCH(
      makeRequest("http://localhost/api/v1/tasks/t1", {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      makeParams("t1")
    )

    const updateCall = vi.mocked(prisma.task.update).mock.calls[0][0] as any
    expect(updateCall.data.completedAt).toBeInstanceOf(Date)

    // Also creates a completion notification
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "success",
        title: "Task Completed",
      })
    )
  })
})

// ---------------------------------------------------------------------------
// DELETE /api/v1/tasks/:id
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/tasks/:id", () => {
  it("returns auth error when requireAuth fails", async () => {
    vi.mocked(requireAuth).mockResolvedValue(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }) as any
    )

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tasks/t1", { method: "DELETE" }),
      makeParams("t1")
    )
    expect(res.status).toBe(401)
  })

  it("returns 404 when task not found", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.task.findFirst).mockResolvedValue(null)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tasks/t1", { method: "DELETE" }),
      makeParams("t1")
    )
    expect(res.status).toBe(404)
  })

  it("deletes a task successfully using deleteMany with orgId", async () => {
    vi.mocked(requireAuth).mockResolvedValue(SESSION as any)
    vi.mocked(prisma.task.findFirst).mockResolvedValue({ title: "Bye" } as any)
    vi.mocked(prisma.task.deleteMany).mockResolvedValue({ count: 1 } as any)

    const res = await DELETE(
      makeRequest("http://localhost/api/v1/tasks/t1", { method: "DELETE" }),
      makeParams("t1")
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)

    // Verify deleteMany uses both id and organizationId
    const deleteCall = vi.mocked(prisma.task.deleteMany).mock.calls[0][0] as any
    expect(deleteCall.where).toEqual({ id: "t1", organizationId: "org-1" })
  })
})
