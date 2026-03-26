import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSession, isAuthError } from "@/lib/api-auth"

// GET — list department owners for the org
export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { orgId } = session

  const owners = await prisma.budgetDepartmentOwner.findMany({
    where: { organizationId: orgId },
    include: {
      budgetDept: { select: { id: true, key: true, label: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(owners)
}

// POST — assign a user as department owner
export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Only admin can manage department owners
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Only admin/manager can manage department owners" }, { status: 403 })
  }

  const body = await req.json()
  const { departmentId, userId, canEdit, canApprove } = body

  if (!departmentId || !userId) {
    return NextResponse.json({ error: "departmentId and userId are required" }, { status: 400 })
  }

  const owner = await prisma.budgetDepartmentOwner.upsert({
    where: {
      organizationId_departmentId_userId: {
        organizationId: session.orgId,
        departmentId,
        userId,
      },
    },
    update: {
      canEdit: canEdit ?? true,
      canApprove: canApprove ?? false,
    },
    create: {
      organizationId: session.orgId,
      departmentId,
      userId,
      canEdit: canEdit ?? true,
      canApprove: canApprove ?? false,
    },
    include: {
      budgetDept: { select: { id: true, key: true, label: true } },
      user: { select: { id: true, name: true, email: true, role: true } },
    },
  })

  return NextResponse.json(owner, { status: 201 })
}

// DELETE — remove department owner assignment
export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json({ error: "Only admin/manager can manage department owners" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 })
  }

  await prisma.budgetDepartmentOwner.deleteMany({
    where: { id, organizationId: session.orgId },
  })

  return NextResponse.json({ success: true })
}
