import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const createTransactionSchema = z.object({
  type: z.enum(["deposit", "withdrawal", "transfer_in", "transfer_out", "auto_allocation"]),
  amount: z.union([z.string().min(1), z.number().min(0).max(999999999)]),
  description: z.string().max(500).optional().nullable(),
}).strict()

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

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = createTransactionSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { type, amount, description } = data

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
