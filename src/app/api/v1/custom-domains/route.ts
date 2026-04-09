import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

const CNAME_TARGET = process.env.CNAME_TARGET || "pages.leaddrivecrm.org"

const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

const createDomainSchema = z.object({
  domain: z
    .string()
    .min(3)
    .max(253)
    .transform((v) => v.toLowerCase().trim())
    .refine((v) => domainRegex.test(v), { message: "Invalid domain format" })
    .refine((v) => {
      const appDomain = (process.env.NEXT_PUBLIC_APP_URL || "https://app.leaddrivecrm.org").replace(/^https?:\/\//, "").replace(/^[^.]+\./, "")
      return !v.endsWith(appDomain)
    }, {
      message: "Cannot use platform subdomains",
    }),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const domains = await prisma.customDomain.findMany({
      where: { organizationId: session.orgId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ domains })
  } catch (error) {
    console.error("Failed to list custom domains:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = createDomainSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { domain } = parsed.data

    // Check uniqueness
    const existing = await prisma.customDomain.findUnique({ where: { domain } })
    if (existing) {
      return NextResponse.json(
        { error: "This domain is already registered" },
        { status: 409 }
      )
    }

    const created = await prisma.customDomain.create({
      data: {
        organizationId: session.orgId,
        domain,
        status: "pending",
      },
    })

    return NextResponse.json({
      domain: created,
      cnameTarget: CNAME_TARGET,
      instructions: `Add a CNAME record for "${domain}" pointing to "${CNAME_TARGET}"`,
    }, { status: 201 })
  } catch (error) {
    console.error("Failed to create custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
