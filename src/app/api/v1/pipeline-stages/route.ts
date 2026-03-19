import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const stageSchema = z.object({
  name: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  probability: z.number().min(0).max(100).optional(),
  sortOrder: z.number().optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId: orgId },
      orderBy: { sortOrder: "asc" },
    })

    return NextResponse.json({ success: true, data: stages })
  } catch {
    // Fallback to default stages if DB not connected
    const defaultStages = [
      { id: "1", name: "LEAD", displayName: "Lead", color: "#6366f1", probability: 10, sortOrder: 1, isWon: false, isLost: false, organizationId: orgId },
      { id: "2", name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 2, isWon: false, isLost: false, organizationId: orgId },
      { id: "3", name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 3, isWon: false, isLost: false, organizationId: orgId },
      { id: "4", name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316", probability: 75, sortOrder: 4, isWon: false, isLost: false, organizationId: orgId },
      { id: "5", name: "WON", displayName: "Won", color: "#22c55e", probability: 100, sortOrder: 5, isWon: true, isLost: false, organizationId: orgId },
      { id: "6", name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 6, isWon: false, isLost: true, organizationId: orgId },
    ]
    return NextResponse.json({ success: true, data: defaultStages })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = req.headers.get("x-user-role")
  if (role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const body = await req.json()
  const parsed = stageSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const stage = await prisma.pipelineStage.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        displayName: parsed.data.displayName,
        color: parsed.data.color || "#6366f1",
        probability: parsed.data.probability || 0,
        sortOrder: parsed.data.sortOrder || 0,
        isWon: parsed.data.isWon || false,
        isLost: parsed.data.isLost || false,
      },
    })

    return NextResponse.json({ success: true, data: stage }, { status: 201 })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
