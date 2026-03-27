import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

// GET — list all bills
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const status = req.nextUrl.searchParams.get("status")

  const bills = await prisma.bill.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status } : {}),
    },
    include: { payments: true, vendor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: bills })
}

// POST — create a bill
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { billNumber, vendorName, vendorId, title, totalAmount, currency, issueDate, dueDate, category, notes } = body

  if (!billNumber || !vendorName || !title || !totalAmount) {
    return NextResponse.json({ error: "billNumber, vendorName, title, totalAmount required" }, { status: 400 })
  }

  const bill = await prisma.bill.create({
    data: {
      organizationId: orgId,
      billNumber,
      vendorName,
      vendorId: vendorId || null,
      title,
      status: "pending",
      totalAmount: parseFloat(totalAmount),
      balanceDue: parseFloat(totalAmount),
      currency: currency || "AZN",
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ data: bill }, { status: 201 })
}
