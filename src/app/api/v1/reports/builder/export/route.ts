import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { executeReport } from "@/lib/report-engine"
import ExcelJS from "exceljs"

const exportSchema = z.object({
  entityType: z.string().min(1).max(100),
  columns: z.any(),
  filters: z.any().default([]),
  groupBy: z.string().max(100).optional().nullable(),
  sortBy: z.string().max(100).optional().nullable(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  format: z.enum(["csv", "xlsx"]),
})

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let config
  try {
    config = exportSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  let result: { rows: Record<string, any>[]; columns: string[] }
  try {
    result = await executeReport(orgId, config)
  } catch (e: any) {
    console.error("Report export error:", e)
    return NextResponse.json({ error: e.message || "Report execution failed" }, { status: 500 })
  }

  const { rows, columns } = result
  const filename = `report-${config.entityType}-${Date.now()}`

  if (config.format === "csv") {
    const escapeCsv = (val: any): string => {
      if (val === null || val === undefined) return ""
      const str = String(val)
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const headerLine = columns.map(escapeCsv).join(",")
    const dataLines = rows.map((row) => columns.map((col) => escapeCsv(row[col])).join(","))
    const csv = [headerLine, ...dataLines].join("\n")

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    })
  }

  // XLSX export
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet("Report")

  sheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: 20,
  }))

  for (const row of rows) {
    const rowData: Record<string, any> = {}
    for (const col of columns) {
      rowData[col] = row[col] ?? ""
    }
    sheet.addRow(rowData)
  }

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.commit()

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  })
}
