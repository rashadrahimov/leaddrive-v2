import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  const transactions = await prisma.fundTransaction.findMany({
    where: { fundId, organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return NextResponse.json({ data: transactions })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id: fundId } = await params

  const body = await req.json()
  const { type, amount, description } = body

  if (!type || !amount) return NextResponse.json({ error: "type and amount required" }, { status: 400 })

  const txAmount = parseFloat(amount)

  const transaction = await prisma.fundTransaction.create({
    data: {
      organizationId: orgId,
      fundId,
      type,
      amount: txAmount,
      description: description || null,
      relatedType: "manual",
    },
  })

  // Update fund balance
  const balanceChange = type === "deposit" || type === "transfer_in" || type === "auto_allocation"
    ? txAmount
    : -txAmount

  await prisma.fund.update({
    where: { id: fundId },
    data: { currentBalance: { increment: balanceChange } },
  })

  return NextResponse.json({ data: transaction }, { status: 201 })
}
