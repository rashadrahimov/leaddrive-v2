import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { sendWhatsAppMessage } from "@/lib/whatsapp"

const testSchema = z.object({
  to: z.string().min(1, "Phone number is required"),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = testSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const result = await sendWhatsAppMessage({
    to: parsed.data.to,
    message: "Тестовое сообщение от LeadDrive CRM. WhatsApp интеграция работает!",
    organizationId: orgId,
  })

  return NextResponse.json(result, { status: result.success ? 200 : 400 })
}
