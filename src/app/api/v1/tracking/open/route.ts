import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { trackContactEvent } from "@/lib/contact-events"

// 1x1 transparent GIF
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const logId = searchParams.get("logId")

  if (logId) {
    try {
      const log = await prisma.emailLog.findUnique({ where: { id: logId } })
      if (log && !log.openedAt) {
        await prisma.emailLog.update({
          where: { id: logId },
          data: { openedAt: new Date(), status: "opened" },
        })

        // Increment campaign open count
        if (log.campaignId) {
          await prisma.campaign.update({
            where: { id: log.campaignId },
            data: { totalOpened: { increment: 1 } },
          }).catch(() => {})
        }

        // Increment variant open count
        if (log.variantId) {
          await prisma.campaignVariant.update({
            where: { id: log.variantId },
            data: { totalOpened: { increment: 1 } },
          }).catch(() => {})
        }

        // Track contact event for engagement scoring
        if (log.contactId && log.organizationId) {
          trackContactEvent(log.organizationId, log.contactId, "email_opened", { campaignId: log.campaignId, variantId: log.variantId }).catch(() => {})
        }
      }
    } catch (e) {
      console.error("[Tracking] Open tracking error:", e)
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Pragma": "no-cache",
    },
  })
}
