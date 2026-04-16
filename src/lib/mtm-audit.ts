import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

/**
 * Write an entry to the MtmAuditLog table.
 * Always call with .catch(() => {}) so it never fails the main request.
 */
export async function writeMtmAudit(params: {
  organizationId: string
  agentId: string
  action: string // CHECK_IN, CHECK_OUT, TASK_COMPLETE, PHOTO_UPLOAD, ORDER_CREATE
  entity: string // visit, task, photo, order
  entityId: string
  newData?: any
  req?: NextRequest // to extract IP and user agent
}) {
  const ipAddress =
    params.req?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    params.req?.headers.get("x-real-ip") ||
    null
  const userAgent = params.req?.headers.get("user-agent") || null

  await prisma.mtmAuditLog.create({
    data: {
      organizationId: params.organizationId,
      agentId: params.agentId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      newData: params.newData ?? undefined,
      ipAddress,
      userAgent,
    },
  })
}
