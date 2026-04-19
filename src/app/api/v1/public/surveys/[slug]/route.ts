import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"

function cors(origin?: string | null) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(req.headers.get("origin")) })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const headers = cors(req.headers.get("origin"))
  const survey = await prisma.survey.findUnique({
    where: { publicSlug: slug },
    include: { organization: { select: { name: true, branding: true } } },
  })
  if (!survey || survey.status !== "active") {
    return NextResponse.json({ error: "Survey not available" }, { status: 404, headers })
  }

  // Optionally return the caller's prior response so the client can pre-fill
  // and offer "edit" instead of a cold form. Matched by ?e=email or ?p=phone.
  const url = new URL(req.url)
  const lookupEmail = (url.searchParams.get("e") || "").toLowerCase().trim() || null
  const lookupPhone = url.searchParams.get("p") || null
  let priorResponse: { id: string; score: number | null; comment: string | null; completedAt: Date } | null = null
  if (lookupEmail || lookupPhone) {
    const or: any[] = []
    if (lookupEmail) or.push({ email: lookupEmail })
    if (lookupPhone) or.push({ phone: lookupPhone })
    priorResponse = await prisma.surveyResponse.findFirst({
      where: { surveyId: survey.id, OR: or },
      orderBy: { completedAt: "desc" },
      select: { id: true, score: true, comment: true, completedAt: true },
    })
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        id: survey.id,
        name: survey.name,
        description: survey.description,
        type: survey.type,
        questions: survey.questions,
        thankYouText: survey.thankYouText,
        organizationName: survey.organization.name,
        priorResponse,
      },
    },
    { headers },
  )
}

const submitSchema = z.object({
  score: z.number().int().min(0).max(10).optional(),
  answers: z.record(z.string(), z.any()).optional(),
  comment: z.string().max(2000).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  contactId: z.string().optional(),
  ticketId: z.string().optional(),
  channel: z.string().max(30).optional(),
})

function npsCategory(score: number | undefined): string | null {
  if (score == null) return null
  if (score >= 9) return "promoter"
  if (score >= 7) return "passive"
  return "detractor"
}

function csatCategory(score: number | undefined): string | null {
  if (score == null) return null
  // 1-5 scale: 4-5 satisfied, 3 neutral, 1-2 dissatisfied
  if (score >= 4) return "satisfied"
  if (score === 3) return "neutral"
  return "dissatisfied"
}

function cesCategory(score: number | undefined): string | null {
  if (score == null) return null
  // 1-7 scale: 5-7 easy, 3-4 neutral, 1-2 difficult
  if (score >= 5) return "easy"
  if (score >= 3) return "neutral"
  return "difficult"
}

function computeCategory(type: string, score: number | undefined): string | null {
  switch (type) {
    case "nps": return npsCategory(score)
    case "csat": return csatCategory(score)
    case "ces": return cesCategory(score)
    default: return null
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const headers = cors(req.headers.get("origin"))
  const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

  // Uses the shared sliding-window helper (bounded LRU, cleaned every 60s).
  if (!checkRateLimit(`survey-submit:${ipAddress}`, { maxRequests: 10, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429, headers })
  }

  const body = await req.json().catch(() => null)
  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400, headers })

  const survey = await prisma.survey.findUnique({ where: { publicSlug: slug } })
  if (!survey || survey.status !== "active") {
    return NextResponse.json({ error: "Survey not available" }, { status: 404, headers })
  }

  const category = computeCategory(survey.type, parsed.data.score)

  // If the same email/phone already responded within 30 days, UPDATE that
  // response instead of creating a new one — lets recipients revise their
  // answer by reopening the same link from a different channel (SMS after
  // WhatsApp, etc.). Outside the window a brand-new response is recorded.
  let existing: { id: string } | null = null
  if (parsed.data.email || parsed.data.phone) {
    const cutoff = new Date(Date.now() - 30 * 86400 * 1000)
    const orClauses: any[] = []
    if (parsed.data.email) orClauses.push({ email: parsed.data.email })
    if (parsed.data.phone) orClauses.push({ phone: parsed.data.phone })
    if (orClauses.length > 0) {
      existing = await prisma.surveyResponse.findFirst({
        where: { surveyId: survey.id, completedAt: { gt: cutoff }, OR: orClauses },
        orderBy: { completedAt: "desc" },
        select: { id: true },
      })
    }
  }

  if (existing) {
    const updated = await prisma.surveyResponse.update({
      where: { id: existing.id },
      data: {
        score: parsed.data.score,
        category,
        answers: parsed.data.answers || {},
        comment: parsed.data.comment,
        completedAt: new Date(),
        commentSentiment: null, // will be re-classified below
      },
    })
    if (parsed.data.comment && parsed.data.comment.trim().length >= 3) {
      ;(async () => {
        try {
          const { classifySentiment } = await import("@/lib/sentiment")
          const s = await classifySentiment(parsed.data.comment as string)
          await prisma.surveyResponse.update({ where: { id: updated.id }, data: { commentSentiment: s } })
        } catch {}
      })()
    }
    return NextResponse.json({ success: true, data: { id: updated.id, edited: true } }, { headers })
  }

  const response = await prisma.surveyResponse.create({
    data: {
      organizationId: survey.organizationId,
      surveyId: survey.id,
      score: parsed.data.score,
      category,
      answers: parsed.data.answers || {},
      comment: parsed.data.comment,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      contactId: parsed.data.contactId || null,
      ticketId: parsed.data.ticketId || null,
      channel: parsed.data.channel || "link",
      ipAddress,
    },
  })

  // Classify free-text comment in the background — don't block the user's
  // submit-response round-trip. Skips when no comment.
  if (parsed.data.comment && parsed.data.comment.trim().length >= 3) {
    ;(async () => {
      try {
        const { classifySentiment } = await import("@/lib/sentiment")
        const s = await classifySentiment(parsed.data.comment as string)
        await prisma.surveyResponse.update({ where: { id: response.id }, data: { commentSentiment: s } })
      } catch (e) {
        console.error("[surveys] comment sentiment failed:", e)
      }
    })()
  }

  // Detractor alert — email every admin/manager/support so a low NPS score
  // never goes unnoticed. Fire-and-forget; SMTP latency stays off the
  // visitor's response path.
  if (category === "detractor") {
    ;(async () => {
      try {
        const recipients = await prisma.user.findMany({
          where: { organizationId: survey.organizationId, role: { in: ["admin", "manager", "support", "superadmin"] } },
          select: { email: true },
        })
        if (recipients.length === 0) return
        const { sendEmail } = await import("@/lib/email")
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""
        const surveyLink = `${appUrl.replace(/\/$/, "")}/surveys/${survey.id}`
        const subject = `🔴 Detractor response on "${survey.name}"`
        const html = `
<!doctype html><html><body style="font-family:system-ui,Segoe UI,Arial;margin:0;padding:24px;background:#f5f5f5;color:#111">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border-left:4px solid #ef4444">
    <h2 style="margin:0 0 8px;color:#ef4444">Detractor alert</h2>
    <p style="color:#555;margin:0 0 16px">A respondent gave a low NPS score on <b>${survey.name}</b>.</p>
    <table style="width:100%;font-size:13px;border-collapse:collapse">
      <tr><td style="color:#888;padding:4px 0">Score</td><td style="text-align:right"><b>${parsed.data.score ?? "—"}</b></td></tr>
      <tr><td style="color:#888;padding:4px 0">Email</td><td style="text-align:right">${parsed.data.email || "—"}</td></tr>
      ${parsed.data.comment ? `<tr><td style="color:#888;padding:4px 0;vertical-align:top">Comment</td><td style="text-align:right;padding-left:8px">${parsed.data.comment.replace(/[<>&]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] as string)}</td></tr>` : ""}
    </table>
    <p style="margin:20px 0 0"><a href="${surveyLink}" style="background:#0176D3;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:500">Open survey</a></p>
  </div>
</body></html>`
        for (const u of recipients) {
          if (!u.email) continue
          await sendEmail({ to: u.email, subject, html, organizationId: survey.organizationId }).catch(() => {})
        }
      } catch (e) {
        console.error("[surveys] detractor alert failed:", e)
      }
    })()
  }

  await prisma.survey.update({
    where: { id: survey.id },
    data: { totalResponses: { increment: 1 } },
  })

  return NextResponse.json(
    { success: true, data: { id: response.id, thankYouText: survey.thankYouText } },
    { headers },
  )
}
