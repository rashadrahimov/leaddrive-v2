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
      return NextResponse.json({ error: "Invalid data: " + e.issues.map((i: any) => i.message).join(", "), details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { type, amount, description } = data

  const txAmount = parseFloat(String(amount))

  // Validate withdrawal doesn't exceed fund balance
  if (type === "withdrawal" || type === "transfer_out") {
    const fund = await prisma.fund.findFirst({ where: { id: fundId, organizationId: orgId } })
    if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 })
    if (txAmount > fund.currentBalance) {
      return NextResponse.json({
        error: `Недостаточно средств в фонде. Баланс: ${fund.currentBalance.toLocaleString("ru-RU")} ${fund.currency}, запрошено: ${txAmount.toLocaleString("ru-RU")} ${fund.currency}`,
      }, { status: 400 })
    }
  }

  // Warn (in response) if deposit makes total funds exceed cash balance
  let warning: string | undefined
  if (type === "deposit" || type === "transfer_in" || type === "auto_allocation") {
    const [allFunds, cashFlowEntries] = await Promise.all([
      prisma.fund.findMany({ where: { organizationId: orgId, isActive: true }, select: { currentBalance: true } }),
      prisma.cashFlowEntry.findMany({ where: { organizationId: orgId }, select: { entryType: true, amount: true } }),
    ])
    const totalFunds = allFunds.reduce((s: number, f: any) => s + f.currentBalance, 0) + txAmount
    const totalInflows = cashFlowEntries.filter((e: any) => e.entryType === "inflow").reduce((s: number, e: any) => s + e.amount, 0)
    const totalOutflows = cashFlowEntries.filter((e: any) => e.entryType === "outflow").reduce((s: number, e: any) => s + e.amount, 0)
    const cashBalance = totalInflows - totalOutflows
    if (totalFunds > cashBalance && cashBalance > 0) {
      const coverage = Math.round((cashBalance / totalFunds) * 100)
      warning = `Внимание: после пополнения фонды (${totalFunds.toLocaleString("ru-RU")} AZN) превысят остаток ДС (${cashBalance.toLocaleString("ru-RU")} AZN). Обеспеченность: ${coverage}%`
    }
  }

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

  return NextResponse.json({ data: transaction, ...(warning ? { warning } : {}) }, { status: 201 })
}
