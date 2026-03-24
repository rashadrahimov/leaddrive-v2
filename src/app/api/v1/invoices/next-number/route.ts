import { NextRequest, NextResponse } from "next/server"
import { getOrgId } from "@/lib/api-auth"
import { generateInvoiceNumber } from "@/lib/invoice-number"

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const number = await generateInvoiceNumber(orgId)
    return NextResponse.json({ success: true, data: { number } })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
