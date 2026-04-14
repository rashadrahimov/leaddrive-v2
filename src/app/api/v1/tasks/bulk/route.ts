import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, requireAuth, isAuthError } from "@/lib/api-auth"

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(["complete", "delete", "update_status", "update_priority", "reassign"]),
  value: z.string().optional(), // new status, priority, or assignedTo
})

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, "tasks", "write")
  if (isAuthError(authResult)) return authResult
  const orgId = authResult.orgId

  const body = await req.json()
  const parsed = bulkUpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const { ids, action, value } = parsed.data

  try {
    const where = { id: { in: ids }, organizationId: orgId }

    switch (action) {
      case "complete":
        await prisma.task.updateMany({
          where,
          data: { status: "completed", completedAt: new Date() },
        })
        logAudit(orgId, "bulk_update", "task", ids.join(","), `Completed ${ids.length} tasks`)
        break

      case "delete": {
        // Check delete permission separately
        const deleteAuth = await requireAuth(req, "tasks", "delete")
        if (isAuthError(deleteAuth)) return deleteAuth
        await prisma.task.deleteMany({ where })
        logAudit(orgId, "bulk_delete", "task", ids.join(","), `Deleted ${ids.length} tasks`)
        break
      }

      case "update_status":
        if (!value || !["pending", "in_progress", "completed", "cancelled"].includes(value)) {
          return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
        }
        await prisma.task.updateMany({
          where,
          data: {
            status: value,
            ...(value === "completed" ? { completedAt: new Date() } : {}),
          },
        })
        logAudit(orgId, "bulk_update", "task", ids.join(","), `Updated ${ids.length} tasks to ${value}`)
        break

      case "update_priority":
        if (!value || !["low", "medium", "high", "urgent"].includes(value)) {
          return NextResponse.json({ error: "Invalid priority value" }, { status: 400 })
        }
        await prisma.task.updateMany({ where, data: { priority: value } })
        logAudit(orgId, "bulk_update", "task", ids.join(","), `Updated ${ids.length} tasks priority to ${value}`)
        break

      case "reassign":
        await prisma.task.updateMany({ where, data: { assignedTo: value || null } })
        logAudit(orgId, "bulk_update", "task", ids.join(","), `Reassigned ${ids.length} tasks`)
        break
    }

    return NextResponse.json({ success: true, affected: ids.length })
  } catch (e) {
    console.error("[Tasks Bulk]", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
