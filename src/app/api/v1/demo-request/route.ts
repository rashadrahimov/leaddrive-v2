import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name, company, email, phone, message } = body

    if (!name || !company || !email) {
      return NextResponse.json(
        { error: "Ad, şirkət və e-poçt tələb olunur" },
        { status: 400 }
      )
    }

    // Save to database as a lead or audit entry
    // For now, log the request
    console.log("[DEMO REQUEST]", { name, company, email, phone, message, timestamp: new Date().toISOString() })

    // TODO: Send email notification via SMTP when configured
    // await sendEmail({ to: "info@leaddrivecrm.org", subject: `Demo Request: ${company}`, body: ... })

    return NextResponse.json({ success: true, message: "Demo sorğusu qəbul edildi" })
  } catch {
    return NextResponse.json(
      { error: "Xəta baş verdi" },
      { status: 500 }
    )
  }
}
