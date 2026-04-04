/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Prisma client with multi-tenant extensions.
 *
 * NOTE: PrismaClient will be available after `npx prisma generate` is run
 * (requires network for engine download). Until then, this exports a placeholder.
 * Run `npx prisma generate` after Docker setup (Task 0.16).
 */

let PrismaClientClass: any

try {
  const mod = require("@prisma/client")
  PrismaClientClass = mod.PrismaClient
  if (!PrismaClientClass) {
    console.error("[prisma.ts] PrismaClient is undefined in @prisma/client, keys:", Object.keys(mod).slice(0, 10))
  }
} catch (err: any) {
  console.error("[prisma.ts] Failed to load @prisma/client:", err?.message)
  // PrismaClient not generated yet — provide stub for build
  PrismaClientClass = class StubPrismaClient {
    $extends() { return this }
  }
}

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClientClass> }

let basePrisma: any
if (globalForPrisma.prisma) {
  basePrisma = globalForPrisma.prisma
  console.log("[prisma.ts] Reusing existing globalThis.prisma, has dealCompetitor:", "dealCompetitor" in basePrisma)
} else {
  basePrisma = new PrismaClientClass({ log: process.env.NODE_ENV === "production" ? ["error", "warn"] : ["query", "error", "warn"] })
  console.log("[prisma.ts] Created new PrismaClient, has dealCompetitor:", "dealCompetitor" in basePrisma)
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = basePrisma

export const prisma = basePrisma

/**
 * Create a tenant-scoped prisma client.
 * All queries automatically filter by organizationId.
 * All creates automatically inject organizationId.
 */
export function tenantPrisma(organizationId: string) {
  return basePrisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }: any) {
          args.where = { ...args.where, organizationId }
          return query(args)
        },
        async findFirst({ args, query }: any) {
          args.where = { ...args.where, organizationId }
          return query(args)
        },
        async findUnique({ args, query }: any) {
          const result = await query(args)
          // Verify tenant isolation: reject if result belongs to a different org
          if (result && "organizationId" in result && result.organizationId !== organizationId) {
            return null
          }
          return result
        },
        async create({ args, query }: any) {
          if (args.data && typeof args.data === "object" && !Array.isArray(args.data)) {
            args.data.organizationId = organizationId
          }
          return query(args)
        },
        async update({ args, query }: any) {
          args.where = { ...args.where, organizationId }
          return query(args)
        },
        async delete({ args, query }: any) {
          args.where = { ...args.where, organizationId }
          return query(args)
        },
        async count({ args, query }: any) {
          args.where = { ...args.where, organizationId }
          return query(args)
        },
      },
    },
  })
}

/** Fire-and-forget audit log entry */
export function logAudit(orgId: string, action: string, entityType: string, entityId: string, entityName?: string, extra?: { oldValue?: any; newValue?: any }) {
  prisma.auditLog.create({
    data: {
      organizationId: orgId,
      action,
      entityType,
      entityId,
      entityName: entityName || undefined,
      oldValue: extra?.oldValue || undefined,
      newValue: extra?.newValue || undefined,
    },
  }).catch(() => {})
}

/** Fire-and-forget budget change log for Time Machine */
export function logBudgetChange(opts: {
  orgId: string
  planId: string
  entityType: string
  entityId: string
  action: string
  field?: string
  oldValue?: any
  newValue?: any
  snapshot?: any
  userId?: string
}) {
  prisma.budgetChangeLog.create({
    data: {
      organizationId: opts.orgId,
      planId: opts.planId,
      entityType: opts.entityType,
      entityId: opts.entityId,
      action: opts.action,
      field: opts.field || undefined,
      oldValue: opts.oldValue ?? undefined,
      newValue: opts.newValue ?? undefined,
      snapshot: opts.snapshot ?? undefined,
      userId: opts.userId || undefined,
    },
  }).catch(() => {})
}
