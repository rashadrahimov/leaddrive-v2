import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

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

    console.log("[DEMO REQUEST]", { name, company, email, phone, message, timestamp: new Date().toISOString() })

    // Send email notification to admin
    await sendEmail({
      to: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@leaddrivecrm.org",
      subject: `Demo Request: ${company} — ${name}`,
      html: `
        <h2>New Demo Request</h2>
        <table style="border-collapse:collapse;">
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name:</td><td>${name}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Company:</td><td>${company}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email:</td><td>${email}</td></tr>
          ${phone ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Phone:</td><td>${phone}</td></tr>` : ""}
          ${message ? `<tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Message:</td><td>${message}</td></tr>` : ""}
        </table>
        <p style="color:#888;font-size:12px;">Sent at ${new Date().toISOString()}</p>
      `,
    }).catch(err => console.error("[DEMO REQUEST] Email send failed:", err))

    return NextResponse.json({ success: true, message: "Demo sorğusu qəbul edildi" })
  } catch {
    return NextResponse.json(
      { error: "Xəta baş verdi" },
      { status: 500 }
    )
  }
}
