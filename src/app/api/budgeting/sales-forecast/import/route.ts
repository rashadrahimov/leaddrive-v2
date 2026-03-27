import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import ExcelJS from "exceljs"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const year = Number(formData.get("year") || new Date().getFullYear())

  if (!file) {
    return NextResponse.json({ error: "file required" }, { status: 400 })
  }

  // Load departments for this org (revenue-generating)
  const departments = await prisma.budgetDepartment.findMany({
    where: { organizationId: orgId, hasRevenue: true, isActive: true },
    orderBy: { sortOrder: "asc" },
  })

  // Build label → id map (case-insensitive, trimmed)
  const labelToId: Record<string, string> = {}
  for (const d of departments) {
    labelToId[d.label.trim().toLowerCase()] = d.id
  }

  const arrayBuffer = await file.arrayBuffer()
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(Buffer.from(arrayBuffer))

  const ws = wb.worksheets[0]
  if (!ws) {
    return NextResponse.json({ error: "Empty workbook" }, { status: 400 })
  }

  const entries: Array<{ departmentId: string; month: number; amount: number }> = []

  // Skip header row (row 1), read data rows
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const label = String(row.getCell(1).value || "").trim().toLowerCase()
    if (label === "итого" || label === "total" || !label) return // skip total row

    const deptId = labelToId[label]
    if (!deptId) return // unknown department — skip

    for (let col = 2; col <= 13; col++) {
      const month = col - 1
      const cellValue = row.getCell(col).value
      const amount = Number(cellValue) || 0
      entries.push({ departmentId: deptId, month, amount })
    }
  })

  if (entries.length === 0) {
    return NextResponse.json({ error: "No valid data found in file" }, { status: 400 })
  }

  // Upsert all entries
  const results = await prisma.$transaction(
    entries.map((e) =>
      prisma.salesForecast.upsert({
        where: {
          organizationId_departmentId_year_month: {
            organizationId: orgId,
            departmentId: e.departmentId,
            year,
            month: e.month,
          },
        },
        update: { amount: e.amount },
        create: {
          organizationId: orgId,
          departmentId: e.departmentId,
          year,
          month: e.month,
          amount: e.amount,
        },
      })
    )
  )

  return NextResponse.json({ success: true, count: results.length })
}
