import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import {
  getTranslations,
  formatDate,
  formatMoney,
  formatMonthYear,
  fillTemplate,
  getFirstDayOfMonth,
  getLastDayOfMonth,
  type DocLanguage,
} from "@/lib/invoice-templates"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        contract: true,
      },
    })
    if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, settings: true },
    })

    const settings = (org?.settings as Record<string, unknown>) || {}
    const inv = (settings.invoice as Record<string, unknown>) || {}

    // Determine language
    const { searchParams } = new URL(req.url)
    const langParam = searchParams.get("lang")
    const documentLanguage = (langParam || (inv.documentLanguage as string) || "az") as DocLanguage
    const lang = ["az", "ru", "en"].includes(documentLanguage) ? documentLanguage : "az" as DocLanguage

    const t = getTranslations(lang)

    const html = generateActHtml(invoice, org?.name || "", inv, t, lang)

    const format = searchParams.get("format")
    if (format === "html") {
      return new NextResponse(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      })
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="act-${invoice.invoiceNumber}.html"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function generateActHtml(
  invoice: any,
  orgName: string,
  inv: Record<string, unknown>,
  t: ReturnType<typeof getTranslations>,
  lang: DocLanguage
): string {
  const companyName = (inv.companyName as string) || orgName
  // Strip surrounding quotes if any to avoid ""NAME"" duplication
  const cleanCompanyName = companyName.replace(/^["']+|["']+$/g, "")
  const companyNameUpper = cleanCompanyName.toUpperCase()
  const clientCompanyName = (invoice.company?.name as string) || ""
  const directorName = (inv.directorName as string) || ""
  const directorTitle = (inv.signerTitle as string) || ""
  const companyLogoUrl = (inv.companyLogoUrl as string) || ""
  const companyStampUrl = (inv.companyStampUrl as string) || ""
  // Bottom signer (act signer — different from director)
  const actSignerName = (inv.actSignerName as string) || ((invoice as any).signerName as string) || directorName
  const actSignerTitle = (inv.actSignerTitle as string) || ((invoice as any).signerTitle as string) || ""
  const actSignerSignatureUrl = (inv.actSignerSignatureUrl as string) || ""

  // Contract info
  const contract = invoice.contract as any
  const contractNumber = (contract?.contractNumber as string) || (invoice as any).contractNumber || ""
  const contractDate = contract?.startDate
    ? formatDate(contract.startDate as string, lang)
    : ((invoice as any).contractDate as string) || ""

  // Date calculations
  const issueDate = new Date(invoice.issueDate as string)
  const firstDay = getFirstDayOfMonth(issueDate)
  const lastDay = getLastDayOfMonth(issueDate)

  const subtotalNum = Number(invoice.subtotal || 0)
  const discountAmount = Number(invoice.discountAmount || 0)
  const taxAmount = Number(invoice.taxAmount || 0)
  const totalAmount = Number(invoice.totalAmount || 0)

  // Legal text with template variables
  const actIntro = fillTemplate(t.actIntroTemplate, {
    executor: companyName,
    customer: clientCompanyName,
    contractDate: contractDate,
    contractNumber: contractNumber,
  })

  const actClause1 = fillTemplate(t.actClause1Template, {
    dateFrom: formatDate(firstDay, lang),
    dateTo: formatDate(lastDay, lang),
    subtotal: formatMoney(subtotalNum, lang),
    subtotalWords: formatMoney(subtotalNum, lang),
  })

  // Logo block
  const logoHtml = companyLogoUrl
    ? `<div class="logo-block"><img src="${companyLogoUrl}" alt="${companyName}" style="max-height: 80px; max-width: 250px;" /></div>`
    : `<div class="logo-block"><div class="logo-text">${companyName}</div></div>`

  // Group items by category (description or customFields.project)
  const categoryMap = new Map<string, number>()
  for (const item of invoice.items as any[]) {
    const cf = (item.customFields || {}) as Record<string, string>
    const cat = cf.project || item.description || item.name || "Digər"
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + Number(item.total || 0))
  }

  const categoriesHtml = Array.from(categoryMap.entries())
    .map(([cat, total]) => `
    <tr>
      <td style="text-transform: uppercase; font-weight: 600; padding: 10px 15px; border-bottom: 1px solid #e5e5e5;">${cat}</td>
      <td style="text-align: right; font-weight: 500; padding: 10px 15px; border-bottom: 1px solid #e5e5e5;">${formatMoney(total, lang)}</td>
    </tr>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${t.actTitle} — ${invoice.invoiceNumber}</title>
<style>
  @media print {
    .no-print { display: none; }
    body { margin: 0; padding: 20px; }
    .page-break { page-break-before: always; }
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 30px 40px;
    color: #1a1a1a;
    font-size: 13px;
    line-height: 1.4;
  }
  .logo-block {
    text-align: center;
    margin-bottom: 20px;
  }
  .logo-text {
    font-size: 28px;
    font-weight: 700;
    color: #0891b2;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .approval-block {
    display: flex;
    justify-content: space-between;
    margin-bottom: 15px;
  }
  .approval-col {
    width: 45%;
    font-size: 13px;
    line-height: 1.8;
  }
  .approval-col .label {
    font-weight: 600;
  }
  .approval-col .company-name {
    font-weight: 700;
  }
  .act-title {
    text-align: center;
    font-size: 20px;
    font-weight: 700;
    font-style: italic;
    color: #1a1a1a;
    margin: 15px 0;
    text-transform: none;
  }
  .legal-block {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 15px;
    font-size: 12px;
    line-height: 1.5;
  }
  .legal-block .city-date {
    margin-bottom: 10px;
    color: #555;
  }
  .info-section {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    padding: 12px 15px;
    margin-bottom: 15px;
  }
  .info-header {
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
    color: #1a1a1a;
  }
  .info-header-line {
    height: 3px;
    background: #0891b2;
    margin-bottom: 15px;
    border-radius: 2px;
  }
  .info-table {
    width: 100%;
    border-collapse: collapse;
  }
  .info-table td {
    padding: 6px 0;
    font-size: 13px;
    vertical-align: top;
  }
  .info-table td:first-child {
    font-weight: 600;
    color: #555;
    width: 200px;
  }
  .services-header {
    font-size: 14px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1a1a1a;
    margin-bottom: 10px;
  }
  .services-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 20px;
  }
  .services-table th {
    background: #0891b2;
    color: white;
    padding: 10px 12px;
    text-align: left;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .services-table td {
    padding: 10px 12px;
    border-bottom: 1px solid #e5e5e5;
    font-size: 13px;
  }
  .services-table tr:nth-child(even) {
    background: #fafafa;
  }
  .summary-block {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 25px;
  }
  .summary-table {
    width: 300px;
    border-collapse: collapse;
  }
  .summary-table tr td {
    padding: 6px 0;
    font-size: 14px;
  }
  .summary-table tr td:last-child {
    text-align: right;
    font-weight: 500;
  }
  .summary-table .total-row {
    border-top: 2px solid #0891b2;
    font-size: 18px;
    font-weight: 700;
    color: #0891b2;
  }
  .summary-table .total-row td {
    padding-top: 10px;
  }
  .clauses-block {
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 12px;
    padding: 20px;
    margin-bottom: 30px;
    font-size: 13px;
    line-height: 1.8;
  }
  .clauses-block p {
    margin: 8px 0;
  }
  .signatures-block {
    display: flex;
    justify-content: space-between;
    margin-top: 25px;
  }
  .sig-col {
    width: 45%;
    font-size: 13px;
    line-height: 2;
  }
  .sig-col .sig-company {
    font-weight: 700;
    margin-bottom: 5px;
  }
  .page-break {
    page-break-before: always;
  }
  .print-btn {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #0891b2;
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 1000;
  }
  .print-btn:hover {
    background: #0e7490;
  }
</style>
</head>
<body>

<!-- ==================== PAGE 1 ==================== -->

${logoHtml}

<div class="approval-block">
  <div class="approval-col" style="position: relative;">
    <div class="label">${t.approve}</div>
    <div class="company-name">"${companyNameUpper}" MMC-nin</div>
    <div>${directorTitle || t.directorOf}</div>
    <div>${directorName || "_______________"}</div>
    <div>______________</div>
    <div style="color: #666; font-size: 12px;">${t.signAndStamp}</div>
    ${companyStampUrl ? `<img src="${companyStampUrl}" style="position: absolute; bottom: -30px; left: 0; width: 213px; height: 213px; object-fit: contain; opacity: 0.9;" />` : ""}
  </div>
  <div class="approval-col" style="text-align: right;">
    <div class="label">${t.approve}</div>
    <div class="company-name">"${clientCompanyName}"</div>
    <div>${t.directorOf}</div>
    <div>&nbsp;</div>
    <div>_______________</div>
    <div style="color: #666; font-size: 12px;">${t.signAndStamp}</div>
  </div>
</div>

<h1 class="act-title">${t.actTitle}</h1>

<div class="legal-block">
  <div class="city-date">
    <div>${t.city}</div>
    <div>${formatDate(invoice.issueDate, lang)}</div>
  </div>
  <p>${actIntro}</p>
</div>

<div class="info-section">
  <div class="info-header">${t.companyInfo}</div>
  <div class="info-header-line"></div>
  <table class="info-table">
    <tr>
      <td>${t.companyName}:</td>
      <td>${clientCompanyName}</td>
    </tr>
    <tr>
      <td>${t.documentNumber}:</td>
      <td>${invoice.invoiceNumber}</td>
    </tr>
    <tr>
      <td>${t.monthlyReport}:</td>
      <td>${formatMonthYear(invoice.issueDate, lang)}</td>
    </tr>
  </table>
</div>

<div class="services-header">${t.servicesProvided}</div>
<table class="services-table" style="margin-bottom: 15px;">
  <thead>
    <tr>
      <th>${t.description}</th>
      <th style="text-align: right; width: 150px;">${t.total}</th>
    </tr>
  </thead>
  <tbody>
    ${categoriesHtml}
  </tbody>
</table>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border: 1px solid #d1d5db;">
  <tr>
    <td style="padding: 8px 15px; font-weight: 600; border-bottom: 1px solid #e5e5e5;">${t.unit}:</td>
    <td style="padding: 8px 15px; text-align: right; border-bottom: 1px solid #e5e5e5;">${t.unitValue}</td>
  </tr>
  <tr>
    <td style="padding: 8px 15px; font-weight: 600;">${t.quantity}:</td>
    <td style="padding: 8px 15px; text-align: right;">1</td>
  </tr>
</table>

<div class="summary-block">
  <table class="summary-table">
    <tr>
      <td>${t.subtotal}:</td>
      <td>${formatMoney(subtotalNum, lang)} ${invoice.currency}</td>
    </tr>
    ${discountAmount > 0 ? `<tr><td>${t.discount}:</td><td>-${formatMoney(discountAmount, lang)} ${invoice.currency}</td></tr>` : ""}
    ${invoice.includeVat ? `<tr><td>${t.vat} (${Number(invoice.taxRate) <= 1 ? Math.round(Number(invoice.taxRate) * 100) : Math.round(Number(invoice.taxRate))}%):</td><td>${formatMoney(taxAmount, lang)} ${invoice.currency}</td></tr>` : ""}
    <tr class="total-row">
      <td>${t.grandTotal}:</td>
      <td>${formatMoney(totalAmount, lang)} ${invoice.currency}</td>
    </tr>
  </table>
</div>

<div class="clauses-block">
  <p>${actClause1}</p>
  <p>${t.actClause2}</p>
  <p>${t.actClause3}</p>
</div>

<div class="signatures-block">
  <div class="sig-col" style="position: relative;">
    <div class="sig-company">"${companyNameUpper}" MMC</div>
    <div>${actSignerTitle || ""}</div>
    <div style="font-weight: 600;">${actSignerName}</div>
    ${actSignerSignatureUrl ? `<img src="${actSignerSignatureUrl}" style="width: 160px; height: 80px; object-fit: contain; margin: 5px 0;" />` : ""}
    <div>${t.signature}:_______________</div>
  </div>
  <div class="sig-col" style="text-align: right;">
    <div class="sig-company">"${clientCompanyName}"</div>
    <div>${t.position}:_______________</div>
    <div>${t.fullName}:_______________</div>
    <div>${t.signature}:_______________</div>
  </div>
</div>

<button class="print-btn no-print" onclick="window.print()">${t.printButton}</button>
</body>
</html>`
}
