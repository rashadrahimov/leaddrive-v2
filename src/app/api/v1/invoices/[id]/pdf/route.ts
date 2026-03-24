import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        company: true,
        contact: true,
      },
    })
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, settings: true },
    })

    const settings = (org?.settings as Record<string, unknown>) || {}
    const invoiceSettings = (settings.invoice as Record<string, unknown>) || {}

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format")
    const withStamp = searchParams.get("stamp") === "true"

    const html = generateInvoiceHtml(invoice, org?.name || "", invoiceSettings, withStamp)

    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    // Return HTML as downloadable page (PDF generation via browser print)
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="invoice-${invoice.invoiceNumber}.html"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function generateInvoiceHtml(
  invoice: Record<string, unknown> & { items: Array<Record<string, unknown>>; company?: Record<string, unknown> | null; contact?: Record<string, unknown> | null },
  orgName: string,
  settings: Record<string, unknown>,
  withStamp = false
): string {
  const companyName = (settings.companyName as string) || orgName
  const companyAddress = (settings.companyAddress as string) || ""
  const companyVoen = (settings.companyVoen as string) || (invoice.sellerVoen as string) || ""
  const companyEmail = (settings.companyEmail as string) || ""
  const companyPhone = (settings.companyPhone as string) || ""
  const clientCo = invoice.company as Record<string, unknown> | null
  const clientVoen = (invoice.voen as string) || (clientCo?.voen as string) || ""
  const bankName = (settings.bankName as string) || ""
  const bankCode = (settings.bankCode as string) || ""
  const bankSwift = (settings.bankSwift as string) || ""
  const bankAccount = (settings.bankAccount as string) || ""
  const bankVoen = (settings.bankVoen as string) || ""
  const bankCorrAccount = (settings.bankCorrAccount as string) || ""
  const hasBankDetails = bankName || bankAccount || bankSwift
  const signerName = (settings.signerName as string) || ""
  const signerTitle = (settings.signerTitle as string) || ""
  const companyStampUrl = (settings.companyStampUrl as string) || ""
  const footerNote = (invoice.footerNote as string) || (settings.footerNote as string) || ""
  const terms = (invoice.termsAndConditions as string) || (settings.termsAndConditions as string) || ""

  const formatDate = (d: unknown) => d ? new Date(d as string).toLocaleDateString("az-AZ") : "—"
  const formatMoney = (n: unknown) => Number(n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2 })

  // Only show discount column if at least one item has a discount
  const hasDiscounts = invoice.items.some(item => Number(item.discount) > 0)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  @page { size: A4; margin: 8mm 10mm; }
  @media print { body { margin: 0; padding: 0; } .no-print { display: none !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 794px; margin: 0 auto; padding: 18px 22px; color: #1e293b; font-size: 11.5px; background: #fff; }

  /* ── HEADER ───────────────────────────────── */
  .top-bar { height: 4px; background: linear-gradient(90deg, #0f766e, #2196a6); border-radius: 2px; margin-bottom: 14px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
  .header-left h1 { font-size: 24px; font-weight: 800; color: #0f766e; text-transform: uppercase; letter-spacing: 2px; line-height: 1; }
  .header-left .inv-num { font-size: 13px; color: #64748b; margin-top: 4px; font-weight: 500; }
  .header-right { text-align: right; }
  .header-right .date-row { font-size: 11.5px; color: #475569; padding: 2px 0; }
  .header-right .date-label { color: #94a3b8; margin-right: 6px; }

  /* ── PARTIES ──────────────────────────────── */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .party-box { border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; }
  .party-box-title { padding: 6px 12px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: white; }
  .party-seller .party-box-title { background: #0f766e; }
  .party-buyer .party-box-title  { background: #1d4ed8; }
  .party-box-body { padding: 10px 12px; background: #f8fafc; }
  .party-row { display: flex; gap: 6px; padding: 2.5px 0; font-size: 11px; }
  .party-row .lbl { min-width: 74px; color: #94a3b8; flex-shrink: 0; }
  .party-row .val { color: #1e293b; font-weight: 500; }

  /* ── TABLE ────────────────────────────────── */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; border-radius: 6px; overflow: hidden; }
  .items-table thead tr { background: #0f766e; }
  .items-table th { padding: 7px 10px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: white; }
  .items-table th:nth-child(n+3), .items-table td:nth-child(n+3) { text-align: right; }
  .items-table tbody tr { border-bottom: 1px solid #f1f5f9; }
  .items-table tbody tr:nth-child(even) { background: #f8fafc; }
  .items-table td { padding: 6px 10px; font-size: 11px; color: #334155; }
  .items-table td:first-child { color: #94a3b8; }

  /* ── SUMMARY ──────────────────────────────── */
  .summary-wrap { display: flex; justify-content: flex-end; margin-bottom: 12px; }
  .summary-box { width: 240px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 12px; font-size: 11.5px; color: #475569; }
  .summary-row + .summary-row { border-top: 1px solid #f1f5f9; }
  .summary-row.total { background: #0f766e; color: white; font-weight: 700; font-size: 13px; padding: 7px 12px; }

  /* ── BOTTOM ROW ───────────────────────────── */
  .bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .section-box { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .section-title { padding: 6px 12px; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: white; background: #2196a6; }
  .bank-body { padding: 10px 12px; background: #f8fafc; }
  .bank-row { display: flex; gap: 6px; padding: 2.5px 0; font-size: 11px; }
  .bank-row .lbl { min-width: 52px; color: #94a3b8; flex-shrink: 0; }
  .bank-row .val { color: #1e293b; font-weight: 500; }
  .stamp-body { padding: 12px; background: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; }
  .stamp-img { width: 160px; height: 160px; object-fit: contain; }
  .sig-line { border-top: 1.5px solid #334155; width: 180px; margin: 10px auto 6px; }
  .sig-name { font-size: 12px; font-weight: 700; color: #1e293b; }
  .sig-title { font-size: 10.5px; color: #64748b; margin-top: 2px; text-align: center; }

  /* ── FOOTER ───────────────────────────────── */
  .footer { border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 10px; font-size: 10.5px; color: #94a3b8; }
  .footer h4 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 3px; }

  /* ── PRINT BTN ────────────────────────────── */
  .print-btn { position: fixed; bottom: 16px; right: 16px; background: #0f766e; color: white; border: none; padding: 10px 22px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; box-shadow: 0 4px 16px rgba(15,118,110,0.35); letter-spacing: 0.3px; }
  .print-btn:hover { background: #0d9488; }
</style>
</head>
<body>

<div class="top-bar"></div>

<div class="header">
  <div class="header-left">
    <h1>Hesab-faktura</h1>
    <div class="inv-num"># ${invoice.invoiceNumber}</div>
  </div>
  <div class="header-right">
    <div class="date-row"><span class="date-label">Tarix:</span>${formatDate(invoice.issueDate)}</div>
    <div class="date-row"><span class="date-label">Son ödəniş:</span>${formatDate(invoice.dueDate)}</div>
    ${invoice.paymentTerms ? `<div class="date-row"><span class="date-label">Şərtlər:</span>${invoice.paymentTerms}</div>` : ""}
  </div>
</div>

<div class="parties">
  <div class="party-box party-seller">
    <div class="party-box-title">İCRAÇI ŞİRKƏT</div>
    <div class="party-box-body">
      <div class="party-row"><span class="lbl">Şirkət:</span><span class="val">${companyName}</span></div>
      <div class="party-row"><span class="lbl">VÖEN:</span><span class="val">${companyVoen}</span></div>
      ${companyAddress ? `<div class="party-row"><span class="lbl">Ünvan:</span><span class="val">${companyAddress}</span></div>` : ""}
      ${companyEmail ? `<div class="party-row"><span class="lbl">E-poçt:</span><span class="val">${companyEmail}</span></div>` : ""}
      ${companyPhone ? `<div class="party-row"><span class="lbl">Telefon:</span><span class="val">${companyPhone}</span></div>` : ""}
    </div>
  </div>
  <div class="party-box party-buyer">
    <div class="party-box-title">SİFARİŞÇİ ŞİRKƏT</div>
    <div class="party-box-body">
      <div class="party-row"><span class="lbl">Şirkət:</span><span class="val">${clientCo?.name || "—"}</span></div>
      ${clientVoen ? `<div class="party-row"><span class="lbl">VÖEN:</span><span class="val">${clientVoen}</span></div>` : ""}
      ${clientCo?.address ? `<div class="party-row"><span class="lbl">Ünvan:</span><span class="val">${clientCo.address}</span></div>` : ""}
      ${clientCo?.email ? `<div class="party-row"><span class="lbl">E-poçt:</span><span class="val">${clientCo.email}</span></div>` : ""}
      ${clientCo?.phone ? `<div class="party-row"><span class="lbl">Telefon:</span><span class="val">${clientCo.phone}</span></div>` : ""}
    </div>
  </div>
</div>

<table class="items-table">
  <thead>
    <tr>
      <th style="width:28px">#</th>
      <th>Məhsul / Xidmət</th>
      <th style="width:60px">Miqdar</th>
      <th style="width:110px">Qiymət</th>
      ${hasDiscounts ? '<th style="width:70px">Endirim</th>' : ""}
      <th style="width:110px">Cəm</th>
    </tr>
  </thead>
  <tbody>
    ${invoice.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}${item.description ? `<br><span style="color:#94a3b8;font-size:10px">${item.description}</span>` : ""}</td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unitPrice)} ${invoice.currency}</td>
      ${hasDiscounts ? `<td>${Number(item.discount) > 0 ? `${item.discount}%` : "—"}</td>` : ""}
      <td style="font-weight:600">${formatMoney(item.total)} ${invoice.currency}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="summary-wrap">
  <div class="summary-box">
    <div class="summary-row"><span>Ara cəm</span><span>${formatMoney(invoice.subtotal)} ${invoice.currency}</span></div>
    ${Number(invoice.discountAmount) > 0 ? `<div class="summary-row"><span>Endirim</span><span>−${formatMoney(invoice.discountAmount)} ${invoice.currency}</span></div>` : ""}
    ${invoice.includeVat ? `<div class="summary-row"><span>ƏDV ${Number(invoice.taxRate) * 100}%</span><span>${formatMoney(invoice.taxAmount)} ${invoice.currency}</span></div>` : ""}
    <div class="summary-row total"><span>YEKUN</span><span>${formatMoney(invoice.totalAmount)} ${invoice.currency}</span></div>
    ${Number(invoice.paidAmount) > 0 ? `<div class="summary-row"><span>Ödənilmiş</span><span>${formatMoney(invoice.paidAmount)} ${invoice.currency}</span></div><div class="summary-row total"><span>QALIQ</span><span>${formatMoney(invoice.balanceDue)} ${invoice.currency}</span></div>` : ""}
  </div>
</div>

<div class="bottom-row">
  <div class="section-box">
    <div class="section-title">Bank Hesabı</div>
    <div class="bank-body">
      ${bankName ? `<div class="bank-row"><span class="lbl">Bank:</span><span class="val">${bankName}</span></div>` : ""}
      ${bankVoen ? `<div class="bank-row"><span class="lbl">VÖEN:</span><span class="val">${bankVoen}</span></div>` : ""}
      ${bankCode ? `<div class="bank-row"><span class="lbl">Kod:</span><span class="val">${bankCode}</span></div>` : ""}
      ${bankSwift ? `<div class="bank-row"><span class="lbl">SWIFT:</span><span class="val">${bankSwift}</span></div>` : ""}
      ${bankCorrAccount ? `<div class="bank-row"><span class="lbl">M/H:</span><span class="val">${bankCorrAccount}</span></div>` : ""}
      ${bankAccount ? `<div class="bank-row"><span class="lbl">H/H:</span><span class="val">${bankAccount}</span></div>` : ""}
    </div>
  </div>
  <div class="section-box">
    <div class="section-title">Təsdiq (İmza, Möhür)</div>
    <div class="stamp-body">
      ${withStamp && companyStampUrl ? `<img src="${companyStampUrl}" class="stamp-img" alt="Stamp" />` : ""}
      <div class="sig-line"></div>
      ${signerName ? `<div class="sig-name">${signerName}</div>` : ""}
      ${signerTitle ? `<div class="sig-title">${signerTitle}</div>` : ""}
    </div>
  </div>
</div>

${terms || footerNote ? `
<div class="footer">
  ${terms ? `<h4>Şərtlər və Qaydalar</h4><p>${terms}</p>` : ""}
  ${footerNote ? `<p style="margin-top:4px">${footerNote}</p>` : ""}
</div>` : ""}

<button class="print-btn no-print" onclick="window.print()">🖨️ Çap et / PDF</button>
</body>
</html>`
}
