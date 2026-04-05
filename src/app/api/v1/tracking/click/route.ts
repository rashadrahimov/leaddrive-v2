import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { isPrivateUrl } from "@/lib/url-validation"
import { trackContactEvent } from "@/lib/contact-events"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const logId = searchParams.get("logId")
  const url = searchParams.get("url")

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 })
  }

  // SSRF protection
  if (isPrivateUrl(url)) {
    return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 })
  }

  if (logId) {
    try {
      const log = await prisma.emailLog.findUnique({ where: { id: logId } })
      if (log && !log.clickedAt) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { clickedAt: new Date(), status: "clicked" },
        })

        // Increment campaign click count
        if (log.campaignId) {
          await prisma.campaign.update({
            where: { id: log.campaignId },
            data: { totalClicked: { increment: 1 } },
          }).catch(() => {})
        }

        // Increment variant click count
        if (log.variantId) {
          await prisma.campaignVariant.update({
            where: { id: log.variantId },
            data: { totalClicked: { increment: 1 } },
          }).catch(() => {})
        }

        // Track contact event for engagement scoring
        if (log.contactId && log.organizationId) {
          trackContactEvent(log.organizationId, log.contactId, "email_clicked", { campaignId: log.campaignId, url }).catch(() => {})
        }
      }
    } catch (e) {
      console.error("[Tracking] Click tracking error:", e)
    }
  }

  return NextResponse.redirect(url, 302)
}
