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

  // Reject duplicate responses from the same email/phone within 6 hours
  if (parsed.data.email || parsed.data.phone) {
    const cutoff = new Date(Date.now() - 6 * 3600 * 1000)
    const orClauses: any[] = []
    if (parsed.data.email) orClauses.push({ email: parsed.data.email })
    if (parsed.data.phone) orClauses.push({ phone: parsed.data.phone })
    if (orClauses.length > 0) {
      const dup = await prisma.surveyResponse.findFirst({
        where: { surveyId: survey.id, completedAt: { gt: cutoff }, OR: orClauses },
        select: { id: true },
      })
      if (dup) {
        return NextResponse.json({ error: "You've already submitted this survey recently" }, { status: 409, headers })
      }
    }
  }

  const category = computeCategory(survey.type, parsed.data.score)

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

  await prisma.survey.update({
    where: { id: survey.id },
    data: { totalResponses: { increment: 1 } },
  })

  return NextResponse.json(
    { success: true, data: { id: response.id, thankYouText: survey.thankYouText } },
    { headers },
  )
}
