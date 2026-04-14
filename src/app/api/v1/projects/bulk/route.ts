import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  action: z.enum(["delete", "changeStatus"]),
  value: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId

  const body = await req.json()
  const parsed = bulkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { ids, action, value } = parsed.data

  try {
    if (action === "delete") {
      const result = await prisma.project.deleteMany({
        where: { id: { in: ids }, organizationId: orgId },
      })
      return NextResponse.json({ success: true, data: { deleted: result.count } })
    }

    if (action === "changeStatus") {
      if (!value) {
        return NextResponse.json({ error: "value required for changeStatus" }, { status: 400 })
      }
      const validStatuses = ["planning", "active", "on_hold", "completed", "cancelled"]
      if (!validStatuses.includes(value)) {
        return NextResponse.json({ error: `Invalid status: ${value}` }, { status: 400 })
      }

      const data: Record<string, unknown> = { status: value }
      if (value === "completed") {
        data.actualEndDate = new Date()
        data.completionPercentage = 100
      }
      if (value === "active") {
        data.actualStartDate = new Date()
      }

      const result = await prisma.project.updateMany({
        where: { id: { in: ids }, organizationId: orgId },
        data,
      })
      return NextResponse.json({ success: true, data: { updated: result.count } })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
