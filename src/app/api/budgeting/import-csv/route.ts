import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma, logBudgetChange } from "@/lib/prisma"

// POST — import CSV data as budget actuals
// Accepts JSON array of rows: [{ category, department, amount, date, description, lineType }]
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { planId, rows, integrationId, fileName } = body

  if (!planId || !rows || !Array.isArray(rows)) {
    return NextResponse.json({ error: "planId and rows[] are required" }, { status: 400 })
  }

  // Create import record
  const importRecord = await prisma.accountingImport.create({
    data: {
      organizationId: orgId,
      planId,
      integrationId: integrationId || null,
      fileName: fileName || "manual-import.csv",
      importType: "csv",
      status: "processing",
      totalRows: rows.length,
    },
  })

  let matched = 0
  let unmatched = 0
  const errors: Array<{ row: number; error: string }> = []

  // Get category mapping if integration exists
  let categoryMapping: Record<string, string> = {}
  if (integrationId) {
    const integration = await prisma.accountingIntegration.findFirst({
      where: { id: integrationId, organizationId: orgId },
    })
    if (integration?.categoryMapping) {
      categoryMapping = integration.categoryMapping as Record<string, string>
    }
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    try {
      const rawCategory = row.category || row.Category || row.account || row.Account || ""
      const category = categoryMapping[rawCategory] || rawCategory

      if (!category) {
        unmatched++
        errors.push({ row: i + 1, error: "Missing category" })
        continue
      }

      const amount = parseFloat(row.amount || row.Amount || row.sum || row.Sum || "0")
      if (isNaN(amount) || amount === 0) {
        unmatched++
        errors.push({ row: i + 1, error: "Invalid amount" })
        continue
      }

      await prisma.budgetActual.create({
        data: {
          organizationId: orgId,
          planId,
          category,
          department: row.department || row.Department || null,
          lineType: row.lineType || row.type || "expense",
          actualAmount: Math.abs(amount),
          expenseDate: row.date || row.Date || null,
          description: row.description || row.Description || row.memo || null,
        },
      })
      matched++
    } catch (err: any) {
      unmatched++
      errors.push({ row: i + 1, error: err.message?.substring(0, 100) || "Unknown error" })
    }
  }

  // Update import record
  await prisma.accountingImport.update({
    where: { id: importRecord.id },
    data: {
      status: errors.length === rows.length ? "failed" : errors.length > 0 ? "completed" : "completed",
      matchedRows: matched,
      unmatchedRows: unmatched,
      errors: errors.length > 0 ? errors : undefined,
    },
  })

  // Update integration sync status
  if (integrationId) {
    await prisma.accountingIntegration.update({
      where: { id: integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: unmatched > 0 ? "partial" : "success",
        lastSyncError: errors.length > 0 ? `${unmatched} rows failed` : null,
      },
    })
  }

  logBudgetChange({
    orgId,
    planId,
    entityType: "import",
    entityId: importRecord.id,
    action: "create",
    snapshot: { matched, unmatched, total: rows.length },
  })

  return NextResponse.json({
    success: true,
    importId: importRecord.id,
    totalRows: rows.length,
    matchedRows: matched,
    unmatchedRows: unmatched,
    errors: errors.slice(0, 20), // limit errors in response
  })
}

// GET — list import history
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")

  const where: any = { organizationId: orgId }
  if (planId) where.planId = planId

  const imports = await prisma.accountingImport.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { integration: { select: { name: true, provider: true } } },
  })

  return NextResponse.json(imports)
}
