import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getOrCreateInvoiceChainJourney } from "@/lib/invoice-chain-template"
import { processEnrollmentStep } from "@/lib/journey-engine"

// GET /api/v1/invoices/[id]/chain
// Returns the chain journey (with steps) and active enrollment (if any)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      select: { chainJourneyId: true },
    })

    if (!invoice?.chainJourneyId) {
      return NextResponse.json({ success: true, data: null })
    }

    const journey = await prisma.journey.findUnique({
      where: { id: invoice.chainJourneyId },
      include: { steps: { orderBy: { stepOrder: "asc" } } },
    })

    const enrollment = await prisma.journeyEnrollment.findFirst({
      where: { invoiceId: id, organizationId: orgId, status: "active" },
    })

    return NextResponse.json({ success: true, data: { journey, enrollment: enrollment || null } })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/v1/invoices/[id]/chain
// action: "setup" — create/get the chain journey
// action: "start"  — start the chain (create enrollment)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => ({}))
  const action = body.action || "setup"

  try {
    if (action === "setup") {
      const journeyId = await getOrCreateInvoiceChainJourney(id, orgId)
      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      })
      return NextResponse.json({ success: true, data: { journey, enrollment: null } })
    }

    if (action === "start") {
      // Prevent duplicate active chains
      const existing = await prisma.journeyEnrollment.findFirst({
        where: { invoiceId: id, organizationId: orgId, status: "active" },
      })
      if (existing) {
        return NextResponse.json({ error: "Chain already active" }, { status: 409 })
      }

      const invoice = await prisma.invoice.findFirst({
        where: { id, organizationId: orgId },
        select: { chainJourneyId: true, contactId: true },
      })
      if (!invoice?.chainJourneyId) {
        return NextResponse.json({ error: "Chain not set up" }, { status: 400 })
      }

      const journey = await prisma.journey.findUnique({
        where: { id: invoice.chainJourneyId },
        include: { steps: { orderBy: { stepOrder: "asc" } } },
      })
      if (!journey || journey.steps.length === 0) {
        return NextResponse.json({ error: "Journey has no steps" }, { status: 400 })
      }

      const firstStep = journey.steps[0]

      const enrollment = await prisma.journeyEnrollment.create({
        data: {
          organizationId: orgId,
          journeyId: invoice.chainJourneyId,
          invoiceId: id,
          contactId: invoice.contactId ?? null,
          currentStepId: firstStep.id,
          status: "active",
          nextActionAt: new Date(),
        },
      })

      await prisma.journey.update({
        where: { id: invoice.chainJourneyId },
        data: { entryCount: { increment: 1 }, activeCount: { increment: 1 } },
      })
      await prisma.journeyStep.update({
        where: { id: firstStep.id },
        data: { statsEntered: { increment: 1 } },
      })

      // Process the first step immediately (usually a "wait" that sets nextActionAt)
      const stepResult = await processEnrollmentStep(enrollment.id, orgId)

      // Reload enrollment with updated nextActionAt
      const updatedEnrollment = await prisma.journeyEnrollment.findUnique({
        where: { id: enrollment.id },
      })

      return NextResponse.json({
        success: true,
        data: { enrollment: updatedEnrollment, stepResult },
      })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/v1/invoices/[id]/chain
// Stops the active chain enrollment
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const enrollment = await prisma.journeyEnrollment.findFirst({
      where: { invoiceId: id, organizationId: orgId, status: "active" },
    })
    if (!enrollment) {
      return NextResponse.json({ error: "No active chain" }, { status: 404 })
    }

    await prisma.journeyEnrollment.update({
      where: { id: enrollment.id },
      data: { status: "cancelled", completedAt: new Date() },
    })

    await prisma.journey.update({
      where: { id: enrollment.journeyId },
      data: { activeCount: { decrement: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
