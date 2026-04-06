import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

// PATCH — pause, resume, cancel enrollment
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const { action } = await req.json()
  if (!["pause", "resume", "cancel"].includes(action)) {
    return NextResponse.json({ error: "Invalid action. Use: pause, resume, cancel" }, { status: 400 })
  }

  try {
    const enrollment = await prisma.journeyEnrollment.findFirst({
      where: { id, organizationId: orgId },
    })
    if (!enrollment) {
      return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })
    }

    switch (action) {
      case "pause":
        await prisma.journeyEnrollment.update({
          where: { id },
          data: { status: "paused", nextActionAt: null },
        })
        break
      case "resume":
        await prisma.journeyEnrollment.update({
          where: { id },
          data: { status: "active", nextActionAt: new Date() },
        })
        break
      case "cancel":
        await prisma.journeyEnrollment.update({
          where: { id },
          data: { status: "completed", exitReason: "manual", completedAt: new Date() },
        })
        await prisma.journey.update({
          where: { id: enrollment.journeyId },
          data: { activeCount: { decrement: 1 }, completedCount: { increment: 1 } },
        })
        break
    }

    return NextResponse.json({ success: true, action })
  } catch (e) {
    console.error("Enrollment PATCH error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
