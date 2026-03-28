import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"

const createPlanRequestSchema = z.object({
  requestedPlan: z.enum(["starter", "business", "professional", "enterprise"]),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email(),
  contactPhone: z.string().max(50).optional(),
  message: z.string().max(2000).optional(),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createPlanRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, plan: true },
    })

    const planRequest = await prisma.planRequest.create({
      data: {
        organizationId: orgId,
        ...parsed.data,
      },
    })

    logAudit(orgId, "create", "planRequest", planRequest.id, `Plan request: ${parsed.data.requestedPlan}`)

    // Send email notification to admin
    const planNames: Record<string, string> = {
      starter: "Starter (9 AZN/mo)",
      business: "Business (29 AZN/mo)",
      professional: "Professional (59 AZN/mo)",
      enterprise: "Enterprise (99 AZN/mo)",
    }

    await sendEmail({
      to: "rashadrahimsoy@gmail.com",
      subject: `[LeadDrive] New plan request: ${planNames[parsed.data.requestedPlan]}`,
      html: `
        <h2>New Plan Subscription Request</h2>
        <table style="border-collapse:collapse;width:100%;max-width:500px;">
          <tr><td style="padding:8px;font-weight:bold;">Organization:</td><td style="padding:8px;">${org?.name || "Unknown"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Current Plan:</td><td style="padding:8px;">${org?.plan || "N/A"}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Requested Plan:</td><td style="padding:8px;">${planNames[parsed.data.requestedPlan]}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Contact Name:</td><td style="padding:8px;">${parsed.data.contactName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold;">Contact Email:</td><td style="padding:8px;">${parsed.data.contactEmail}</td></tr>
          ${parsed.data.contactPhone ? `<tr><td style="padding:8px;font-weight:bold;">Phone:</td><td style="padding:8px;">${parsed.data.contactPhone}</td></tr>` : ""}
          ${parsed.data.message ? `<tr><td style="padding:8px;font-weight:bold;">Message:</td><td style="padding:8px;">${parsed.data.message}</td></tr>` : ""}
        </table>
        <p style="margin-top:20px;color:#666;">This request was sent from LeadDrive CRM billing page.</p>
      `,
      organizationId: orgId,
    })

    return NextResponse.json({ success: true, data: planRequest }, { status: 201 })
  } catch (e) {
    console.error("Plan request error:", e)
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const requests = await prisma.planRequest.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ success: true, data: requests })
  } catch (e) {
    console.error("Plan requests GET error:", e)
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
