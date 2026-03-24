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
  @page { size: A4; margin: 0; }
  @media print { .no-print { display: none !important; } @page { margin: 0; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', sans-serif; width: 794px; margin: 0 auto; color: #222; font-size: 11px; background: #fff; }

  /* ── TOP HEADER BAND ── */
  .hdr-band { background: #1a5c5c; color: white; padding: 18px 28px 14px; display: flex; justify-content: space-between; align-items: flex-end; }
  .hdr-company { font-size: 17px; font-weight: 800; letter-spacing: 0.5px; line-height: 1.2; }
  .hdr-company small { display: block; font-size: 10px; font-weight: 400; opacity: 0.75; margin-top: 2px; letter-spacing: 0.3px; }
  .hdr-inv { text-align: right; }
  .hdr-inv .title { font-size: 22px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; opacity: 0.95; }
  .hdr-inv .num { font-size: 12px; opacity: 0.7; margin-top: 2px; }

  /* ── DATES BAR ── */
  .dates-bar { background: #e8f4f4; border-bottom: 2px solid #1a5c5c; padding: 7px 28px; display: flex; gap: 32px; }
  .date-item { font-size: 10.5px; color: #1a5c5c; }
  .date-item strong { font-weight: 700; margin-right: 5px; }

  /* ── BODY ── */
  .body { padding: 16px 28px; }

  /* ── PARTIES ── */
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
  .party { border: 1px solid #d0e4e4; border-radius: 4px; overflow: hidden; }
  .party-hdr { background: #1a5c5c; color: white; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 12px; }
  .party-body { padding: 9px 12px; background: #f7fafa; }
  .pr { display: flex; padding: 2px 0; font-size: 10.5px; }
  .pr .k { width: 68px; color: #6b8f8f; flex-shrink: 0; }
  .pr .v { color: #222; font-weight: 600; }

  /* ── TABLE ── */
  .tbl { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  .tbl thead tr { background: #1a5c5c; }
  .tbl th { padding: 7px 10px; color: white; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  .tbl th:nth-child(n+3), .tbl td:nth-child(n+3) { text-align: right; }
  .tbl tbody tr:nth-child(even) { background: #f7fafa; }
  .tbl tbody tr { border-bottom: 1px solid #e8eded; }
  .tbl td { padding: 6px 10px; font-size: 10.5px; color: #333; vertical-align: top; }
  .tbl td:first-child { color: #aaa; font-size: 10px; }
  .tbl td:last-child { font-weight: 700; color: #1a5c5c; }

  /* ── SUMMARY ── */
  .sum-wrap { display: flex; justify-content: flex-end; margin: 6px 0 14px; }
  .sum-box { width: 230px; border: 1px solid #d0e4e4; border-radius: 4px; overflow: hidden; }
  .sum-row { display: flex; justify-content: space-between; padding: 4px 12px; font-size: 11px; border-bottom: 1px solid #eef4f4; color: #555; }
  .sum-row:last-child { border-bottom: none; }
  .sum-row.yekun { background: #1a5c5c; color: white; font-weight: 800; font-size: 12.5px; padding: 7px 12px; }

  /* ── BOTTOM ── */
  .bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bot-box { border: 1px solid #d0e4e4; border-radius: 4px; overflow: hidden; }
  .bot-hdr { background: #1a5c5c; color: white; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; padding: 5px 12px; }
  .bot-body { padding: 9px 12px; background: #f7fafa; }
  .br { display: flex; padding: 2px 0; font-size: 10.5px; }
  .br .k { width: 48px; color: #6b8f8f; flex-shrink: 0; }
  .br .v { color: #222; font-weight: 600; }
  .stamp-body { padding: 10px 12px; background: #f7fafa; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 175px; }
  .stamp-img { width: 155px; height: 155px; object-fit: contain; }
  .sig-line { border-top: 1.5px solid #333; width: 190px; margin: 10px auto 6px; }
  .sig-name { font-size: 11.5px; font-weight: 700; color: #1a5c5c; text-align: center; }
  .sig-title { font-size: 10px; color: #777; margin-top: 2px; text-align: center; }

  /* ── FOOTER ── */
  .footer { padding: 8px 28px 14px; font-size: 10px; color: #aaa; border-top: 1px solid #e8eded; margin-top: 12px; }

  /* ── PRINT BTN ── */
  .print-btn { position: fixed; bottom: 18px; right: 18px; background: #1a5c5c; color: white; border: none; padding: 10px 22px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 700; box-shadow: 0 4px 14px rgba(26,92,92,0.4); }
  .print-btn:hover { background: #0f766e; }
</style>
</head>
<body>

<div class="hdr-band">
  <div class="hdr-company">
    ${companyName}
    <small>${companyVoen ? 'VÖEN: ' + companyVoen : ''}${companyVoen && companyAddress ? ' · ' : ''}${companyAddress || ''}</small>
  </div>
  <div class="hdr-inv">
    <div class="title">Hesab-Faktura</div>
    <div class="num"># ${invoice.invoiceNumber}</div>
  </div>
</div>

<div class="dates-bar">
  <div class="date-item"><strong>Tarix:</strong>${formatDate(invoice.issueDate)}</div>
  <div class="date-item"><strong>Son ödəniş:</strong>${formatDate(invoice.dueDate)}</div>
  ${invoice.paymentTerms ? `<div class="date-item"><strong>Şərtlər:</strong>${invoice.paymentTerms}</div>` : ''}
  ${companyEmail ? `<div class="date-item"><strong>E-poçt:</strong>${companyEmail}</div>` : ''}
  ${companyPhone ? `<div class="date-item"><strong>Tel:</strong>${companyPhone}</div>` : ''}
</div>

<div class="body">

<div class="parties">
  <div class="party">
    <div class="party-hdr">İcraçı Şirkət</div>
    <div class="party-body">
      <div class="pr"><span class="k">Şirkət:</span><span class="v">${companyName}</span></div>
      <div class="pr"><span class="k">VÖEN:</span><span class="v">${companyVoen}</span></div>
      ${companyAddress ? `<div class="pr"><span class="k">Ünvan:</span><span class="v">${companyAddress}</span></div>` : ''}
    </div>
  </div>
  <div class="party">
    <div class="party-hdr">Sifarişçi Şirkət</div>
    <div class="party-body">
      <div class="pr"><span class="k">Şirkət:</span><span class="v">${clientCo?.name || '—'}</span></div>
      ${clientVoen ? `<div class="pr"><span class="k">VÖEN:</span><span class="v">${clientVoen}</span></div>` : ''}
      ${clientCo?.address ? `<div class="pr"><span class="k">Ünvan:</span><span class="v">${clientCo.address}</span></div>` : ''}
      ${clientCo?.email ? `<div class="pr"><span class="k">E-poçt:</span><span class="v">${clientCo.email}</span></div>` : ''}
      ${clientCo?.phone ? `<div class="pr"><span class="k">Tel:</span><span class="v">${clientCo.phone}</span></div>` : ''}
    </div>
  </div>
</div>

<table class="tbl">
  <thead>
    <tr>
      <th style="width:26px">#</th>
      <th>Məhsul / Xidmət</th>
      <th style="width:58px">Miqdar</th>
      <th style="width:108px">Qiymət</th>
      ${hasDiscounts ? '<th style="width:66px">Endirim</th>' : ''}
      <th style="width:108px">Cəm</th>
    </tr>
  </thead>
  <tbody>
    ${invoice.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${item.name}${item.description ? `<br><span style="color:#999;font-size:9.5px">${item.description}</span>` : ''}</td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unitPrice)} ${invoice.currency}</td>
      ${hasDiscounts ? `<td>${Number(item.discount) > 0 ? item.discount + '%' : '—'}</td>` : ''}
      <td>${formatMoney(item.total)} ${invoice.currency}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="sum-wrap">
  <div class="sum-box">
    <div class="sum-row"><span>Ara cəm</span><span>${formatMoney(invoice.subtotal)} ${invoice.currency}</span></div>
    ${Number(invoice.discountAmount) > 0 ? `<div class="sum-row"><span>Endirim</span><span>−${formatMoney(invoice.discountAmount)} ${invoice.currency}</span></div>` : ''}
    ${invoice.includeVat ? `<div class="sum-row"><span>ƏDV ${Number(invoice.taxRate) * 100}%</span><span>${formatMoney(invoice.taxAmount)} ${invoice.currency}</span></div>` : ''}
    <div class="sum-row yekun"><span>YEKUN</span><span>${formatMoney(invoice.totalAmount)} ${invoice.currency}</span></div>
    ${Number(invoice.paidAmount) > 0 ? `<div class="sum-row"><span>Ödənilmiş</span><span>${formatMoney(invoice.paidAmount)} ${invoice.currency}</span></div><div class="sum-row yekun"><span>QALIQ</span><span>${formatMoney(invoice.balanceDue)} ${invoice.currency}</span></div>` : ''}
  </div>
</div>

<div class="bottom">
  <div class="bot-box">
    <div class="bot-hdr">Bank Hesabı</div>
    <div class="bot-body">
      ${bankName ? `<div class="br"><span class="k">Bank:</span><span class="v">${bankName}</span></div>` : ''}
      ${bankVoen ? `<div class="br"><span class="k">VÖEN:</span><span class="v">${bankVoen}</span></div>` : ''}
      ${bankCode ? `<div class="br"><span class="k">Kod:</span><span class="v">${bankCode}</span></div>` : ''}
      ${bankSwift ? `<div class="br"><span class="k">SWIFT:</span><span class="v">${bankSwift}</span></div>` : ''}
      ${bankCorrAccount ? `<div class="br"><span class="k">M/H:</span><span class="v">${bankCorrAccount}</span></div>` : ''}
      ${bankAccount ? `<div class="br"><span class="k">H/H:</span><span class="v">${bankAccount}</span></div>` : ''}
    </div>
  </div>
  <div class="bot-box">
    <div class="bot-hdr">Təsdiq (İmza, Möhür)</div>
    <div class="stamp-body">
      ${withStamp && companyStampUrl ? `<img src="${companyStampUrl}" class="stamp-img" alt="Stamp" />` : ''}
      <div class="sig-line"></div>
      ${signerName ? `<div class="sig-name">${signerName}</div>` : ''}
      ${signerTitle ? `<div class="sig-title">${signerTitle}</div>` : ''}
    </div>
  </div>
</div>

</div>

${terms || footerNote ? `
<div class="footer">
  ${terms ? `<strong>Şərtlər:</strong> ${terms}<br>` : ''}
  ${footerNote || ''}
</div>` : ''}

<button class="print-btn no-print" onclick="window.print()">🖨️ Çap et / PDF</button>
</body>
</html>`
}
