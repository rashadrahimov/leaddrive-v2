import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getTranslations, formatDate, formatMoney, type DocLanguage } from "@/lib/invoice-templates"

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
    const inv = (settings.invoice as Record<string, unknown>) || {}

    const { searchParams } = new URL(req.url)
    const langParam = searchParams.get("lang") as DocLanguage | null
    const lang: DocLanguage = langParam || (invoice.documentLanguage as DocLanguage) || "az"

    const html = generateInvoiceHtml(invoice, org?.name || "", inv, lang)

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
  invoice: Record<string, unknown> & {
    items: Array<Record<string, unknown>>
    company?: Record<string, unknown> | null
    contact?: Record<string, unknown> | null
  },
  orgName: string,
  inv: Record<string, unknown>,
  lang: DocLanguage
): string {
  const t = getTranslations(lang)

  // Organization (executor) details from settings
  const execName = (inv.companyName as string) || orgName
  const execVoen = (inv.companyVoen as string) || ""
  const execAddress = (inv.companyAddress as string) || ""
  const execEmail = (inv.companyEmail as string) || ""
  const execPhone = (inv.companyPhone as string) || ""

  // Bank details from settings
  const bankName = (inv.bankName as string) || ""
  const bankCode = (inv.bankCode as string) || ""
  const bankSwift = (inv.bankSwift as string) || ""
  const bankAccount = (inv.bankAccount as string) || ""
  const bankVoen = (inv.bankVoen as string) || ""
  const bankCorrAccount = (inv.bankCorrAccount as string) || ""

  // Client details from invoice + company + contact
  const company = invoice.company as Record<string, unknown> | null
  const contact = invoice.contact as Record<string, unknown> | null
  const clientName = (company?.name as string) || ""
  const clientVoen = (invoice.voen as string) || ""
  const clientAddress = (company?.address as string) || ""
  const clientEmail = (company?.email as string) || (contact?.email as string) || ""
  const clientPhone = (company?.phone as string) || ""

  // Amounts
  const subtotal = Number(invoice.subtotal || 0)
  const taxAmount = Number(invoice.taxAmount || 0)
  const totalAmount = Number(invoice.totalAmount || 0)
  const currency = (invoice.currency as string) || "AZN"

  // Invoice number parts
  const invoiceNumber = (invoice.invoiceNumber as string) || ""
  const numberPart = invoiceNumber.replace(/^[A-Z]+-/, "")

  // Dates
  const issueDate = formatDate(invoice.issueDate as Date | string | null, lang)

  // Escape HTML
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

  // Items rows
  const itemsHtml = invoice.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 14px; border: 1px solid #0891b2; font-weight: 700; text-transform: uppercase;">
            ${esc(String(item.name || ""))}
          </td>
          <td style="padding: 10px 14px; border: 1px solid #0891b2; text-align: right; white-space: nowrap;">
            ${formatMoney(Number(item.total || 0))} ${esc(currency)}
          </td>
        </tr>`
    )
    .join("")

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.invoiceTitle} ${esc(invoiceNumber)}</title>
<style>
  @media print {
    body { margin: 0; padding: 15px; }
    .no-print { display: none !important; }
    @page { size: A4; margin: 15mm; }
  }

  * { box-sizing: border-box; }

  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 30px;
    color: #1a1a1a;
    font-size: 14px;
    line-height: 1.4;
    background: #fff;
  }

  /* Top section - two column parties */
  .parties {
    display: flex;
    gap: 20px;
    margin-bottom: 25px;
  }
  .party-block {
    flex: 1;
    border: 1px solid #0891b2;
  }
  .party-header {
    background: #0891b2;
    color: #fff;
    padding: 8px 14px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .party-body {
    padding: 10px 14px;
  }
  .party-row {
    display: flex;
    padding: 3px 0;
    font-size: 13px;
  }
  .party-label {
    min-width: 100px;
    font-weight: 600;
    color: #444;
  }
  .party-value {
    flex: 1;
  }

  /* Invoice title */
  .invoice-title {
    text-align: center;
    font-size: 22px;
    font-weight: 700;
    margin: 25px 0;
    letter-spacing: 1px;
  }

  /* Company info block */
  .company-info-block {
    border: 1px solid #0891b2;
    margin-bottom: 20px;
  }
  .company-info-header {
    padding: 8px 14px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 3px solid #0891b2;
    color: #1a1a1a;
  }
  .company-info-row {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
    font-size: 13px;
  }
  .company-info-row:last-child {
    border-bottom: none;
  }
  .company-info-label {
    padding: 7px 14px;
    min-width: 180px;
    font-weight: 600;
    color: #444;
    border-right: 1px solid #e5e7eb;
  }
  .company-info-value {
    padding: 7px 14px;
    flex: 1;
  }

  /* Services table */
  .services-header {
    background: #0891b2;
    color: #fff;
    padding: 10px 14px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    text-align: center;
    letter-spacing: 0.5px;
  }
  .services-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 5px;
  }
  .services-table td {
    font-size: 14px;
  }
  .unit-info {
    display: flex;
    gap: 30px;
    padding: 8px 14px;
    font-size: 13px;
    font-weight: 600;
    border: 1px solid #0891b2;
    border-top: none;
    margin-bottom: 20px;
  }

  /* Totals */
  .totals-block {
    border: 1px solid #0891b2;
    margin-bottom: 25px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 14px;
    font-size: 14px;
    border-bottom: 1px solid #e5e7eb;
  }
  .totals-row:last-child {
    border-bottom: none;
  }
  .totals-row.total-final {
    font-weight: 700;
    font-size: 15px;
    background: #f0fdfa;
  }
  .totals-label {
    font-weight: 600;
  }
  .totals-value {
    font-weight: 700;
    white-space: nowrap;
  }

  /* Bottom section */
  .bottom-section {
    display: flex;
    margin-bottom: 20px;
  }
  .bank-block {
    flex: 1;
    border: 1px solid #0891b2;
  }
  .bank-header {
    background: #0891b2;
    color: #fff;
    padding: 8px 14px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .bank-body {
    padding: 10px 14px;
  }
  .bank-row {
    display: flex;
    padding: 3px 0;
    font-size: 13px;
  }
  .bank-label {
    min-width: 100px;
    font-weight: 600;
    color: #444;
  }
  .bank-value {
    flex: 1;
    word-break: break-all;
  }

  .confirm-block {
    flex: 1;
    border: 1px solid #0891b2;
    border-left: none;
  }
  .confirm-header {
    background: #0891b2;
    color: #fff;
    padding: 8px 14px;
    font-weight: 700;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .confirm-body {
    padding: 14px;
    min-height: 120px;
  }

  /* Print button */
  .print-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0891b2;
    color: #fff;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 100;
  }
  .print-btn:hover {
    background: #0e7490;
  }
</style>
</head>
<body>

<!-- Top section: Executor & Customer -->
<div class="parties">
  <div class="party-block">
    <div class="party-header">${esc(t.executor)}</div>
    <div class="party-body">
      <div class="party-row">
        <span class="party-label">${esc(t.companyName)}:</span>
        <span class="party-value">${esc(execName)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.voen)}:</span>
        <span class="party-value">${esc(execVoen)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.address)}:</span>
        <span class="party-value">${esc(execAddress)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.email)}:</span>
        <span class="party-value">${esc(execEmail)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.phone)}:</span>
        <span class="party-value">${esc(execPhone)}</span>
      </div>
    </div>
  </div>

  <div class="party-block">
    <div class="party-header">${esc(t.customer)}</div>
    <div class="party-body">
      <div class="party-row">
        <span class="party-label">${esc(t.companyName)}:</span>
        <span class="party-value">${esc(clientName)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.voen)}:</span>
        <span class="party-value">${esc(clientVoen)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.address)}:</span>
        <span class="party-value">${esc(clientAddress)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.email)}:</span>
        <span class="party-value">${esc(clientEmail)}</span>
      </div>
      <div class="party-row">
        <span class="party-label">${esc(t.phone)}:</span>
        <span class="party-value">${esc(clientPhone)}</span>
      </div>
    </div>
  </div>
</div>

<!-- Invoice Title -->
<div class="invoice-title">
  ${esc(t.invoiceTitle)} &#8470; ${esc(invoiceNumber)}
</div>

<!-- Company Info Block -->
<div class="company-info-block">
  <div class="company-info-header">
    ${lang === "az" ? "ŞİRKƏT HAQQINDA MƏLUMAT" : lang === "ru" ? "ИНФОРМАЦИЯ О КОМПАНИИ" : "COMPANY INFORMATION"}
  </div>
  <div class="company-info-row">
    <div class="company-info-label">${esc(t.companyName)}:</div>
    <div class="company-info-value">${esc(clientName)}</div>
  </div>
  <div class="company-info-row">
    <div class="company-info-label">${esc(t.documentNumber)}:</div>
    <div class="company-info-value">${esc(numberPart)}</div>
  </div>
  <div class="company-info-row">
    <div class="company-info-label">${esc(t.documentDate)}:</div>
    <div class="company-info-value">${issueDate}</div>
  </div>
</div>

<!-- Services Table -->
<div class="services-header">${esc(t.servicesProvided)}</div>
<table class="services-table">
  <tbody>
    ${itemsHtml}
  </tbody>
</table>
<div class="unit-info">
  <span>${esc(t.unitOfMeasure)}: ${esc(t.unitMonth)}</span>
  <span>${esc(t.quantity)}: 1</span>
</div>

<!-- Totals -->
<div class="totals-block">
  <div class="totals-row">
    <span class="totals-label">${esc(t.subtotal)}:</span>
    <span class="totals-value">${formatMoney(subtotal)} ${esc(currency)}</span>
  </div>
  <div class="totals-row">
    <span class="totals-label">${esc(t.vat18)}:</span>
    <span class="totals-value">${formatMoney(taxAmount)}</span>
  </div>
  <div class="totals-row total-final">
    <span class="totals-label">${esc(t.totalWithVat)}:</span>
    <span class="totals-value">${formatMoney(totalAmount)}</span>
  </div>
</div>

<!-- Bottom: Bank Details & Confirmation -->
<div class="bottom-section">
  <div class="bank-block">
    <div class="bank-header">${esc(t.bankAccount)}</div>
    <div class="bank-body">
      <div class="bank-row">
        <span class="bank-label">${esc(t.bank)}:</span>
        <span class="bank-value">${esc(bankName)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">${esc(t.code)}:</span>
        <span class="bank-value">${esc(bankCode)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">${esc(t.swift)}:</span>
        <span class="bank-value">${esc(bankSwift)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">${esc(t.account)}:</span>
        <span class="bank-value">${esc(bankAccount)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">${esc(t.voen)}:</span>
        <span class="bank-value">${esc(bankVoen)}</span>
      </div>
      <div class="bank-row">
        <span class="bank-label">${esc(t.corrAccount)}:</span>
        <span class="bank-value">${esc(bankCorrAccount)}</span>
      </div>
    </div>
  </div>

  <div class="confirm-block">
    <div class="confirm-header">${esc(t.confirmation)}</div>
    <div class="confirm-body"></div>
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">&#128424; ${lang === "az" ? "Çap et / PDF" : lang === "ru" ? "Печать / PDF" : "Print / PDF"}</button>

</body>
</html>`
}
