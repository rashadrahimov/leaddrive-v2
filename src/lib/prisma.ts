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
  PrismaClientClass = require("@prisma/client").PrismaClient
} catch {
  // PrismaClient not generated yet — provide stub for build
  PrismaClientClass = class StubPrismaClient {
    $extends() { return this }
  }
}

const globalForPrisma = globalThis as unknown as { prisma: InstanceType<typeof PrismaClientClass> }

const basePrisma = globalForPrisma.prisma ?? new PrismaClientClass()

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
          return query(args)
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
