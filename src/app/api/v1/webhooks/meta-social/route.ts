import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { classifySentiment } from "@/lib/sentiment"

/**
 * Meta Graph webhook receiver — accepts Facebook Page and Instagram Business comment events.
 * To use:
 *   1. Create an app in the Meta Developer Console.
 *   2. Subscribe to the "feed" / "comments" events for your page/IG business account.
 *   3. Point the webhook at `https://<domain>/api/v1/webhooks/meta-social` with verify token
 *      set via env `META_WEBHOOK_VERIFY_TOKEN`. Signing secret goes in `META_WEBHOOK_SECRET`.
 */

// Verification handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")
  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge || "", { status: 200 })
  }
  return NextResponse.json({ error: "Verify failed" }, { status: 403 })
}

function verifySignature(raw: string, signature: string | null): boolean {
  const secret = process.env.META_WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex")
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  try {
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const raw = await req.text()
  const signature = req.headers.get("x-hub-signature-256")
  if (!verifySignature(raw, signature)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const entries: any[] = body.entry || []
  const object: string = body.object || ""
  // "page" for Facebook pages, "instagram" for IG Business
  const platform = object === "instagram" ? "instagram" : "facebook"

  let ingested = 0
  for (const entry of entries) {
    const pageId: string = entry.id || ""
    // Find the SocialAccount that owns this page / IG ID
    const account = await prisma.socialAccount.findFirst({
      where: { platform, handle: pageId },
    })
    if (!account) continue

    const changes: any[] = entry.changes || entry.messaging || []
    for (const c of changes) {
      const value = c.value || c
      // Comment on feed / IG media
      if (value.item === "comment" || value.comment_id) {
        const commentId = value.comment_id || value.id
        if (!commentId) continue
        const text: string = value.message || value.comment || value.text || ""
        if (!text) continue
        const from = value.from || {}
        const sentiment = await classifySentiment(text)
        try {
          await prisma.socialMention.upsert({
            where: {
              organizationId_platform_externalId: {
                organizationId: account.organizationId,
                platform,
                externalId: String(commentId),
              },
            },
            update: { text, sentiment },
            create: {
              organizationId: account.organizationId,
              accountId: account.id,
              platform,
              externalId: String(commentId),
              text,
              authorName: from.name || null,
              authorHandle: from.username || from.id || null,
              sentiment,
              publishedAt: value.created_time ? new Date(value.created_time) : new Date(),
            },
          })
          ingested++
        } catch (e) {
          console.error("[meta-webhook] upsert failed:", e)
        }
      }
    }
  }

  return NextResponse.json({ success: true, ingested })
}
