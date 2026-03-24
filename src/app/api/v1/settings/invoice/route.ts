import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const settings = (org?.settings as Record<string, unknown>) || {}
    const invoiceSettings = (settings.invoice as Record<string, unknown>) || {
      numberPrefix: "INV-",
      defaultPaymentTerms: "net30",
      defaultTaxRate: 0.18,
      defaultCurrency: "AZN",
      companyName: "",
      companyAddress: "",
      companyVoen: "",
      companyLogoUrl: "",
      companyPhone: "",
      companyEmail: "",
      directorName: "",
      directorTitle: "Direktor",
      bankName: "",
      bankCode: "",
      bankSwift: "",
      bankAccount: "",
      bankVoen: "",
      bankCorrAccount: "",
      footerNote: "",
      termsAndConditions: "",
    }

    return NextResponse.json({ success: true, data: invoiceSettings })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { settings: true },
    })

    const settings = (org?.settings as Record<string, unknown>) || {}
    settings.invoice = body

    await prisma.organization.update({
      where: { id: orgId },
      data: { settings },
    })

    return NextResponse.json({ success: true, data: body })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
