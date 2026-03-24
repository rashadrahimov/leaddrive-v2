import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"
import { resolveCostModelKey } from "@/lib/budgeting/cost-model-map"
import ExcelJS from "exceljs"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const planId = req.nextUrl.searchParams.get("planId")
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 })

  const [plan, lines, actuals, costModel] = await Promise.all([
    prisma.budgetPlan.findFirst({ where: { id: planId, organizationId: orgId } }),
    prisma.budgetLine.findMany({ where: { planId, organizationId: orgId }, orderBy: { sortOrder: "asc" } }),
    prisma.budgetActual.findMany({ where: { planId, organizationId: orgId }, orderBy: { createdAt: "asc" } }),
    loadAndCompute(orgId).catch(() => null),
  ])

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  const wb = new ExcelJS.Workbook()
  wb.creator = "LeadDrive CRM"
  wb.created = new Date()

  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FFFFFFFF" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF6D28D9" } },
    alignment: { horizontal: "center" },
    border: { bottom: { style: "thin", color: { argb: "FF6D28D9" } } },
  }

  const currencyFmt = '#,##0" ₼"'

  // ── Sheet 1: Overview ─────────────────────────────────────────────────────
  const ws1 = wb.addWorksheet("Обзор")
  ws1.columns = [
    { header: "Показатель", key: "label", width: 28 },
    { header: "Значение", key: "value", width: 20 },
  ]
  ws1.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

  const totalPlanned = lines.reduce((s: number, l: { plannedAmount: number }) => s + l.plannedAmount, 0)
  const totalForecast = lines.reduce((s: number, l: { forecastAmount: number | null; plannedAmount: number }) => s + (l.forecastAmount ?? l.plannedAmount), 0)

  let autoActualTotal = 0
  if (costModel) {
    for (const line of lines) {
      if (line.isAutoActual && line.costModelKey) {
        autoActualTotal += resolveCostModelKey(costModel, line.costModelKey)
      }
    }
  }
  const manualActualTotal = actuals.reduce((s: number, a: { actualAmount: number }) => s + a.actualAmount, 0)
  const totalActual = autoActualTotal > 0 ? autoActualTotal : manualActualTotal
  const totalVariance = totalPlanned - totalActual
  const executionPct = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0

  const overviewRows = [
    ["Название плана", plan.name],
    ["Период", `${plan.year}${plan.month ? `-${String(plan.month).padStart(2, "0")}` : ""}`],
    ["Статус", plan.status],
    ["", ""],
    ["Бюджет (план)", totalPlanned],
    ["Прогноз", totalForecast],
    ["Факт", totalActual],
    ["Отклонение (план - факт)", totalVariance],
    ["Исполнение бюджета %", `${Math.round(executionPct)}%`],
    ["Cost Model Total", costModel?.grandTotalG ?? 0],
  ]

  overviewRows.forEach(([label, value], i) => {
    const row = ws1.addRow({ label, value })
    if (typeof value === "number" && i >= 4 && i <= 9) {
      row.getCell("value").numFmt = currencyFmt
    }
  })

  // ── Sheet 2: Budget Lines ──────────────────────────────────────────────────
  const ws2 = wb.addWorksheet("Плановые статьи")
  ws2.columns = [
    { header: "Категория", key: "category", width: 32 },
    { header: "Департамент", key: "department", width: 16 },
    { header: "Тип", key: "lineType", width: 10 },
    { header: "Бюджет (₼)", key: "plannedAmount", width: 16 },
    { header: "Прогноз (₼)", key: "forecastAmount", width: 16 },
    { header: "Cost Model Key", key: "costModelKey", width: 24 },
    { header: "Авто-факт", key: "isAutoActual", width: 12 },
    { header: "Заметки", key: "notes", width: 32 },
  ]
  ws2.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

  lines.forEach((line: { category: string; department: string | null; lineType: string; plannedAmount: number; forecastAmount: number | null; costModelKey: string | null; isAutoActual: boolean; notes: string | null }) => {
    const row = ws2.addRow({
      category: line.category,
      department: line.department || "",
      lineType: line.lineType === "expense" ? "Расход" : "Доход",
      plannedAmount: line.plannedAmount,
      forecastAmount: line.forecastAmount ?? line.plannedAmount,
      costModelKey: line.costModelKey || "",
      isAutoActual: line.isAutoActual ? "Да" : "Нет",
      notes: line.notes || "",
    })
    row.getCell("plannedAmount").numFmt = currencyFmt
    row.getCell("forecastAmount").numFmt = currencyFmt
  })

  // Total row
  const linesTotal = ws2.addRow({
    category: "ИТОГО",
    plannedAmount: totalPlanned,
    forecastAmount: totalForecast,
  })
  linesTotal.font = { bold: true }
  linesTotal.getCell("plannedAmount").numFmt = currencyFmt
  linesTotal.getCell("forecastAmount").numFmt = currencyFmt

  // ── Sheet 3: Actuals ───────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet("Фактические расходы")
  ws3.columns = [
    { header: "Категория", key: "category", width: 32 },
    { header: "Департамент", key: "department", width: 16 },
    { header: "Тип", key: "lineType", width: 10 },
    { header: "Сумма (₼)", key: "actualAmount", width: 16 },
    { header: "Дата", key: "expenseDate", width: 14 },
    { header: "Описание", key: "description", width: 40 },
  ]
  ws3.getRow(1).eachCell(cell => Object.assign(cell, headerStyle))

  actuals.forEach((actual: { category: string; department: string | null; lineType: string; actualAmount: number; expenseDate: string | null; description: string | null }) => {
    const row = ws3.addRow({
      category: actual.category,
      department: actual.department || "",
      lineType: actual.lineType === "expense" ? "Расход" : "Доход",
      actualAmount: actual.actualAmount,
      expenseDate: actual.expenseDate || "",
      description: actual.description || "",
    })
    row.getCell("actualAmount").numFmt = currencyFmt
  })

  const actualsTotal = ws3.addRow({ category: "ИТОГО", actualAmount: totalActual })
  actualsTotal.font = { bold: true }
  actualsTotal.getCell("actualAmount").numFmt = currencyFmt

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer()

  const periodStr = plan.month ? `${plan.year}-${String(plan.month).padStart(2, "0")}` : `${plan.year}`
  const filename = `budget_${plan.name.replace(/\s+/g, "_")}_${periodStr}.xlsx`

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
