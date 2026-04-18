import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { pollTwitterAccount } from "@/lib/social/twitter-poller"
import { pollTikTokAccount } from "@/lib/social/tiktok-poller"
import { pollYouTubeAccount } from "@/lib/social/youtube-poller"
import { pollVkAccount } from "@/lib/social/vk-poller"
import { scanTelegramForOrg } from "@/lib/social/telegram-scanner"
import { pollFacebookAccount, pollInstagramAccount } from "@/lib/social/facebook-poller"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const account = await prisma.socialAccount.findFirst({ where: { id, organizationId: orgId } })
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let result: { ingested: number; error?: string } = { ingested: 0 }
  switch (account.platform) {
    case "twitter":
      result = await pollTwitterAccount(account.id)
      break
    case "tiktok":
      result = await pollTikTokAccount(account.id)
      break
    case "youtube":
      result = await pollYouTubeAccount(account.id)
      break
    case "vkontakte":
      result = await pollVkAccount(account.id)
      break
    case "telegram":
      result = await scanTelegramForOrg(orgId)
      break
    case "facebook":
      result = await pollFacebookAccount(account.id)
      break
    case "instagram":
      result = await pollInstagramAccount(account.id)
      break
    default:
      return NextResponse.json(
        { error: `Polling for ${account.platform} uses webhook delivery — POST to /api/v1/webhooks/meta-social instead.` },
        { status: 501 },
      )
  }

  return NextResponse.json({ success: !result.error, data: result })
}
