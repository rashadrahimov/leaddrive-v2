import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { PAGE_SIZE } from "@/lib/constants"

const updateContractSchema = z.object({
  contractNumber: z.string().optional(),
  title: z.string().optional(),
  companyId: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(["draft", "sent", "signed", "active", "expiring", "expired", "renewed"]).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  valueAmount: z.number().optional(),
  currency: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const contract = await prisma.contract.findFirst({
      where: { id, organizationId: orgId },
      include: { company: { select: { id: true, name: true } } },
    })
    if (!contract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Fetch history from audit log
    const history = await prisma.auditLog.findMany({
      where: { organizationId: orgId, entityType: "contract", entityId: id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE.DEFAULT,
    })

    return NextResponse.json({ success: true, data: { ...contract, history } })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateContractSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Get old values for audit
    const oldContract = await prisma.contract.findFirst({ where: { id, organizationId: orgId } })
    if (!oldContract) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const result = await prisma.contract.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...parsed.data,
        startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      },
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.contract.findFirst({ where: { id, organizationId: orgId } })

    // Log changes to audit
    const changes: Record<string, { old: any; new: any }> = {}
    const fields = ["contractNumber", "title", "companyId", "type", "status", "valueAmount", "currency", "notes"] as const
    for (const f of fields) {
      const oldVal = (oldContract as any)[f]
      const newVal = (updated as any)[f]
      if (String(oldVal ?? "") !== String(newVal ?? "")) {
        changes[f] = { old: oldVal, new: newVal }
      }
    }
    // Check dates separately
    const oldStart = oldContract.startDate?.toISOString().split("T")[0] || ""
    const newStart = updated?.startDate?.toISOString().split("T")[0] || ""
    if (oldStart !== newStart) changes.startDate = { old: oldStart, new: newStart }
    const oldEnd = oldContract.endDate?.toISOString().split("T")[0] || ""
    const newEnd = updated?.endDate?.toISOString().split("T")[0] || ""
    if (oldEnd !== newEnd) changes.endDate = { old: oldEnd, new: newEnd }

    if (Object.keys(changes).length > 0) {
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          action: "update",
          entityType: "contract",
          entityId: id,
          entityName: updated?.title || oldContract.title,
          oldValue: changes,
          newValue: parsed.data,
        },
      }).catch(() => {}) // non-critical
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const contract = await prisma.contract.findFirst({ where: { id, organizationId: orgId } })
    const result = await prisma.contract.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Log deletion
    if (contract) {
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          action: "delete",
          entityType: "contract",
          entityId: id,
          entityName: contract.title,
          oldValue: contract as any,
        },
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
