import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { sendSms } from "@/lib/sms"

const bodySchema = z.object({
  to: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const result = await sendSms({
    to: parsed.data.to,
    message: "LeadDrive SMS test. Reply STOP to unsubscribe.",
    organizationId: orgId,
  })

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || "SMS send failed" }, { status: 400 })
  }
  return NextResponse.json({ success: true, messageId: result.messageId })
}
