import { prisma } from "@/lib/prisma"

/**
 * Apply record-level sharing rules to a Prisma where clause.
 * Admin/Manager see everything. Others see own records + shared via rules.
 */
export async function applyRecordFilter(
  orgId: string,
  userId: string,
  role: string,
  entityType: string,
  baseWhere: any
) {
  if (role === "admin" || role === "manager") return baseWhere

  const rules = await prisma.sharingRule.findMany({
    where: { organizationId: orgId, entityType, isActive: true },
  })

  // Default: see only own records (assigned or created)
  const orConditions: any[] = [
    { assignedTo: userId },
    { createdBy: userId },
  ]

  if (rules.length === 0) {
    return { ...baseWhere, OR: orConditions }
  }

  for (const rule of rules) {
    if (rule.ruleType === "all") {
      return baseWhere // Full access for everyone
    }
    if (rule.ruleType === "role" && rule.targetRole === role) {
      if (rule.sourceRole) {
        const sourceUsers = await prisma.user.findMany({
          where: { organizationId: orgId, role: rule.sourceRole },
          select: { id: true },
        })
        const sourceIds = sourceUsers.map(u => u.id)
        orConditions.push({
          OR: [
            { assignedTo: { in: sourceIds } },
            { createdBy: { in: sourceIds } },
          ],
        })
      }
    }
  }

  return { ...baseWhere, OR: orConditions }
}
