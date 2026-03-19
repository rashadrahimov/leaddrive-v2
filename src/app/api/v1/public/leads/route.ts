import { NextResponse } from "next/server"
import { z } from "zod"

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

    // TODO: Rate limit per IP — 10 req/min
    // TODO: Look up organization by slug
    // TODO: Create lead in DB with org_id
    // TODO: Apply assignment rules (Task 1.12)
    // TODO: Send notification to assigned user

    // Stub response
    const leadId = `lead_${Date.now()}`

    return NextResponse.json({
      success: true,
      data: {
        id: leadId,
        name: data.name,
        email: data.email,
        status: "new",
        message: "Lead submitted successfully",
      },
    }, { status: 201 })
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
