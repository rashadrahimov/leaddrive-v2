import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { sendEmail } from "@/lib/email"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const messages = await prisma.channelMessage.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    // Group by contactId for conversation threads
    const threads: Record<string, any> = {}
    for (const msg of messages) {
      const key = msg.contactId || msg.from
      if (!threads[key]) {
        threads[key] = {
          contactId: msg.contactId,
          contactName: msg.from,
          lastMessage: msg.body,
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
          messages: [],
        }
      }
      threads[key].messages.push(msg)
      if (msg.direction === "inbound" && msg.status !== "read") {
        threads[key].unreadCount++
      }
    }

    const conversations = Object.values(threads).sort(
      (a: any, b: any) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    )

    return NextResponse.json({
      success: true,
      data: { conversations, total: conversations.length },
    })
  } catch {
    return NextResponse.json({
      success: true,
      data: { conversations: [], total: 0 },
    })
  }
}

const sendMessageSchema = z.object({
  to: z.string().min(1),
  body: z.string().min(1),
  subject: z.string().optional(),
  contactId: z.string().optional(),
  channelConfigId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = sendMessageSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    // Send actual email via SMTP if subject is present (email message)
    let emailResult: any = null
    if (parsed.data.subject && parsed.data.to.includes("@")) {
      emailResult = await sendEmail({
        to: parsed.data.to,
        subject: parsed.data.subject,
        html: parsed.data.body.replace(/\n/g, "<br>"),
        organizationId: orgId,
        contactId: parsed.data.contactId,
      })
    }

    // Save to channel messages
    const message = await prisma.channelMessage.create({
      data: {
        organizationId: orgId,
        direction: "outbound",
        from: "system",
        ...parsed.data,
        status: emailResult?.success ? "delivered" : emailResult ? "failed" : "delivered",
      },
    })

    if (emailResult && !emailResult.success) {
      return NextResponse.json({ success: false, error: emailResult.error || "Email send failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: message }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
