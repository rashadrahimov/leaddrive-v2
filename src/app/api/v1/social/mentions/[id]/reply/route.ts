import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { requireAuth, isAuthError } from "@/lib/api-auth"
import { decryptToken } from "@/lib/secure-token"

const schema = z.object({
  text: z.string().min(1).max(2000),
})

const GRAPH = "https://graph.facebook.com/v21.0"

function appsecretProof(token: string): string | null {
  const secret = process.env.FACEBOOK_APP_SECRET
  if (!secret) return null
  return crypto.createHmac("sha256", secret).update(token).digest("hex")
}

/**
 * Publish a reply to a social mention from within the app.
 * Twitter/X: replies to the original tweet.
 * Facebook: comments and tagged posts — POSTs a reply comment.
 * Instagram: comments only — POSTs a reply on the comment.
 * Other platforms / unsupported sub-types return 400/501.
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
      data: { status: "replied", handledAt: new Date(), handledBy: auth.userId },
    })
    return NextResponse.json({ success: true, data: { replyId: json.data?.id, text: json.data?.text } })
  }

  if (mention.platform === "facebook" || mention.platform === "instagram") {
    if (!mention.account?.accessToken) {
      return NextResponse.json({ error: "No connected account for this mention" }, { status: 400 })
    }
    let token: string
    try {
      token = decryptToken(mention.account.accessToken, `oauth:${mention.platform}:${mention.account.handle}`)
    } catch {
      return NextResponse.json({ error: "Stored token is corrupted — reconnect the account" }, { status: 400 })
    }

    // externalId formats: c:<id> for comments, t:<id> for tagged posts
    const [kind, rawId] = mention.externalId.includes(":")
      ? mention.externalId.split(":", 2)
      : ["", mention.externalId]
    const targetId = rawId || mention.externalId

    let replyUrl: string
    if (mention.platform === "facebook") {
      // Both comment-replies and post-comments hit /{id}/comments on FB.
      replyUrl = `${GRAPH}/${targetId}/comments`
    } else {
      // IG: replies to a comment use /{comment_id}/replies; replying on a
      // tagged media isn't supported by this endpoint.
      if (kind !== "c") {
        return NextResponse.json({ error: "Replies are only supported on Instagram comments, not tagged media" }, { status: 400 })
      }
      replyUrl = `${GRAPH}/${targetId}/replies`
    }

    const proof = appsecretProof(token)
    const params = new URLSearchParams({ message: parsed.data.text, access_token: token })
    if (proof) params.set("appsecret_proof", proof)

    const res = await fetch(replyUrl, { method: "POST", body: params })
    if (!res.ok) {
      const err = await res.text()
      console.error(`[${mention.platform}-reply] failed:`, err)
      return NextResponse.json({ error: `${mention.platform} reply failed: ${err}` }, { status: 502 })
    }
    const json = await res.json() as { id?: string }

    await prisma.socialMention.update({
      where: { id },
      data: { status: "replied", handledAt: new Date(), handledBy: auth.userId },
    })
    return NextResponse.json({ success: true, data: { replyId: json.id } })
  }

  return NextResponse.json(
    { error: `Replying on ${mention.platform} is not supported yet.` },
    { status: 501 },
  )
}
