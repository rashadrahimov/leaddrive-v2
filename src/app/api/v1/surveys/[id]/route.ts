import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "read")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const survey = await prisma.survey.findFirst({ where: { id, organizationId: orgId } })
  if (!survey) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const responses = await prisma.surveyResponse.findMany({
    where: { surveyId: id },
    orderBy: { completedAt: "desc" },
    take: 500,
  })

  type R = { category: string | null; score: number | null }
  const total = responses.length
  const promoters = responses.filter((r: R) => r.category === "promoter").length
  const passives = responses.filter((r: R) => r.category === "passive").length
  const detractors = responses.filter((r: R) => r.category === "detractor").length
  const nps = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : null

  return NextResponse.json({
    success: true,
    data: {
      survey,
      responses,
      stats: { total, promoters, passives, detractors, nps },
    },
  })
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["draft", "active", "paused", "archived"]).optional(),
  thankYouText: z.string().max(500).optional(),
  questions: z.array(z.any()).optional(),
  channels: z.array(z.string()).optional(),
  triggers: z.record(z.string(), z.any()).optional(),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const existing = await prisma.survey.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const updated = await prisma.survey.update({
    where: { id },
    data: parsed.data as any,
  })
  logAudit(orgId, "update", "survey", id, updated.name)
  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "delete")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const existing = await prisma.survey.findFirst({ where: { id, organizationId: orgId } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.survey.delete({ where: { id } })
  logAudit(orgId, "delete", "survey", id, existing.name)
  return NextResponse.json({ success: true })
}
