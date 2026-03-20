/**
 * Build a Prisma WHERE clause from segment conditions.
 * Shared between preview API and dynamic segment recalculation.
 */
export function buildContactWhere(orgId: string, conditions: Record<string, any>) {
  const where: any = { organizationId: orgId }
  const AND: any[] = []

  if (conditions.company?.trim()) {
    AND.push({ company: { name: { contains: conditions.company, mode: "insensitive" } } })
  }
  if (conditions.source && conditions.source !== "") {
    AND.push({ source: conditions.source })
  }
  if (conditions.role?.trim()) {
    AND.push({ position: { contains: conditions.role, mode: "insensitive" } })
  }
  if (conditions.tag?.trim()) {
    AND.push({ tags: { has: conditions.tag } })
  }
  if (conditions.createdAfter || conditions.created_after) {
    AND.push({ createdAt: { gte: new Date(conditions.createdAfter || conditions.created_after) } })
  }
  if (conditions.createdBefore || conditions.created_before) {
    AND.push({ createdAt: { lte: new Date(conditions.createdBefore || conditions.created_before) } })
  }
  if (conditions.name?.trim()) {
    AND.push({ fullName: { contains: conditions.name, mode: "insensitive" } })
  }
  if (conditions.hasEmail || conditions.has_email) {
    AND.push({ email: { not: null } })
    AND.push({ NOT: { email: "" } })
  }
  if (conditions.hasPhone || conditions.has_phone) {
    AND.push({ phone: { not: null } })
    AND.push({ NOT: { phone: "" } })
  }

  if (AND.length > 0) where.AND = AND
  return where
}
