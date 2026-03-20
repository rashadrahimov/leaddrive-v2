import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { processEnrollmentStep } from "@/lib/journey-engine"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { journeyId, leadId, contactId } = body

  if (!journeyId) {
    return NextResponse.json({ error: "journeyId is required" }, { status: 400 })
  }
  if (!leadId && !contactId) {
    return NextResponse.json({ error: "leadId or contactId is required" }, { status: 400 })
  }

  try {
    // Check journey exists and is active
    const journey = await prisma.journey.findFirst({
      where: { id: journeyId, organizationId: orgId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    if (!journey) {
      return NextResponse.json({ error: "Journey not found" }, { status: 404 })
    }

    if (journey.steps.length === 0) {
      return NextResponse.json({ error: "Journey has no steps" }, { status: 400 })
    }

    // Check if already enrolled
    const existing = await prisma.journeyEnrollment.findFirst({
      where: {
        organizationId: orgId,
        journeyId,
        ...(leadId ? { leadId } : { contactId }),
        status: "active",
      },
    })

    if (existing) {
      return NextResponse.json({ error: "Already enrolled in this journey" }, { status: 409 })
    }

    const firstStep = journey.steps[0]

    // Create enrollment
    const enrollment = await prisma.journeyEnrollment.create({
      data: {
        organizationId: orgId,
        journeyId,
        leadId: leadId || null,
        contactId: contactId || null,
        currentStepId: firstStep.id,
        status: "active",
        nextActionAt: new Date(),
      },
    })

    // Increment journey entry count
    await prisma.journey.update({
      where: { id: journeyId },
      data: {
        entryCount: { increment: 1 },
        activeCount: { increment: 1 },
      },
    })

    // Increment step stats
    await prisma.journeyStep.update({
      where: { id: firstStep.id },
      data: { statsEntered: { increment: 1 } },
    })

    // Process the first step immediately
    const result = await processEnrollmentStep(enrollment.id, orgId)

    return NextResponse.json({
      success: true,
      data: {
        enrollment,
        stepResult: result,
      },
    }, { status: 201 })
  } catch (e: any) {
    console.error("[Journey Enroll Error]", e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}

// GET — list enrollments for a journey
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const journeyId = searchParams.get("journeyId")

  const where: any = { organizationId: orgId }
  if (journeyId) where.journeyId = journeyId

  const enrollments = await prisma.journeyEnrollment.findMany({
    where,
    orderBy: { enrolledAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ success: true, data: enrollments })
}
