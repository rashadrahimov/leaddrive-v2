import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { sendWhatsAppMessage, sendWhatsAppTemplate } from "@/lib/whatsapp"

const sendSchema = z.object({
  to: z.string().min(1, "Phone number is required"),
  message: z.string().optional(),
  templateName: z.string().optional(),
  languageCode: z.string().optional(),
  variables: z.union([
    z.array(z.string()),
    z.record(z.string(), z.string()),
  ]).optional(),
  contactId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = sendSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const { to, message, templateName, languageCode, variables, contactId } = parsed.data

  if (templateName) {
    const result = await sendWhatsAppTemplate({
      to,
      templateName,
      languageCode,
      variables,
      organizationId: orgId,
      contactId,
    })
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  }

  if (!message) {
    return NextResponse.json({ error: "Message or templateName is required" }, { status: 400 })
  }

  const result = await sendWhatsAppMessage({
    to,
    message,
    organizationId: orgId,
    contactId,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
