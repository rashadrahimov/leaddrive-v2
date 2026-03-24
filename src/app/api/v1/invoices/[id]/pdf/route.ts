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

    // Generate HTML-based PDF
    const html = generateInvoiceHtml(invoice, org?.name || "", invoiceSettings)

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format")

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
  settings: Record<string, unknown>
): string {
  const companyName = (settings.companyName as string) || orgName
  const companyAddress = (settings.companyAddress as string) || ""
  const companyVoen = (settings.companyVoen as string) || (invoice.sellerVoen as string) || ""
  const bankName = (settings.bankName as string) || ""
  const bankCode = (settings.bankCode as string) || ""
  const bankSwift = (settings.bankSwift as string) || ""
  const bankAccount = (settings.bankAccount as string) || ""
  const bankVoen = (settings.bankVoen as string) || ""
  const bankCorrAccount = (settings.bankCorrAccount as string) || ""
  const hasBankDetails = bankName || bankAccount || bankSwift
  const footerNote = (invoice.footerNote as string) || (settings.footerNote as string) || ""
  const terms = (invoice.termsAndConditions as string) || (settings.termsAndConditions as string) || ""

  const formatDate = (d: unknown) => d ? new Date(d as string).toLocaleDateString("az-AZ") : "—"
  const formatMoney = (n: unknown) => Number(n || 0).toLocaleString("az-AZ", { minimumFractionDigits: 2 })

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoice.invoiceNumber}</title>
<style>
  @media print { body { margin: 0; } .no-print { display: none; } }
  body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .company-info h1 { margin: 0 0 5px; font-size: 24px; color: #0f766e; }
  .company-info p { margin: 2px 0; color: #666; font-size: 13px; }
  .invoice-title { text-align: right; }
  .invoice-title h2 { margin: 0; font-size: 32px; color: #0f766e; text-transform: uppercase; letter-spacing: 2px; }
  .invoice-title .number { font-size: 14px; color: #666; margin-top: 5px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
  .meta-box h3 { font-size: 12px; text-transform: uppercase; color: #999; margin: 0 0 8px; letter-spacing: 1px; }
  .meta-box p { margin: 3px 0; font-size: 14px; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
  .items-table th { background: #0f766e; color: white; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .items-table th:last-child, .items-table td:last-child { text-align: right; }
  .items-table th:nth-child(3), .items-table td:nth-child(3),
  .items-table th:nth-child(4), .items-table td:nth-child(4),
  .items-table th:nth-child(5), .items-table td:nth-child(5) { text-align: right; }
  .items-table td { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
  .items-table tr:nth-child(even) { background: #fafafa; }
  .summary { display: flex; justify-content: flex-end; margin-bottom: 30px; }
  .summary-table { width: 300px; }
  .summary-table tr td { padding: 6px 0; font-size: 14px; }
  .summary-table tr td:last-child { text-align: right; font-weight: 500; }
  .summary-table .total { border-top: 2px solid #0f766e; font-size: 18px; font-weight: 700; color: #0f766e; }
  .summary-table .total td { padding-top: 10px; }
  .balance-due { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
  .balance-due .label { font-size: 14px; color: #166534; font-weight: 500; }
  .balance-due .amount { font-size: 24px; font-weight: 700; color: #166534; }
  .footer { border-top: 1px solid #e5e5e5; padding-top: 20px; font-size: 12px; color: #999; }
  .footer h4 { color: #666; font-size: 12px; text-transform: uppercase; margin: 10px 0 5px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  .status-draft { background: #f3f4f6; color: #6b7280; }
  .status-sent { background: #dbeafe; color: #1d4ed8; }
  .status-paid { background: #dcfce7; color: #166534; }
  .status-overdue { background: #fee2e2; color: #dc2626; }
  .status-partially_paid { background: #fef3c7; color: #d97706; }
  .print-btn { position: fixed; bottom: 20px; right: 20px; background: #0f766e; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
  .print-btn:hover { background: #0d6660; }
  .bank-box { border: 1.5px solid #2196a6; border-radius: 4px; margin-bottom: 20px; overflow: hidden; }
  .bank-box-title { background: #2196a6; color: white; font-weight: 700; font-size: 13px; padding: 8px 14px; letter-spacing: 0.5px; }
  .bank-box-body { padding: 12px 14px; font-size: 13px; }
  .bank-row { display: flex; gap: 6px; padding: 3px 0; }
  .bank-row strong { min-width: 80px; color: #1a1a1a; }
</style>
</head>
<body>
<div class="header">
  <div class="company-info">
    <h1>${companyName}</h1>
    ${companyAddress ? `<p>${companyAddress}</p>` : ""}
    ${companyVoen ? `<p>VÖEN: ${companyVoen}</p>` : ""}
  </div>
  <div class="invoice-title">
    <h2>Hesab-faktura</h2>
    <div class="number">${invoice.invoiceNumber}</div>
    <div style="margin-top: 8px;"><span class="status-badge status-${invoice.status}">${invoice.status}</span></div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-box">
    <h3>Müştəri</h3>
    ${invoice.company ? `<p><strong>${(invoice.company as Record<string, unknown>).name}</strong></p>` : ""}
    ${invoice.contact ? `<p>${(invoice.contact as Record<string, unknown>).fullName}</p>` : ""}
    ${invoice.company && (invoice.company as Record<string, unknown>).address ? `<p>${(invoice.company as Record<string, unknown>).address}</p>` : ""}
    ${invoice.voen ? `<p>VÖEN: ${invoice.voen}</p>` : ""}
  </div>
  <div class="meta-box" style="text-align: right;">
    <h3>Hesab məlumatları</h3>
    <p>Tarix: ${formatDate(invoice.issueDate)}</p>
    <p>Ödəniş tarixi: ${formatDate(invoice.dueDate)}</p>
    <p>Ödəniş şərtləri: ${invoice.paymentTerms}</p>
  </div>
</div>

<table class="items-table">
  <thead>
    <tr><th>#</th><th>Təsvir</th><th>Miqdar</th><th>Qiymət</th><th>Endirim</th><th>Cəm</th></tr>
  </thead>
  <tbody>
    ${invoice.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}${item.description ? `<br><small style="color:#999">${item.description}</small>` : ""}</td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unitPrice)} ${invoice.currency}</td>
      <td>${Number(item.discount) > 0 ? `${item.discount}%` : "—"}</td>
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
  </table>
</div>

${Number(invoice.paidAmount) > 0 ? `
<div class="summary">
  <table class="summary-table">
    <tr><td>Ödənilmiş:</td><td>${formatMoney(invoice.paidAmount)} ${invoice.currency}</td></tr>
    <tr class="total"><td>Qalıq:</td><td>${formatMoney(invoice.balanceDue)} ${invoice.currency}</td></tr>
  </table>
</div>` : ""}

${hasBankDetails ? `
<div class="bank-box">
  <div class="bank-box-title">BANK HESABI</div>
  <div class="bank-box-body">
    ${bankName ? `<div class="bank-row"><strong>Bank:</strong><span>${bankName}</span></div>` : ""}
    ${bankCode ? `<div class="bank-row"><strong>Kod:</strong><span>${bankCode}</span></div>` : ""}
    ${bankSwift ? `<div class="bank-row"><strong>SWIFT:</strong><span>${bankSwift}</span></div>` : ""}
    ${bankAccount ? `<div class="bank-row"><strong>Hesab:</strong><span>${bankAccount}</span></div>` : ""}
    ${bankVoen ? `<div class="bank-row"><strong>VÖEN:</strong><span>${bankVoen}</span></div>` : ""}
    ${bankCorrAccount ? `<div class="bank-row"><strong>Müx. hesab:</strong><span>${bankCorrAccount}</span></div>` : ""}
  </div>
</div>` : ""}

<div class="footer">
  ${terms ? `<h4>Şərtlər</h4><p>${terms}</p>` : ""}
  ${footerNote ? `<p>${footerNote}</p>` : ""}
</div>

<button class="print-btn no-print" onclick="window.print()">🖨️ Çap et / PDF</button>
</body>
</html>`
}
