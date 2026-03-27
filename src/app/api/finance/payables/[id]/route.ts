import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — single bill
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const bill = await prisma.bill.findFirst({
    where: { id, organizationId: orgId },
    include: { payments: true, vendor: { select: { id: true, name: true } } },
  })
  if (!bill) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ data: bill })
}

// PUT — update bill
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  const body = await req.json()
  const { billNumber, vendorName, vendorId, title, totalAmount, currency, issueDate, dueDate, category, notes, status } = body

  const bill = await prisma.bill.update({
    where: { id },
    data: {
      ...(billNumber !== undefined && { billNumber }),
      ...(vendorName !== undefined && { vendorName }),
      ...(vendorId !== undefined && { vendorId }),
      ...(title !== undefined && { title }),
      ...(totalAmount !== undefined && { totalAmount: parseFloat(totalAmount), balanceDue: parseFloat(totalAmount) }),
      ...(currency !== undefined && { currency }),
      ...(issueDate !== undefined && { issueDate: new Date(issueDate) }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(category !== undefined && { category }),
      ...(notes !== undefined && { notes }),
      ...(status !== undefined && { status }),
    },
  })

  return NextResponse.json({ data: bill })
}

// DELETE — delete bill
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  await prisma.bill.delete({ where: { id } })
  return NextResponse.json({ data: { success: true } })
}
