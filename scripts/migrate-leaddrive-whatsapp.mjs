// One-shot backfill: seed LeadDrive tenant's WhatsApp ChannelConfig from
// WHATSAPP_* env vars so removing the env-fallback in src/lib/whatsapp.ts
// doesn't silently break production. Safe to run multiple times.
//
// Usage:
//   node scripts/migrate-leaddrive-whatsapp.mjs
//
// Reads env:
//   WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
//   WHATSAPP_BUSINESS_ACCOUNT_ID, WHATSAPP_VERIFY_TOKEN
//   DATABASE_URL

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const waba = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (!token || !phoneNumberId) {
    console.log("[wa-migrate] env has no WHATSAPP_ACCESS_TOKEN / _PHONE_NUMBER_ID — nothing to backfill")
    return
  }

  const org = await prisma.organization.findUnique({ where: { slug: "leaddrive" } })
  if (!org) {
    console.log("[wa-migrate] tenant 'leaddrive' not found — skip")
    return
  }

  const existing = await prisma.channelConfig.findFirst({
    where: { organizationId: org.id, channelType: "whatsapp" },
  })

  if (existing) {
    // Update only if the new columns are still empty (idempotent).
    const patch = {}
    if (!existing.accessToken)       patch.accessToken       = token
    if (!existing.phoneNumberId)     patch.phoneNumberId     = phoneNumberId
    if (!existing.businessAccountId && waba) patch.businessAccountId = waba
    if (!existing.verifyToken && verifyToken) patch.verifyToken = verifyToken

    if (Object.keys(patch).length === 0) {
      console.log("[wa-migrate] LeadDrive WhatsApp already configured — no-op")
      return
    }

    await prisma.channelConfig.update({ where: { id: existing.id }, data: patch })
    console.log(`[wa-migrate] LeadDrive WhatsApp patched — ${Object.keys(patch).join(", ")}`)
    return
  }

  await prisma.channelConfig.create({
    data: {
      organizationId: org.id,
      channelType: "whatsapp",
      configName: "LeadDrive WhatsApp Business",
      accessToken: token,
      phoneNumberId,
      businessAccountId: waba || null,
      verifyToken: verifyToken || null,
      apiKey: token,                 // legacy alias during transition
      phoneNumber: phoneNumberId,    // legacy alias
      webhookUrl: waba || null,      // legacy alias for businessAccountId
      isActive: true,
      displayName: "LeadDrive Inc.",
    },
  })
  console.log("[wa-migrate] LeadDrive WhatsApp ChannelConfig created from env")
}

main()
  .catch((e) => { console.error("[wa-migrate]", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
