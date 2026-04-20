import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getPortalUser } from "@/lib/portal-auth"
import { enrichComplaintInBackground } from "@/lib/complaint-ai"

type PortalComplaintMeta = {
  brand?: string | null
  productCategory?: string | null
  complaintObject?: string | null
  complaintObjectDetail?: string | null
  complaintType?: "complaint" | "suggestion"
}

export async function GET() {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const tickets = await prisma.ticket.findMany({
    where: {
      organizationId: user.organizationId,
      contactId: user.contactId,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      ticketNumber: true,
      subject: true,
      status: true,
      priority: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      resolvedAt: true,
      closedAt: true,
    },
  })

  return NextResponse.json({ success: true, data: tickets })
}

export async function POST(req: NextRequest) {
  const user = await getPortalUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { subject, description, category, priority } = body as {
    subject?: string
    description?: string
    category?: string
    priority?: string
  }
  const isComplaint = body?.isComplaint === true
  const meta: PortalComplaintMeta = (body?.complaintMeta as PortalComplaintMeta) || {}
  if (!subject) return NextResponse.json({ error: "Subject is required" }, { status: 400 })

  // Only honour isComplaint if the tenant actually has the feature enabled.
  let complaintsEnabled = false
  if (isComplaint) {
    const org = await prisma.organization.findFirst({
      where: { id: user.organizationId },
      select: { features: true },
    })
    const arr: string[] =
      typeof org?.features === "string"
        ? (() => {
            try {
              return JSON.parse(org!.features as unknown as string)
            } catch {
              return []
            }
          })()
        : Array.isArray(org?.features)
        ? (org!.features as string[])
        : []
    complaintsEnabled = arr.includes("complaints_register")
  }

  const count = await prisma.ticket.count({
    where: { organizationId: user.organizationId },
  })
  const ticketNumber = `TK-${String(count + 1).padStart(5, "0")}`

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const ticket = await tx.ticket.create({
      data: {
        organizationId: user.organizationId,
        ticketNumber,
        subject,
        description: description || null,
        category: complaintsEnabled ? "complaint" : category || "general",
        priority: priority || "medium",
        status: "new",
        contactId: user.contactId,
        companyId: user.companyId,
        createdBy: user.contactId,
        source: "portal",
      },
    })
    if (complaintsEnabled) {
      await tx.complaintMeta.create({
        data: {
          ticketId: ticket.id,
          organizationId: user.organizationId,
          complaintType: meta.complaintType === "suggestion" ? "suggestion" : "complaint",
          brand: meta.brand ?? null,
          productCategory: meta.productCategory ?? null,
          complaintObject: meta.complaintObject ?? null,
          complaintObjectDetail: meta.complaintObjectDetail ?? null,
        },
      })
    }
    return ticket
  })

  // AI enrichment (risk + department) runs in the background, never blocks the response.
  if (complaintsEnabled) {
    enrichComplaintInBackground(result.id, user.organizationId).catch(() => {})
  }

  return NextResponse.json({ success: true, data: result }, { status: 201 })
}
