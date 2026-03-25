import { prisma } from "@/lib/prisma"

export async function sendFacebookMessage(
  psid: string,
  text: string,
  pageAccessToken: string,
  orgId: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: psid }, message: { text } }),
    })
    if (!res.ok) {
      console.error("Facebook send error:", await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error("Facebook send exception:", e)
    return false
  }
}

export async function sendInstagramMessage(
  igsid: string,
  text: string,
  pageAccessToken: string,
  orgId: string
): Promise<boolean> {
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: igsid }, message: { text } }),
    })
    if (!res.ok) {
      console.error("Instagram send error:", await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error("Instagram send exception:", e)
    return false
  }
}

export async function upsertSocialConversation(
  orgId: string,
  platform: string,
  externalId: string,
  contactName: string,
  lastMessage: string,
  channelConfigId?: string
) {
  return prisma.socialConversation.upsert({
    where: { organizationId_platform_externalId: { organizationId: orgId, platform, externalId } },
    create: {
      organizationId: orgId,
      platform,
      externalId,
      contactName,
      lastMessage,
      channelConfigId,
      lastMessageAt: new Date(),
    },
    update: {
      lastMessage,
      lastMessageAt: new Date(),
      unreadCount: { increment: 1 },
      contactName,
    },
  })
}
