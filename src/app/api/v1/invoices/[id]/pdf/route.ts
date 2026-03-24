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
  @page { size: A4; margin: 10mm; }
  @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 794px; margin: 0 auto; padding: 20px 24px; color: #1a1a1a; font-size: 12px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .invoice-title h2 { margin: 0; font-size: 22px; color: #0f766e; text-transform: uppercase; letter-spacing: 1px; }
  .invoice-title .number { font-size: 13px; color: #666; margin-top: 3px; }
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-sent { background: #dbeafe; color: #1d4ed8; }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .status-partially_paid { background: #fef3c7; color: #d97706; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
  .party-box { border: 1.5px solid #2196a6; border-radius: 4px; overflow: hidden; }
  .party-box-title { background: #2196a6; color: white; font-weight: 700; font-size: 11px; padding: 5px 10px; letter-spacing: 0.5px; text-transform: uppercase; }
  .party-box-body { padding: 8px 10px; font-size: 11.5px; }
  .party-row { display: flex; gap: 4px; padding: 2px 0; }
  .party-row strong { min-width: 80px; color: #1a1a1a; font-weight: 600; flex-shrink: 0; }
  .party-row span { color: #333; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .items-table th { background: #0f766e; color: white; padding: 6px 8px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.3px; }
  .items-table th:last-child, .items-table td:last-child { text-align: right; }
  .items-table th:nth-child(3), .items-table td:nth-child(3),
  .items-table th:nth-child(4), .items-table td:nth-child(4),
  .items-table th:nth-child(5), .items-table td:nth-child(5) { text-align: right; }
  .items-table td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; font-size: 11.5px; }
  .items-table tr:nth-child(even) { background: #fafafa; }
  .summary { display: flex; justify-content: flex-end; margin-bottom: 10px; }
  .summary-table { width: 260px; }
  .summary-table tr td { padding: 3px 0; font-size: 12px; }
  .summary-table tr td:last-child { text-align: right; font-weight: 500; }
  .summary-table .total { border-top: 2px solid #0f766e; font-size: 14px; font-weight: 700; color: #0f766e; }
  .summary-table .total td { padding-top: 6px; }
  .bottom-row { display: grid; grid-template-columns: 1fr auto; gap: 20px; align-items: end; margin-top: 12px; }
  .bank-box { border: 1.5px solid #2196a6; border-radius: 4px; overflow: hidden; }
  .bank-box-title { background: #2196a6; color: white; font-weight: 700; font-size: 11px; padding: 5px 10px; letter-spacing: 0.5px; }
  .bank-box-body { padding: 8px 10px; font-size: 11.5px; }
  .bank-row { display: flex; gap: 4px; padding: 2px 0; }
  .bank-row strong { min-width: 70px; color: #1a1a1a; flex-shrink: 0; }
  .signer-block { text-align: center; font-size: 12px; width: 220px; flex-shrink: 0; }
  .stamp-wrap { display: flex; align-items: flex-end; justify-content: center; margin-bottom: -10px; }
  .stamp-img { width: 120px; height: 120px; object-fit: contain; opacity: 0.9; }
  .signer-line { border-top: 1px solid #1a1a1a; width: 200px; margin: 6px auto 5px; }
  .signer-name { font-weight: 600; }
  .signer-title { color: #666; font-size: 11px; margin-top: 2px; }
  .footer { border-top: 1px solid #e5e5e5; padding-top: 8px; font-size: 11px; color: #999; margin-top: 10px; }
  .footer h4 { color: #666; font-size: 11px; text-transform: uppercase; margin: 6px 0 3px; }
  .print-btn { position: fixed; bottom: 16px; right: 16px; background: #0f766e; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .print-btn:hover { background: #0d6660; }
</style>
</head>
<body>
<div class="header">
  <div class="invoice-title">
    <h2>Hesab-faktura</h2>
    <div class="number">${invoice.invoiceNumber}</div>
  </div>
  <div style="text-align:right; font-size:12px; color:#666;">
    <p style="margin:2px 0;">Tarix: ${formatDate(invoice.issueDate)}</p>
    <p style="margin:2px 0;">Ödəniş tarixi: ${formatDate(invoice.dueDate)}</p>
    ${invoice.paymentTerms ? `<p style="margin:2px 0;">Ödəniş şərtləri: ${invoice.paymentTerms}</p>` : ""}
  </div>
</div>

<div class="parties">
  <div class="party-box">
    <div class="party-box-title">İCRAÇI ŞİRKƏT</div>
    <div class="party-box-body">
      <div class="party-row"><strong>Şirkət Adı:</strong><span>${companyName}</span></div>
      <div class="party-row"><strong>VÖEN:</strong><span>${companyVoen}</span></div>
      ${companyAddress ? `<div class="party-row"><strong>Ünvan:</strong><span>${companyAddress}</span></div>` : ""}
      ${companyEmail ? `<div class="party-row"><strong>E-poçt:</strong><span>${companyEmail}</span></div>` : ""}
      ${companyPhone ? `<div class="party-row"><strong>Telefon:</strong><span>${companyPhone}</span></div>` : ""}
    </div>
  </div>
  <div class="party-box">
    <div class="party-box-title">SİFARİŞÇİ ŞİRKƏT</div>
    <div class="party-box-body">
      <div class="party-row"><strong>Şirkət Adı:</strong><span>${clientCo?.name || ""}</span></div>
      ${clientVoen ? `<div class="party-row"><strong>VÖEN:</strong><span>${clientVoen}</span></div>` : ""}
      ${clientCo?.address ? `<div class="party-row"><strong>Ünvan:</strong><span>${clientCo.address}</span></div>` : ""}
      ${clientCo?.email ? `<div class="party-row"><strong>E-poçt:</strong><span>${clientCo.email}</span></div>` : ""}
      ${clientCo?.phone ? `<div class="party-row"><strong>Telefon:</strong><span>${clientCo.phone}</span></div>` : ""}
    </div>
  </div>
</div>

<table class="items-table">
  <thead>
    <tr>
      <th>#</th>
      <th>Təsvir</th>
      <th>Miqdar</th>
      <th>Qiymət</th>
      ${hasDiscounts ? "<th>Endirim</th>" : ""}
      <th>Cəm</th>
    </tr>
  </thead>
  <tbody>
    ${invoice.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}${item.description ? `<br><small style="color:#999">${item.description}</small>` : ""}</td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unitPrice)} ${invoice.currency}</td>
      ${hasDiscounts ? `<td>${Number(item.discount) > 0 ? `${item.discount}%` : "—"}</td>` : ""}
      <td>${formatMoney(item.total)} ${invoice.currency}</td>
    </tr>`).join("")}
  </tbody>
</table>

<div class="summary">
  <table class="summary-table">
    <tr><td>Ara cəm:</td><td>${formatMoney(invoice.subtotal)} ${invoice.currency}</td></tr>
    ${Number(invoice.discountAmount) > 0 ? `<tr><td>Endirim:</td><td>-${formatMoney(invoice.discountAmount)} ${invoice.currency}</td></tr>` : ""}
    ${invoice.includeVat ? `<tr><td>ƏDV (${Number(invoice.taxRate) * 100}%):</td><td>${formatMoney(invoice.taxAmount)} ${invoice.currency}</td></tr>` : ""}
    <tr class="total"><td>Yekun:</td><td>${formatMoney(invoice.totalAmount)} ${invoice.currency}</td></tr>
    ${Number(invoice.paidAmount) > 0 ? `<tr><td>Ödənilmiş:</td><td>${formatMoney(invoice.paidAmount)} ${invoice.currency}</td></tr><tr class="total"><td>Qalıq:</td><td>${formatMoney(invoice.balanceDue)} ${invoice.currency}</td></tr>` : ""}
  </table>
</div>

<div class="bottom-row">
  <div>
    ${hasBankDetails ? `
    <div class="bank-box">
      <div class="bank-box-title">BANK HESABI</div>
      <div class="bank-box-body">
        ${bankName ? `<div class="bank-row"><strong>Bank:</strong><span>${bankName}</span></div>` : ""}
        ${bankVoen ? `<div class="bank-row"><strong>VÖEN:</strong><span>${bankVoen}</span></div>` : ""}
        ${bankCode ? `<div class="bank-row"><strong>Kod:</strong><span>${bankCode}</span></div>` : ""}
        ${bankSwift ? `<div class="bank-row"><strong>SWIFT:</strong><span>${bankSwift}</span></div>` : ""}
        ${bankCorrAccount ? `<div class="bank-row"><strong>M/H:</strong><span>${bankCorrAccount}</span></div>` : ""}
        ${bankAccount ? `<div class="bank-row"><strong>H/H:</strong><span>${bankAccount}</span></div>` : ""}
      </div>
    </div>` : ""}
  </div>
  <div class="signer-block">
    ${withStamp && companyStampUrl ? `<div class="stamp-wrap"><img src="${companyStampUrl}" class="stamp-img" alt="Stamp" /></div>` : ""}
    <div class="signer-line"></div>
    ${signerName ? `<div class="signer-name">${signerName}</div>` : ""}
    ${signerTitle ? `<div class="signer-title">${signerTitle}</div>` : ""}
  </div>
</div>

${terms || footerNote ? `
<div class="footer">
  ${terms ? `<h4>Şərtlər</h4><p>${terms}</p>` : ""}
  ${footerNote ? `<p>${footerNote}</p>` : ""}
</div>` : ""}

<button class="print-btn no-print" onclick="window.print()">🖨️ Çap et / PDF</button>
</body>
</html>`
}
