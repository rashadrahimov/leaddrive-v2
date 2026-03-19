import { prisma } from "@/lib/prisma"

export async function createNotification({
  organizationId,
  userId,
  type = "info",
  title,
  message,
  entityType,
  entityId,
}: {
  organizationId: string
  userId?: string
  type?: "info" | "warning" | "error" | "success"
  title: string
  message: string
  entityType?: string
  entityId?: string
}) {
  try {
    return await prisma.notification.create({
      data: {
        organizationId,
        userId: userId || "",
        type,
        title,
        message,
        entityType,
        entityId,
      },
    })
  } catch (e) {
    console.error("Failed to create notification:", e)
    return null
  }
}
