import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/superadmin-guard"
import { deactivateTenant, activateTenant, scheduleTenantDeletion, hardDeleteTenant } from "@/lib/tenant-provisioning"
import { exportTenantData } from "@/lib/tenant-export"
import { sendEmail } from "@/lib/email"
import { getDeletionScheduledEmail, getDeletionCompletedEmail } from "@/lib/emails/tenant-deletion"
import { logAudit } from "@/lib/prisma"

// GET /api/v1/admin/tenants/[id] — Tenant details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params

  const tenant = await prisma.organization.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          users: true,
          contacts: true,
          deals: true,
          companies: true,
          leads: true,
        },
      },
    },
  })

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      isActive: tenant.isActive,
      serverType: tenant.serverType,
      serverIp: tenant.serverIp,
      maxUsers: tenant.maxUsers,
      maxContacts: tenant.maxContacts,
      features: tenant.features,
      branding: tenant.branding,
      addons: tenant.addons,
      settings: tenant.settings,
      provisionedAt: tenant.provisionedAt,
      provisionedBy: tenant.provisionedBy,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      users: tenant.users,
      _count: tenant._count,
    },
  })
}

// PUT /api/v1/admin/tenants/[id] — Update tenant
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const body = await req.json()

  const existing = await prisma.organization.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  // Slug change: validate uniqueness if changed
  if (body.slug !== undefined && body.slug !== existing.slug) {
    const { validateSlug } = await import("@/lib/tenant-provisioning")
    const slugCheck = await validateSlug(body.slug)
    if (!slugCheck.valid) {
      return NextResponse.json({ error: slugCheck.error }, { status: 400 })
    }
  }

  const updateData: any = {}
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.name !== undefined) updateData.name = body.name
  if (body.plan !== undefined) updateData.plan = body.plan
  if (body.maxUsers !== undefined) updateData.maxUsers = body.maxUsers
  if (body.maxContacts !== undefined) updateData.maxContacts = body.maxContacts
  if (body.features !== undefined) updateData.features = typeof body.features === "string" ? body.features : JSON.stringify(body.features)
  if (body.branding !== undefined) {
    updateData.branding = typeof body.branding === "string" ? body.branding : JSON.stringify(body.branding)
    const brandingObj = typeof body.branding === "string" ? JSON.parse(body.branding) : body.branding
    updateData.logo = brandingObj?.logo || null
  }
  if (body.addons !== undefined) updateData.addons = body.addons
  if (body.isActive !== undefined) updateData.isActive = body.isActive
  if (body.serverType !== undefined) updateData.serverType = body.serverType
  if (body.serverIp !== undefined) updateData.serverIp = body.serverIp

  // Settings are merged (not overwritten) to preserve unrelated keys
  if (body.settings !== undefined && typeof body.settings === "object") {
    const existingSettings = (existing.settings as Record<string, any>) || {}
    updateData.settings = { ...existingSettings, ...body.settings }
  }

  const updated = await prisma.organization.update({
    where: { id },
    data: updateData,
  })

  logAudit(auth.orgId, "update", "tenant", id, existing.name, {
    oldValue: { plan: existing.plan, isActive: existing.isActive },
    newValue: updateData,
  })

  return NextResponse.json({
    data: {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      isActive: updated.isActive,
      maxUsers: updated.maxUsers,
      maxContacts: updated.maxContacts,
    },
  })
}

// DELETE /api/v1/admin/tenants/[id] — Schedule deletion or force delete
// Without ?force → schedule deletion (30 day grace period)
// With ?force=true&confirm=<slug> → immediate hard delete with export
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const { id } = await params
  const url = new URL(req.url)
  const force = url.searchParams.get("force") === "true"
  const confirmSlug = url.searchParams.get("confirm")

  const existing = await prisma.organization.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 })
  }

  if (force) {
    // Force delete — requires slug confirmation
    if (confirmSlug !== existing.slug) {
      return NextResponse.json(
        { error: "Slug confirmation does not match. Pass ?confirm=<slug> to confirm deletion." },
        { status: 400 }
      )
    }

    // Export data before deletion (best-effort)
    let exportFilename: string | null = null
    try {
      const exportResult = await exportTenantData(id)
      exportFilename = exportResult.filename
      console.log(`[TENANT] Exported data for "${existing.name}" before deletion: ${exportFilename}`)
    } catch (exportErr) {
      console.error(`[TENANT] Export failed before deletion of "${existing.name}":`, exportErr)
    }

    // Notify admin users before deletion (best-effort)
    try {
      const adminUsers = await prisma.user.findMany({
        where: { organizationId: id, role: "admin" },
        select: { email: true },
      })
      const emailData = getDeletionCompletedEmail({ companyName: existing.name })
      for (const u of adminUsers) {
        await sendEmail({ to: u.email, subject: emailData.subject, html: emailData.html }).catch(() => {})
      }
    } catch {}

    // Audit log before deletion (org will be gone after)
    logAudit(auth.orgId, "force_delete", "tenant", id, existing.name, {
      oldValue: { slug: existing.slug, plan: existing.plan },
    })

    // Hard delete (cascade)
    try {
      await hardDeleteTenant(id)
    } catch (deleteErr: any) {
      console.error(`[TENANT] Hard delete failed for "${existing.name}":`, deleteErr)
      return NextResponse.json(
        { error: `Deletion failed: ${deleteErr.message || "Unknown error"}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Tenant "${existing.name}" permanently deleted`,
      exportFilename,
    })
  } else {
    // Schedule deletion (30 day grace period)
    const deletionDate = await scheduleTenantDeletion(id)

    // Notify admin users (best-effort)
    try {
      const adminUsers = await prisma.user.findMany({
        where: { organizationId: id, role: "admin" },
        select: { email: true },
      })
      const emailData = getDeletionScheduledEmail({
        companyName: existing.name,
        deletionDate: deletionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        adminUrl: `https://app.leaddrivecrm.org/admin/tenants/${id}`,
      })
      for (const u of adminUsers) {
        await sendEmail({ to: u.email, subject: emailData.subject, html: emailData.html }).catch(() => {})
      }
    } catch {}

    logAudit(auth.orgId, "schedule_delete", "tenant", id, existing.name, {
      newValue: { deletionScheduledAt: deletionDate.toISOString() },
    })

    return NextResponse.json({
      success: true,
      message: `Tenant "${existing.name}" scheduled for deletion`,
      deletionScheduledAt: deletionDate.toISOString(),
    })
  }
}
