import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"

const createAuditLogSchema = z.object({
  userId: z.string().optional(),
  action: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().optional(),
  entityName: z.string().optional(),
  oldValue: z.record(z.string(), z.any()).optional(),
  newValue: z.record(z.string(), z.any()).optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  const entityType = searchParams.get("entityType") || ""
  const entityId = searchParams.get("entityId") || ""

  try {
    const where = {
      organizationId: orgId,
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({ success: true, data: { logs, total, page, limit } })
  } catch {
    return NextResponse.json({ success: true, data: { logs: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const orgId = session.orgId
  if (session.role !== "admin" && session.role !== "owner") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createAuditLogSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const log = await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
