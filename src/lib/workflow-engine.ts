import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

interface WorkflowAction {
  actionType: string
  actionConfig: Record<string, any>
}

export async function executeWorkflows(
  orgId: string,
  entityType: string,
  triggerEvent: string,
  entity: Record<string, any>
) {
  try {
    const rules = await prisma.workflowRule.findMany({
      where: {
        organizationId: orgId,
        entityType,
        triggerEvent,
        isActive: true,
      },
      include: {
        actions: { orderBy: { actionOrder: "asc" } },
      },
    })

    for (const rule of rules) {
      // Check conditions
      if (!evaluateConditions(rule.conditions as Record<string, any>, entity)) continue

      // Execute actions
      for (const action of rule.actions) {
        await executeAction(orgId, action as any, entity)
      }
    }
  } catch (e) {
    console.error("Workflow execution error:", e)
  }
}

function evaluateConditions(conditions: Record<string, any>, entity: Record<string, any>): boolean {
  if (!conditions || Object.keys(conditions).length === 0) return true

  // Simple condition evaluation: { field: value } or { field: { operator: value } }
  for (const [field, expected] of Object.entries(conditions)) {
    const actual = entity[field]

    if (typeof expected === "object" && expected !== null) {
      const { eq, ne, gt, lt, contains } = expected
      if (eq !== undefined && actual !== eq) return false
      if (ne !== undefined && actual === ne) return false
      if (gt !== undefined && actual <= gt) return false
      if (lt !== undefined && actual >= lt) return false
      if (contains !== undefined && typeof actual === "string" && !actual.includes(contains)) return false
    } else {
      if (actual !== expected) return false
    }
  }
  return true
}

async function executeAction(
  orgId: string,
  action: { actionType: string; actionConfig: Record<string, any> },
  entity: Record<string, any>
) {
  const config = (typeof action.actionConfig === "object" ? action.actionConfig : {}) as Record<string, any>

  switch (action.actionType) {
    case "notify":
      await createNotification({
        organizationId: orgId,
        userId: config.userId || entity.assignedTo || "",
        type: "info",
        title: config.title || "Workflow Notification",
        message: config.message || `Action triggered for ${entity.title || entity.name || "item"}`,
        entityType: config.entityType,
        entityId: entity.id,
      })
      break

    case "create_task":
      await prisma.task.create({
        data: {
          organizationId: orgId,
          title: config.title || `Follow up: ${entity.title || entity.name || "item"}`,
          description: config.description || "",
          status: "pending",
          priority: config.priority || "medium",
          assignedTo: config.assignedTo || entity.assignedTo,
          relatedType: config.entityType,
          relatedId: entity.id,
        },
      })
      break

    case "update_field":
      if (config.model && config.field && config.value) {
        try {
          const model = (prisma as any)[config.model]
          if (model) {
            await model.updateMany({
              where: { id: entity.id, organizationId: orgId },
              data: { [config.field]: config.value },
            })
          }
        } catch (e) {
          console.error("Update field action failed:", e)
        }
      }
      break

    case "auto_assign":
      // Simple round-robin or rule-based assignment
      if (config.assignTo) {
        try {
          const model = (prisma as any)[config.model || "deal"]
          if (model) {
            await model.updateMany({
              where: { id: entity.id, organizationId: orgId },
              data: { assignedTo: config.assignTo },
            })
          }
        } catch (e) {
          console.error("Auto assign action failed:", e)
        }
      }
      break

    default:
      console.warn(`Unknown action type: ${action.actionType}`)
  }
}
