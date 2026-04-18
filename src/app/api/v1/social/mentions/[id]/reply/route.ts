import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { decryptToken } from "@/lib/secure-token"

const schema = z.object({
  text: z.string().min(1).max(280),
})

/**
 * Publish a reply to a social mention from within the app.
 * Currently supported: Twitter/X. Other platforms return 501.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(req, "campaigns", "write")
  if (isAuthError(auth)) return auth
  const orgId = auth.orgId
  const { id } = await params

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })

  const mention = await prisma.socialMention.findFirst({
    where: { id, organizationId: orgId },
    include: { account: true },
  })
  if (!mention) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (mention.platform === "twitter") {
    if (!mention.account?.accessToken) {
      return NextResponse.json({ error: "No connected Twitter account for this mention" }, { status: 400 })
    }
    let accessToken: string
    try {
      const decrypted = decryptToken(mention.account.accessToken, "oauth:twitter")
      accessToken = decrypted.split("::")[0] || ""
    } catch {
      return NextResponse.json({ error: "Stored token is corrupted — reconnect the account" }, { status: 400 })
    }
    if (!accessToken) return NextResponse.json({ error: "Token unavailable — reconnect the account" }, { status: 400 })

    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: parsed.data.text,
        reply: { in_reply_to_tweet_id: mention.externalId },
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Twitter reply failed: ${err}` }, { status: 502 })
    }
    const json = (await res.json()) as { data?: { id: string; text: string } }

    await prisma.socialMention.update({
      where: { id },
      data: {
        status: "replied",
        handledAt: new Date(),
        handledBy: auth.userId,
      },
    })

    return NextResponse.json({ success: true, data: { replyId: json.data?.id, text: json.data?.text } })
  }

  return NextResponse.json(
    { error: `Replying on ${mention.platform} is not supported yet.` },
    { status: 501 },
  )
}
