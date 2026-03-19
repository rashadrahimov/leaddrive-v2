import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

function getGrade(score: number): string {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  if (score >= 20) return "D"
  return "F"
}

function scoreLead(lead: any): { score: number; factors: Record<string, number>; conversionProb: number } {
  const factors: Record<string, number> = {}
  let score = 0

  // Has email (+15)
  if (lead.email) { factors.email = 15; score += 15 }
  // Has phone (+10)
  if (lead.phone) { factors.phone = 10; score += 10 }
  // Has company (+10)
  if (lead.companyName) { factors.company = 10; score += 10 }
  // Source scoring
  if (lead.source === "referral") { factors.source = 20; score += 20 }
  else if (lead.source === "website") { factors.source = 15; score += 15 }
  else if (lead.source === "email") { factors.source = 10; score += 10 }
  else if (lead.source) { factors.source = 5; score += 5 }
  // Priority
  if (lead.priority === "high") { factors.priority = 15; score += 15 }
  else if (lead.priority === "medium") { factors.priority = 10; score += 10 }
  else { factors.priority = 5; score += 5 }
  // Has estimated value (+10)
  if (lead.estimatedValue && lead.estimatedValue > 0) { factors.value = 10; score += 10 }
  // Status
  if (lead.status === "qualified") { factors.status = 15; score += 15 }
  else if (lead.status === "contacted") { factors.status = 10; score += 10 }
  else if (lead.status === "converted") { factors.status = 20; score += 20 }
  else { factors.status = 0 }
  // Has notes (+5)
  if (lead.notes && lead.notes.length > 10) { factors.notes = 5; score += 5 }

  score = Math.min(score, 100)
  const conversionProb = Math.round(score * 0.85) // rough probability

  return { score, factors, conversionProb }
}

// GET — list leads with scores
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const leads = await prisma.lead.findMany({
    where: { organizationId: orgId },
    orderBy: { score: "desc" },
  })

  return NextResponse.json({
    success: true,
    data: {
      leads: leads.map(l => ({
        id: l.id,
        contactName: l.contactName,
        companyName: l.companyName,
        email: l.email,
        source: l.source,
        status: l.status,
        priority: l.priority,
        score: l.score,
        scoreDetails: l.scoreDetails,
        grade: getGrade(l.score),
        conversionProb: Math.round(l.score * 0.85),
        lastScoredAt: l.lastScoredAt,
        estimatedValue: l.estimatedValue,
      })),
      total: leads.length,
    },
  })
}

// POST — score all leads (or specific lead by id)
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const leadId = body.leadId as string | undefined

  const where: any = { organizationId: orgId }
  if (leadId) where.id = leadId

  const leads = await prisma.lead.findMany({ where })
  let scored = 0

  for (const lead of leads) {
    const { score, factors, conversionProb } = scoreLead(lead)
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        score,
        scoreDetails: { factors, conversionProb, grade: getGrade(score) },
        lastScoredAt: new Date(),
      },
    })
    scored++
  }

  return NextResponse.json({
    success: true,
    data: { scored },
  })
}
