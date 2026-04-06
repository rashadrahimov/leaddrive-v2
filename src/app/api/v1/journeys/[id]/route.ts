import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const stepSchema = z.object({
  stepType: z.string(),
  stepOrder: z.number().int(),
  config: z.any().default({}),
})

const updateJourneySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "paused", "completed"]).optional(),
  triggerType: z.string().optional(),
  triggerConditions: z.any().optional(),
  steps: z.array(stepSchema).optional(),
  // Goal tracking
  goalType: z.string().nullable().optional(),
  goalConditions: z.any().nullable().optional(),
  goalTarget: z.number().int().nullable().optional(),
  exitOnGoal: z.boolean().optional(),
  maxEnrollmentDays: z.number().int().nullable().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const journey = await prisma.journey.findFirst({
      where: { id, organizationId: orgId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })
    if (!journey) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: journey })
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const body = await req.json()
  const parsed = updateJourneySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  try {
    const { steps, ...journeyData } = parsed.data
    const result = await prisma.journey.updateMany({
      where: { id, organizationId: orgId },
      data: journeyData,
    })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Update steps if provided
    if (steps !== undefined) {
      // Delete existing steps
      await prisma.journeyStep.deleteMany({ where: { journeyId: id } })
      // Create new steps
      if (steps.length > 0) {
        await prisma.journeyStep.createMany({
          data: steps.map(s => ({
            journeyId: id,
            stepType: s.stepType,
            stepOrder: s.stepOrder,
            config: s.config || {},
          })),
        })
      }
    }

    const updated = await prisma.journey.findFirst({
      where: { id, organizationId: orgId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const result = await prisma.journey.deleteMany({ where: { id, organizationId: orgId } })
    if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ success: true, data: { deleted: id } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
