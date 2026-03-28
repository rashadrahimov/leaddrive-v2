import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"

const expenseForecastSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  entries: z.array(z.object({
    costTypeId: z.string().min(1).max(100),
    departmentId: z.string().max(100).nullable().optional(),
    month: z.number().int().min(1).max(12),
    amount: z.number().min(0).max(999999999),
    notes: z.string().max(500).optional(),
  })).min(1).max(5000),
}).strict()

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const year = Number(req.nextUrl.searchParams.get("year") || new Date().getFullYear())
  if (isNaN(year) || year < 2020 || year > 2050) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 })
  }

  const entries = await prisma.expenseForecast.findMany({
    where: { organizationId: orgId, year },
    include: {
      budgetCostType: { select: { id: true, key: true, label: true, isShared: true } },
      budgetDept: { select: { id: true, key: true, label: true } },
    },
    orderBy: [{ budgetCostType: { sortOrder: "asc" } }, { month: "asc" }],
  })

  return NextResponse.json({ success: true, data: entries })
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = expenseForecastSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { year, entries } = data

  // Use findFirst + update/create to handle nullable departmentId
  let count = 0
  for (const e of entries) {
    if (!e.costTypeId || e.month < 1 || e.month > 12) continue

    const existing = await prisma.expenseForecast.findFirst({
      where: {
        organizationId: orgId,
        costTypeId: e.costTypeId,
        departmentId: e.departmentId ?? null,
        year,
        month: e.month,
      },
    })

    if (existing) {
      await prisma.expenseForecast.update({
        where: { id: existing.id },
        data: { amount: Number(e.amount) || 0, notes: e.notes || null },
      })
    } else {
      await prisma.expenseForecast.create({
        data: {
          organizationId: orgId,
          costTypeId: e.costTypeId,
          departmentId: e.departmentId || null,
          year,
          month: e.month,
          amount: Number(e.amount) || 0,
          notes: e.notes || null,
        },
      })
    }
    count++
  }

  return NextResponse.json({ success: true, count }, { status: 201 })
}
