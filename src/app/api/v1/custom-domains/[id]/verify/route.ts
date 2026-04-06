import { NextRequest, NextResponse } from "next/server"
import dns from "dns"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/api-auth"

const CNAME_TARGET = "pages.leaddrivecrm.org"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession(req)
  if (!session?.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const domain = await prisma.customDomain.findFirst({
      where: { id, organizationId: session.orgId },
    })

    if (!domain) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    let verified = false
    let errorMessage: string | null = null

    try {
      const records = await dns.promises.resolveCname(domain.domain)
      verified = records.some(
        (record) => record.toLowerCase() === CNAME_TARGET.toLowerCase()
      )
      if (!verified) {
        errorMessage = `CNAME points to ${records.join(", ")} instead of ${CNAME_TARGET}`
      }
    } catch (dnsError: any) {
      if (dnsError.code === "ENODATA" || dnsError.code === "ENOTFOUND") {
        errorMessage = "No CNAME record found for this domain"
      } else {
        errorMessage = `DNS lookup failed: ${dnsError.code || dnsError.message}`
      }
    }

    const now = new Date()

    if (verified) {
      await prisma.customDomain.update({
        where: { id },
        data: {
          status: "dns_verified",
          dnsVerifiedAt: now,
          lastCheckedAt: now,
          errorMessage: null,
        },
      })

      return NextResponse.json({
        verified: true,
        status: "dns_verified",
        message: "DNS verified successfully",
      })
    } else {
      await prisma.customDomain.update({
        where: { id },
        data: {
          status: "error",
          lastCheckedAt: now,
          errorMessage,
        },
      })

      return NextResponse.json({
        verified: false,
        status: "error",
        message: errorMessage,
      })
    }
  } catch (error) {
    console.error("Failed to verify custom domain:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
