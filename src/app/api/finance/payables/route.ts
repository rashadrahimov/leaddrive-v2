import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const billSchema = z.object({
  billNumber: z.string().max(50).optional(),
  vendorName: z.string().min(1).max(200),
  vendorId: z.string().max(100).nullish(),
  title: z.string().min(1).max(300),
  totalAmount: z.number().min(0).max(999999999),
  currency: z.string().max(10).default("AZN"),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  category: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
})

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

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = billSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 })
  }
  const { billNumber, vendorName, vendorId, title, totalAmount, currency, issueDate, dueDate, category, notes } = parsed.data

  const bill = await prisma.bill.create({
    data: {
      organizationId: orgId,
      billNumber: billNumber || undefined,
      vendorName,
      vendorId: vendorId || null,
      title,
      status: "pending",
      totalAmount,
      balanceDue: totalAmount,
      currency,
      issueDate: issueDate ? new Date(issueDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      category: category || null,
      notes: notes || null,
    },
  })

  return NextResponse.json({ data: bill }, { status: 201 })
}
