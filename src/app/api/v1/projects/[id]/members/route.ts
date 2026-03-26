import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const memberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["manager", "member", "viewer"]).optional(),
  hourlyRate: z.number().optional(),
})

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params

  try {
    const members = await prisma.projectMember.findMany({
      where: { projectId, organizationId: orgId },
    })
    return NextResponse.json({ success: true, data: members })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function POST(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const body = await req.json()
  const parsed = memberSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const member = await prisma.projectMember.create({
      data: {
        organizationId: orgId,
        projectId,
        ...parsed.data,
      },
    })
    return NextResponse.json({ success: true, data: member }, { status: 201 })
  } catch (e) {
    if (String(e).includes("Unique constraint")) {
      return NextResponse.json({ error: "User is already a member" }, { status: 409 })
    }
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, props: RouteParams) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: projectId } = await props.params
  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("memberId")

  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 })
  }

  try {
    await prisma.projectMember.delete({
      where: { id: memberId, projectId, organizationId: orgId },
    })
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
