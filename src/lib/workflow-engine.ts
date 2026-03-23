import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"

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
      if (!evaluateConditions(rule.conditions as any, entity)) continue

      for (const action of rule.actions) {
        await executeAction(orgId, entityType, action as any, entity)
      }
    }
  } catch (e) {
    console.error("Workflow execution error:", e)
  }
}

function evaluateConditions(conditions: any, entity: Record<string, any>): boolean {
  if (!conditions || (typeof conditions === "object" && Object.keys(conditions).length === 0)) return true

  // New format: { rules: [{ field, operator, value }] }
  if (conditions.rules && Array.isArray(conditions.rules)) {
    for (const rule of conditions.rules) {
      const actual = entity[rule.field]
      const expected = rule.value

      switch (rule.operator) {
        case "equals":
          if (String(actual) !== String(expected)) return false
          break
        case "not_equals":
          if (String(actual) === String(expected)) return false
          break
        case "contains":
          if (typeof actual !== "string" || !actual.toLowerCase().includes(String(expected).toLowerCase())) return false
          break
        case "not_empty":
          if (!actual && actual !== 0) return false
          break
        case "greater_than":
          if (Number(actual) <= Number(expected)) return false
          break
        case "less_than":
          if (Number(actual) >= Number(expected)) return false
          break
      }
    }
    return true
  }

  // Legacy format: { field: value } or { field: { eq, ne, gt, lt, contains } }
  for (const [field, expected] of Object.entries(conditions)) {
    if (field === "rules") continue
    const actual = entity[field]

    if (typeof expected === "object" && expected !== null) {
      const { eq, ne, gt, lt, contains } = expected as any
      if (eq !== undefined && actual !== eq) return false
      if (ne !== undefined && actual === ne) return false
      if (gt !== undefined && actual <= gt) return false
      if (lt !== undefined && actual >= lt) return false
      if (contains !== undefined && typeof actual === "string" && !actual.includes(contains)) return false
    } else {
      if (String(actual) !== String(expected)) return false
    }
  }
  return true
}

async function executeAction(
  orgId: string,
  entityType: string,
  action: { actionType: string; actionConfig: Record<string, any> },
  entity: Record<string, any>
) {
  const config = (typeof action.actionConfig === "object" && action.actionConfig) ? action.actionConfig : {} as Record<string, any>

  switch (action.actionType) {
    case "send_notification":
    case "notify":
      await createNotification({
        organizationId: orgId,
        userId: config.userId || entity.assignedTo || "",
        type: "info",
        title: config.title || "Workflow",
        message: config.message || `Action triggered for ${entity.title || entity.name || entity.contactName || "item"}`,
        entityType,
        entityId: entity.id,
      })
      break

    case "create_task":
      await prisma.task.create({
        data: {
          organizationId: orgId,
          title: config.title || `Follow up: ${entity.title || entity.name || entity.contactName || "item"}`,
          description: config.description || "",
          status: "pending",
          priority: config.priority || "medium",
          assignedTo: config.assignee || config.assignedTo || entity.assignedTo,
          relatedType: entityType,
          relatedId: entity.id,
        },
      })
      break

    case "update_field":
      if (config.field && config.value !== undefined) {
        try {
          const modelName = config.model || entityType
          const model = (prisma as any)[modelName]
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
      if (config.assignTo) {
        try {
          const modelName = config.model || entityType
          const model = (prisma as any)[modelName]
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

    case "send_email":
      // TODO: integrate with SMTP when configured
      console.log(`[Workflow] send_email action — template: ${config.template || "none"}, subject: ${config.subject || "none"}, entity: ${entity.id}`)
      break

    case "webhook":
      if (config.url) {
        try {
          await fetch(config.url, {
            method: config.method || "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: `${entityType}.workflow`,
              organizationId: orgId,
              entity,
              timestamp: new Date().toISOString(),
            }),
          })
        } catch (e) {
          console.error("Webhook action failed:", e)
        }
      }
      break

    default:
      console.warn(`Unknown workflow action type: ${action.actionType}`)
  }
}
