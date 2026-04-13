import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSuperAdmin } from "@/lib/superadmin-guard"
import { provisionTenant, validateSlug, type TenantInput } from "@/lib/tenant-provisioning"
import { sendEmail } from "@/lib/email"
import { getWelcomeTenantEmail } from "@/lib/emails/welcome-tenant"
import { PLAN_LABELS, type TenantPlan } from "@/lib/tenant-plans"
import { createDnsRecord, isCloudflareConfigured } from "@/lib/cloudflare-dns"
import { logAudit } from "@/lib/prisma"
import { checkRateLimit, RATE_LIMIT_CONFIG } from "@/lib/rate-limit"
import { exec } from "child_process"
import path from "path"

// GET /api/v1/admin/tenants — List all tenants
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  const tenants = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          users: true,
          contacts: true,
          deals: true,
          companies: true,
          tickets: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    data: tenants.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      isActive: t.isActive,
      serverType: t.serverType,
      maxUsers: t.maxUsers,
      maxContacts: t.maxContacts,
      provisionedAt: t.provisionedAt,
      provisionedBy: t.provisionedBy,
      createdAt: t.createdAt,
      _count: t._count,
    })),
  })
}

// POST /api/v1/admin/tenants — Provision new tenant
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (auth instanceof NextResponse) return auth

  // Rate limit: max 10 tenants per hour
  const rateLimitKey = `tenant-provision:${auth.userId}`
  if (!checkRateLimit(rateLimitKey, { maxRequests: 10, windowMs: 3600000 })) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Max 10 tenants per hour." },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { companyName, slug, plan, adminName, adminEmail, branding, features, seedDemoData } = body

    // Validation
    if (!companyName || !slug || !adminName || !adminEmail) {
      return NextResponse.json(
        { error: "Required fields: companyName, slug, adminName, adminEmail" },
        { status: 400 }
      )
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 })
    }

    // Validate slug
    const slugCheck = await validateSlug(slug)
    if (!slugCheck.valid) {
      return NextResponse.json({ error: slugCheck.error }, { status: 400 })
    }

    // Validate plan
    const validPlans = ["starter", "professional", "enterprise"]
    if (plan && !validPlans.includes(plan)) {
      return NextResponse.json({ error: `Invalid plan. Must be: ${validPlans.join(", ")}` }, { status: 400 })
    }

    // Provision
    const input: TenantInput = {
      companyName,
      slug,
      plan: plan || "starter",
      adminName,
      adminEmail,
      branding,
      features,
      provisionedBy: auth.userId,
    }

    const result = await provisionTenant(input)

    // Create DNS record (best-effort)
    let dnsResult = null
    if (isCloudflareConfigured()) {
      try {
        dnsResult = await createDnsRecord(slug)
        if (!dnsResult.success) {
          console.error("[TENANT] DNS creation failed:", dnsResult.error)
        }
      } catch (dnsError) {
        console.error("[TENANT] DNS creation failed:", dnsError)
      }
    }

    // Send welcome email (best-effort, don't fail provisioning)
    let emailSent = false
    try {
      const planLabel = PLAN_LABELS[(result.organization.plan as TenantPlan)] || result.organization.plan
      const emailData = getWelcomeTenantEmail({
        companyName: result.organization.name,
        loginUrl: result.url,
        adminEmail: result.user.email,
        tempPassword: result.tempPassword,
        planName: planLabel,
      })
      await sendEmail({
        to: result.user.email,
        subject: emailData.subject,
        html: emailData.html,
      })
      emailSent = true
    } catch (emailError) {
      console.error("[TENANT] Welcome email failed:", emailError)
    }

    // Seed demo data (non-blocking, runs in background)
    let seedStarted = false
    if (seedDemoData) {
      try {
        const scriptPath = path.resolve(process.cwd(), "scripts/seed-tenant-demo.mjs")
        const password = result.tempPassword
        const cmd = `node "${scriptPath}" --slug=${slug} --password="${password}"`
        exec(cmd, { timeout: 300000 }, (err, stdout, stderr) => {
          if (err) {
            console.error(`[TENANT] Seed script error for ${slug}:`, err.message)
            if (stderr) console.error("[TENANT] Seed stderr:", stderr)
          } else {
            console.log(`[TENANT] Seed complete for ${slug}:\n${stdout}`)
          }
        })
        seedStarted = true
        console.log(`[TENANT] Seed script started for ${slug}`)
      } catch (seedError) {
        console.error("[TENANT] Failed to start seed script:", seedError)
      }
    }

    // Audit log
    logAudit(auth.orgId, "create", "tenant", result.organization.id, result.organization.name, {
      newValue: { slug, plan: plan || "starter", adminEmail, seedDemoData: !!seedDemoData },
    })

    return NextResponse.json({
      success: true,
      data: {
        organization: result.organization,
        user: { id: result.user.id, email: result.user.email, name: result.user.name },
        tempPassword: result.tempPassword,
        url: result.url,
        dnsCreated: dnsResult?.success || false,
        emailSent,
        seedStarted,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error("[TENANT] Provisioning error:", error)
    return NextResponse.json(
      { error: error.message || "Provisioning failed" },
      { status: 500 }
    )
  }
}
