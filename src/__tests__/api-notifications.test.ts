import { describe, it, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
  },
}))
vi.mock("@/lib/api-auth", () => ({ getOrgId: vi.fn() }))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/constants", () => ({ PAGE_SIZE: { DEFAULT: 50 } }))

import { GET, PATCH } from "@/app/api/v1/notifications/route"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"

const mockGetOrgId = getOrgId as ReturnType<typeof vi.fn>
const mockAuth = auth as ReturnType<typeof vi.fn>
const mockFindMany = prisma.notification.findMany as ReturnType<typeof vi.fn>
const mockCount = prisma.notification.count as ReturnType<typeof vi.fn>
const mockUpdateMany = prisma.notification.updateMany as ReturnType<typeof vi.fn>

function makeReq(method: string, body?: Record<string, unknown>): NextRequest {
  const url = "http://localhost:3000/api/v1/notifications"
  if (method === "GET") return new NextRequest(url, { method })
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("GET /api/v1/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrgId.mockResolvedValue("org-1")
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
  })

  it("returns 401 when orgId is missing", async () => {
    mockGetOrgId.mockResolvedValue(null)
    const res = await GET(makeReq("GET"))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("returns notifications and unreadCount", async () => {
    const fakeNotifications = [
      { id: "n1", title: "Hello", isRead: false },
      { id: "n2", title: "World", isRead: true },
    ]
    mockFindMany.mockResolvedValue(fakeNotifications)
    mockCount.mockResolvedValue(1)

    const res = await GET(makeReq("GET"))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.notifications).toEqual(fakeNotifications)
    expect(json.data.unreadCount).toBe(1)
  })

  it("filters by OR condition when userId exists", async () => {
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await GET(makeReq("GET"))

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        OR: [{ userId: "user-1" }, { userId: "" }],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    expect(mockCount).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        OR: [{ userId: "user-1" }, { userId: "" }],
        isRead: false,
      },
    })
  })

  it("returns all org notifications when no session user", async () => {
    mockAuth.mockResolvedValue(null)
    mockFindMany.mockResolvedValue([])
    mockCount.mockResolvedValue(0)

    await GET(makeReq("GET"))

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: { createdAt: "desc" },
      take: 50,
    })
    expect(mockCount).toHaveBeenCalledWith({
      where: { organizationId: "org-1", isRead: false },
    })
  })

  it("BUG: returns success true instead of 500 on error", async () => {
    mockFindMany.mockRejectedValue(new Error("DB down"))

    const res = await GET(makeReq("GET"))
    // Bug: catch block returns 200 with success:true instead of 500
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.notifications).toEqual([])
    expect(json.data.unreadCount).toBe(0)
  })
})

describe("PATCH /api/v1/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetOrgId.mockResolvedValue("org-1")
    mockAuth.mockResolvedValue({ user: { id: "user-1" } })
    mockUpdateMany.mockResolvedValue({ count: 3 })
  })

  it("returns 401 when orgId is missing", async () => {
    mockGetOrgId.mockResolvedValue(null)
    const res = await PATCH(makeReq("PATCH", { markAll: true }))
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe("Unauthorized")
  })

  it("marks all user unread notifications as read when markAll=true", async () => {
    const res = await PATCH(makeReq("PATCH", { markAll: true }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        organizationId: "org-1",
        OR: [{ userId: "user-1" }, { userId: "" }],
        isRead: false,
      },
      data: { isRead: true },
    })
  })

  it("marks specific notifications as read when ids provided", async () => {
    const ids = ["n1", "n2", "n3"]
    const res = await PATCH(makeReq("PATCH", { ids }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ids },
        organizationId: "org-1",
      },
      data: { isRead: true },
    })
  })
})
