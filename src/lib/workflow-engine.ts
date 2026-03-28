import { prisma } from "@/lib/prisma"
import { createNotification } from "@/lib/notifications"
import { isPrivateUrl } from "@/lib/url-validation"

// Whitelist of fields that workflow actions are allowed to update per entity type
const SAFE_UPDATE_FIELDS: Record<string, Set<string>> = {
  deal: new Set(["stage", "status", "assignedTo", "priority", "notes", "tags"]),
  lead: new Set(["status", "priority", "assignedTo", "notes", "source", "tags"]),
  ticket: new Set(["status", "priority", "assignedTo", "category", "notes", "tags"]),
  task: new Set(["status", "priority", "assignedTo", "notes", "tags"]),
  contact: new Set(["status", "notes", "tags"]),
  company: new Set(["leadStatus", "notes", "tags"]),
}

// Normalize entity type: v1 uses plural "deals"/"leads", v2 uses singular "deal"/"lead"
function normalizeEntityType(et: string): string {
  const map: Record<string, string> = {
    deals: "deal", leads: "lead", tickets: "ticket",
    tasks: "task", contacts: "contact", companies: "company",
  }
  return map[et] || et
}

export async function executeWorkflows(
  orgId: string,
  entityType: string,
  triggerEvent: string,
  entity: Record<string, any>
) {
  try {
    // Search for both singular and plural entity types (v1 compat)
    const normalized = normalizeEntityType(entityType)
    const variants = [entityType]
    if (normalized !== entityType) variants.push(normalized)
    else variants.push(entityType + "s") // also check plural

    const rules = await prisma.workflowRule.findMany({
      where: {
        organizationId: orgId,
        entityType: { in: variants },
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
        await executeAction(orgId, normalized, action as any, entity)
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
  const entityName = entity.title || entity.name || entity.contactName || "item"

  switch (action.actionType) {
    case "send_notification":
    case "notify":
      // userId: "" means visible to all users in the org
      await createNotification({
        organizationId: orgId,
        userId: "",
        type: "info",
        title: config.title || "Workflow",
        message: config.message || config.value || `Action triggered for ${entityName}`,
        entityType,
        entityId: entity.id,
      })
      break

    case "create_task":
      await prisma.task.create({
        data: {
          organizationId: orgId,
          title: config.title || config.value || `Follow up: ${entityName}`,
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
      if (config.field && (config.value !== undefined)) {
        const allowedFields = SAFE_UPDATE_FIELDS[entityType]
        if (!allowedFields || !allowedFields.has(config.field)) {
          console.error(`[Workflow] Blocked update of restricted field: ${entityType}.${config.field}`)
          break
        }
        try {
          const model = (prisma as any)[entityType]
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
    case "assign_to": {
      const assignee = config.assignTo || config.assign_to || config.value
      if (assignee) {
        try {
          const model = (prisma as any)[entityType]
          if (model) {
            await model.updateMany({
              where: { id: entity.id, organizationId: orgId },
              data: { assignedTo: assignee },
            })
          }
        } catch (e) {
          console.error("Auto assign action failed:", e)
        }
      }
      break
    }

    case "send_email":
      // TODO: integrate with SMTP when configured
      console.log(`[Workflow] send_email action — template: ${config.template || "none"}, subject: ${config.subject || "none"}, entity: ${entity.id}`)
      break

    case "webhook":
      if (config.url) {
        if (isPrivateUrl(config.url)) {
          console.error("[Workflow] Blocked webhook to private URL:", config.url)
          break
        }
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
