import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"

const WebLeadSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().optional(),
  message: z.string().max(2000).optional(),
  source: z.string().default("web_form"),
  org_slug: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = WebLeadSchema.parse(body)

    // Look up organization by slug (name match)
    const org = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: data.org_slug },
          { name: { contains: data.org_slug, mode: "insensitive" } },
        ],
      },
    })

    if (!org) {
      return NextResponse.json({ success: false, error: "Organization not found" }, { status: 404 })
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        contactName: data.name,
        email: data.email,
        phone: data.phone,
        companyName: data.company,
        source: data.source,
        status: "new",
        priority: "medium",
        notes: data.message,
      },
    })

    return NextResponse.json({
      success: true,
      data: { id: lead.id, name: data.name, email: data.email, status: "new", message: "Lead submitted successfully" },
    }, {
      status: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: error.issues.map(i => ({ field: i.path.join("."), message: i.message })),
      }, { status: 400 })
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  })
}
