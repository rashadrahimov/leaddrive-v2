import { NextRequest, NextResponse } from "next/server"
import ExcelJS from "exceljs"
import type { Prisma } from "@prisma/client"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId, getSession } from "@/lib/api-auth"
import { resolveHeaders, rowToComplaint, type ComplaintRow } from "@/lib/complaints-mapper"
import { formatTicketNumber } from "@/lib/ticket-number"

const MAX_ROWS = 5000

function subjectFrom(content: string, brand?: string | null, obj?: string | null): string {
  const parts = [brand, obj].filter(Boolean).join(" — ")
  const head = content.replace(/\s+/g, " ").trim().slice(0, 120)
  return parts ? `${parts}: ${head}` : head || "Şikayət"
}

function complaintStatusToTicket(s: ComplaintRow["status"]): string {
  // Our Ticket model's status uses "escalated" loosely; keep "open" for not-ok to stay in
  // the canonical Ticket workflow. "resolved" maps directly.
  if (s === "resolved") return "resolved"
  if (s === "escalated") return "open" // still needs attention
  return s
}

async function parseWorkbook(buf: ArrayBuffer): Promise<{ headers: string[]; rows: unknown[][] }> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets[0]
  if (!ws) throw new Error("Empty workbook")

  const rows: unknown[][] = []
  ws.eachRow({ includeEmpty: false }, (row) => {
    // exceljs stores as sparse array with [0] unused — normalize to 0-indexed
    const values = (row.values as unknown[]).slice(1)
    rows.push(values)
  })
  if (rows.length === 0) throw new Error("No rows")
  const headers = rows.shift()!.map((v) => String(v ?? ""))
  return { headers, rows }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || (await getOrgId(req))
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = req.headers.get("content-type") || ""

  let buf: ArrayBuffer
  let fileName = "complaints-import.xlsx"
  let dryRun = false

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData()
    const file = form.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }
    fileName = file.name
    buf = await file.arrayBuffer()
    dryRun = form.get("dryRun") === "true"
  } else if (contentType.includes("application/json")) {
    const body = await req.json()
    if (!body?.base64) return NextResponse.json({ error: "Missing base64 payload" }, { status: 400 })
    buf = Uint8Array.from(Buffer.from(body.base64, "base64")).buffer
    fileName = body.fileName || fileName
    dryRun = body.dryRun === true
  } else {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 })
  }

  let headers: string[]
  let rows: unknown[][]
  try {
    ;({ headers, rows } = await parseWorkbook(buf))
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `Parse error: ${msg}` }, { status: 400 })
  }

  if (rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Too many rows (max ${MAX_ROWS})` }, { status: 400 })
  }

  const headerMap = resolveHeaders(headers)
  if (headerMap.content === undefined) {
    return NextResponse.json(
      { error: "Could not find complaint content column — header names unrecognized" },
      { status: 400 },
    )
  }

  const parsed: Array<{ row: number; c: ComplaintRow }> = []
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < rows.length; i++) {
    try {
      const c = rowToComplaint(rows[i], headerMap)
      if (c && c.content) parsed.push({ row: i + 2, c })
    } catch (e: unknown) {
      errors.push({ row: i + 2, error: e instanceof Error ? e.message : "parse failed" })
    }
  }

  const preview = parsed.slice(0, 10).map((p) => ({
    row: p.row,
    externalRegistryNumber: p.c.externalRegistryNumber,
    customerName: p.c.customerName,
    requestDate: p.c.requestDate,
    brand: p.c.brand,
    riskLevel: p.c.riskLevel,
    status: p.c.status,
  }))

  if (dryRun) {
    return NextResponse.json({
      success: true,
      data: { dryRun: true, totalParsed: parsed.length, errors, preview },
    })
  }

  // Resolve the next ticket number once, bump locally to avoid N extra queries.
  const allNumbers = await prisma.ticket.findMany({
    where: { organizationId: orgId },
    select: { ticketNumber: true },
  })
  let counter = allNumbers.reduce((m: number, t: { ticketNumber: string }) => {
    const n = parseInt(t.ticketNumber.replace(/[^0-9]/g, ""), 10) || 0
    return n > m ? n : m
  }, 0)

  let imported = 0
  const detailErrors: Array<{ row: number; error: string }> = [...errors]

  for (const { row, c } of parsed) {
    counter++
    const ticketNumber = formatTicketNumber(counter)
    try {
      // findOrCreate contact
      let contactId: string | undefined
      if (c.phone || c.customerName) {
        const existing = c.phone
          ? await prisma.contact.findFirst({
              where: { organizationId: orgId, phone: c.phone },
              select: { id: true },
            })
          : null
        if (existing) {
          contactId = existing.id
        } else {
          const created = await prisma.contact.create({
            data: {
              organizationId: orgId,
              fullName: c.customerName || c.phone || "Unknown",
              phone: c.phone,
              source: c.source || "complaints_register",
            },
            select: { id: true },
          })
          contactId = created.id
        }
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const ticket = await tx.ticket.create({
          data: {
            organizationId: orgId,
            ticketNumber,
            subject: subjectFrom(c.content, c.brand, c.complaintObject),
            description: c.content,
            priority: c.priority === "urgent" ? "critical" : c.priority,
            status: complaintStatusToTicket(c.status),
            category: "complaint",
            source: c.source,
            contactId,
            ...(c.requestDate ? { createdAt: c.requestDate, updatedAt: c.requestDate } : {}),
            ...(c.status === "resolved" ? { resolvedAt: c.requestDate || new Date() } : {}),
          },
        })
        await tx.complaintMeta.create({
          data: {
            ticketId: ticket.id,
            organizationId: orgId,
            externalRegistryNumber: c.externalRegistryNumber,
            complaintType: c.complaintType,
            brand: c.brand,
            productionArea: c.productionArea,
            productCategory: c.productCategory,
            complaintObject: c.complaintObject,
            complaintObjectDetail: c.complaintObjectDetail,
            responsibleDepartment: c.responsibleDepartment,
            riskLevel: c.riskLevel,
          },
        })
        if (c.response) {
          await tx.ticketComment.create({
            data: {
              ticketId: ticket.id,
              comment: c.response,
              isInternal: false,
            },
          })
        }
      })
      imported++
    } catch (e: unknown) {
      detailErrors.push({ row, error: e instanceof Error ? e.message : "DB error" })
    }
  }

  logAudit(orgId, "import", "complaint", `bulk-${Date.now()}`, `Imported ${imported} complaints from ${fileName}`)

  return NextResponse.json({
    success: true,
    data: {
      imported,
      totalParsed: parsed.length,
      errors: detailErrors,
      fileName,
    },
  })
}
