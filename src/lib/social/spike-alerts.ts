import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

/**
 * Detect unusual spikes of negative sentiment per organization.
 * Alert fires when the last-hour negative count exceeds Nx the trailing-24h hourly average
 * AND is at least Y mentions. Thresholds are per-org in `Organization.settings.socialSpike`:
 *   {
 *     minAbsolute: number    // default 5
 *     multiplier:  number    // default 3
 *   }
 * Idempotent per hour (audit log hash tag).
 */
const DEFAULT_MIN = 5
const DEFAULT_MULT = 3

interface SpikeConfig {
  minAbsolute: number
  multiplier: number
}

function readConfig(settings: any): SpikeConfig {
  const s = settings?.socialSpike
  return {
    minAbsolute: Number.isFinite(s?.minAbsolute) ? Number(s.minAbsolute) : DEFAULT_MIN,
    multiplier: Number.isFinite(s?.multiplier) ? Number(s.multiplier) : DEFAULT_MULT,
  }
}

export async function detectNegativeSpikes(organizationId?: string): Promise<Array<{ orgId: string; hourCount: number; baseline: number }>> {
  const orgs = organizationId
    ? await prisma.organization.findMany({ where: { id: organizationId }, select: { id: true, settings: true } })
    : await prisma.organization.findMany({ where: { isActive: true }, select: { id: true, settings: true } })

  const now = new Date()
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const alerts: Array<{ orgId: string; hourCount: number; baseline: number }> = []

  for (const org of orgs) {
    const { minAbsolute, multiplier } = readConfig(org.settings)
    const hourCount = await prisma.socialMention.count({
      where: {
        organizationId: org.id,
        sentiment: "negative",
        publishedAt: { gt: hourAgo },
        externalId: { not: { startsWith: "__" } },
      },
    })
    if (hourCount < minAbsolute) continue

    const dayCount = await prisma.socialMention.count({
      where: {
        organizationId: org.id,
        sentiment: "negative",
        publishedAt: { gt: dayAgo, lte: hourAgo },
        externalId: { not: { startsWith: "__" } },
      },
    })
    const baseline = dayCount / 23 // trailing 23 hours
    if (hourCount < baseline * multiplier) continue

    // Idempotency: only alert once per hour per org
    const hourTag = `social-neg-spike:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}-${now.getUTCDate()}-${now.getUTCHours()}`
    const existing = await prisma.auditLog.findFirst({
      where: { organizationId: org.id, action: hourTag },
      select: { id: true },
    }).catch(() => null)
    if (existing) continue

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        action: hourTag,
        entityType: "social_mention",
        entityId: "spike",
      },
    }).catch(() => {})

    // Notify org admins
    try {
      const admins = await prisma.user.findMany({
        where: { organizationId: org.id, role: { in: ["admin", "manager"] } },
        select: { id: true },
      })
      for (const a of admins) {
        await createNotification({
          organizationId: org.id,
          userId: a.id,
          type: "warning",
          title: "Negative sentiment spike",
          message: `${hourCount} negative mentions in the last hour (baseline ${baseline.toFixed(1)}/h).`,
          entityType: "social_mention",
          entityId: "spike",
        }).catch(() => {})
      }
    } catch (e) {
      console.error("[spike-alert] notify failed:", e)
    }

    alerts.push({ orgId: org.id, hourCount, baseline })
  }
  return alerts
}
