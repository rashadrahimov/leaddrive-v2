import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// GET /api/v1/portal-users — list contacts with portal info
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const filter = url.searchParams.get("filter") || "all"
  const search = url.searchParams.get("search") || ""

  const where: any = { organizationId: orgId }

  if (filter === "enabled") where.portalAccessEnabled = true
  else if (filter === "registered") {
    where.portalAccessEnabled = true
    where.portalPasswordHash = { not: null }
  } else if (filter === "pending") {
    where.portalAccessEnabled = true
    where.portalPasswordHash = null
  } else if (filter === "disabled") {
    where.portalAccessEnabled = false
    where.email = { not: null }
  }

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ]
  }

  const contacts = await prisma.contact.findMany({
    where,
    include: { company: { select: { name: true } } },
    orderBy: [{ portalAccessEnabled: "desc" }, { portalLastLoginAt: "desc" }, { fullName: "asc" }],
    take: 200,
  })

  const data = contacts.map(c => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email,
    phone: c.phone,
    companyName: c.company?.name || null,
    isActive: c.isActive,
    portalAccessEnabled: c.portalAccessEnabled,
    hasPassword: !!c.portalPasswordHash,
    portalLastLoginAt: c.portalLastLoginAt,
  }))

  // Stats
  const allContacts = await prisma.contact.findMany({
    where: { organizationId: orgId, email: { not: null } },
    select: { portalAccessEnabled: true, portalPasswordHash: true, portalLastLoginAt: true },
  })

  const totalWithEmail = allContacts.length
  const enabled = allContacts.filter(c => c.portalAccessEnabled).length
  const registered = allContacts.filter(c => c.portalAccessEnabled && c.portalPasswordHash).length
  const weekAgo = new Date(Date.now() - 7 * 86400000)
  const recentLogins = allContacts.filter(c => c.portalLastLoginAt && c.portalLastLoginAt > weekAgo).length

  return NextResponse.json({
    success: true,
    data: { contacts: data, stats: { totalWithEmail, enabled, registered, recentLogins } },
  })
}

// PATCH /api/v1/portal-users — bulk enable/disable
export async function PATCH(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { contactIds, action, contactId, resetPassword, portalAccessEnabled, clearChatHistory, removeFromPortal } = await req.json()

  // Single contact update
  if (contactId) {
    const updateData: any = {}
    if (typeof portalAccessEnabled === "boolean") updateData.portalAccessEnabled = portalAccessEnabled
    if (resetPassword) updateData.portalPasswordHash = null

    // Clear AI chat history for this contact
    if (clearChatHistory || removeFromPortal) {
      const sessions = await prisma.aiChatSession.findMany({
        where: { organizationId: orgId, portalUserId: contactId },
        select: { id: true },
      })
      if (sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id)
        await prisma.aiChatMessage.deleteMany({ where: { sessionId: { in: sessionIds } } })
        await prisma.aiChatSession.deleteMany({ where: { id: { in: sessionIds } } })
      }

      if (removeFromPortal) {
        // Full portal reset — user can re-register from scratch
        await prisma.contact.update({
          where: { id: contactId },
          data: {
            portalPasswordHash: null,
            portalAccessEnabled: true, // keep enabled so they can re-register
            portalLastLoginAt: null,
          },
        })
        return NextResponse.json({ success: true, removed: true })
      }

      return NextResponse.json({ success: true, cleared: sessions.length })
    }

    await prisma.contact.update({
      where: { id: contactId },
      data: updateData,
    })

    const actionName = resetPassword ? "portal_password_reset" : portalAccessEnabled ? "portal_access_enabled" : "portal_access_disabled"
    try {
      const contact = await prisma.contact.findUnique({ where: { id: contactId }, select: { fullName: true } })
      await prisma.auditLog.create({
        data: {
          organizationId: orgId,
          action: actionName,
          entityType: "contact",
          entityId: contactId,
          entityName: contact?.fullName || "",
        },
      })
    } catch {}

    return NextResponse.json({ success: true })
  }

  // Bulk action
  if (contactIds && action) {
    const enableValue = action === "enable"
    await prisma.contact.updateMany({
      where: { id: { in: contactIds }, organizationId: orgId },
      data: { portalAccessEnabled: enableValue },
    })
    return NextResponse.json({ success: true, updated: contactIds.length })
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 })
}
