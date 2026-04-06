import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeReport } from "@/lib/report-engine"
import { sendEmail } from "@/lib/email"
import ExcelJS from "exceljs"
import crypto from "crypto"
import { writeFileSync, unlinkSync } from "fs"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || !authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const provided = authHeader.replace("Bearer ", "")
  if (!crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronSecret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  let processed = 0

  try {
    const reports = await prisma.savedReport.findMany({
      where: {
        scheduleFreq: { not: null },
        NOT: { scheduleEmails: { isEmpty: true } },
      },
    })

    for (const report of reports) {
      const shouldRun = checkSchedule(report.scheduleFreq!, report.lastRunAt, now)
      if (!shouldRun) continue

      try {
        const result = await executeReport(report.organizationId, {
          entityType: report.entityType,
          columns: report.columns as any,
          filters: report.filters as any,
          groupBy: report.groupBy ?? undefined,
          sortBy: report.sortBy ?? undefined,
          sortOrder: report.sortOrder,
        })

        // Generate Excel
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet("Report")
        const columns = report.columns as { field: string; label?: string }[]
        sheet.addRow(columns.map(c => c.label || c.field))

        const data = result.data as any[]
        for (const row of data) {
          sheet.addRow(columns.map(c => {
            if (c.field.includes(".")) {
              const [rel, field] = c.field.split(".")
              return row[rel]?.[field] ?? ""
            }
            return row[c.field] ?? ""
          }))
        }

        const buffer = Buffer.from(await workbook.xlsx.writeBuffer())
        const tmpPath = `/tmp/${report.name.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.xlsx`
        writeFileSync(tmpPath, buffer)

        for (const email of report.scheduleEmails) {
          await sendEmail({
            to: email,
            subject: `[LeadDrive] Report: ${report.name}`,
            html: `<p>Automated report "${report.name}" is attached.</p><p>Generated at ${now.toISOString()}</p>`,
            organizationId: report.organizationId,
            attachments: [{ filename: `${report.name}.xlsx`, path: tmpPath }],
          })
        }

        // Cleanup
        try { unlinkSync(tmpPath) } catch { /* ignore */ }

        await prisma.savedReport.update({
          where: { id: report.id },
          data: { lastRunAt: now },
        })
        processed++
      } catch (e) {
        console.error(`Failed to process report ${report.id}:`, e)
      }
    }

    return NextResponse.json({ success: true, processed })
  } catch (e) {
    console.error("Scheduled reports cron error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function checkSchedule(freq: string, lastRunAt: Date | null, now: Date): boolean {
  if (!lastRunAt) return true

  const diffMs = now.getTime() - lastRunAt.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  switch (freq) {
    case "daily": return diffHours >= 23
    case "weekly": return diffHours >= 167
    case "monthly": return diffHours >= 719
    default: return false
  }
}
