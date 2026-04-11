import { prisma, logAudit } from "@/lib/prisma"
import { DEFAULT_CURRENCY } from "@/lib/constants"
import { TOOL_META } from "./tools"

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
  requiresApproval?: boolean
  pendingActionId?: string
}

export async function executeTool(
  toolName: string,
  input: Record<string, any>,
  orgId: string,
  userId: string,
  skipApprovalCheck = false,
): Promise<ToolResult> {
  const meta = TOOL_META[toolName]
  if (!meta) return { success: false, error: `Unknown tool: ${toolName}` }

  // High-risk tools require approval (unless already approved)
  if (meta.requiresApproval && !skipApprovalCheck) {
    const pending = await prisma.aiPendingAction.create({
      data: {
        organizationId: orgId,
        userId,
        toolName,
        toolInput: input,
        status: "pending",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    })
    return { success: false, requiresApproval: true, pendingActionId: pending.id, data: input }
  }

  try {
    switch (toolName) {
      case "add_note":
        return await executeAddNote(input, orgId, userId)
      case "log_activity":
        return await executeLogActivity(input, orgId, userId)
      case "create_task":
        return await executeCreateTask(input, orgId, userId)
      case "update_deal_stage":
        return await executeUpdateDealStage(input, orgId, userId)
      case "create_ticket":
        return await executeCreateTicket(input, orgId, userId)
      case "create_deal":
        return await executeCreateDeal(input, orgId, userId)
      case "send_email":
        return await executeSendEmail(input, orgId, userId)
      case "update_contact":
        return await executeUpdateContact(input, orgId, userId)
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (err: any) {
    console.error(`Tool execution error [${toolName}]:`, err)
    return { success: false, error: err.message || "Execution failed" }
  }
}

async function executeAddNote(input: any, orgId: string, userId: string): Promise<ToolResult> {
  const activity = await prisma.activity.create({
    data: {
      organizationId: orgId,
      type: "note",
      subject: "AI Note",
      description: input.content,
      createdBy: userId,
      relatedType: input.entityType,
      relatedId: input.entityId,
    },
  })
  logAudit(orgId, "ai_action", "add_note", activity.id, `AI: add_note`)
  return { success: true, data: { activityId: activity.id } }
}

async function executeLogActivity(input: any, orgId: string, userId: string): Promise<ToolResult> {
  const activity = await prisma.activity.create({
    data: {
      organizationId: orgId,
      type: input.type,
      subject: input.subject,
      description: input.description || "",
      contactId: input.contactId || undefined,
      createdBy: userId,
      relatedType: input.relatedType || undefined,
      relatedId: input.relatedId || undefined,
    },
  })
  logAudit(orgId, "ai_action", "log_activity", activity.id, `AI: ${input.type} - ${input.subject}`)
  return { success: true, data: { activityId: activity.id, type: input.type } }
}

async function executeCreateTask(input: any, orgId: string, userId: string): Promise<ToolResult> {
  const task = await prisma.task.create({
    data: {
      organizationId: orgId,
      title: input.title,
      description: input.description || "",
      assignedTo: input.assignedTo === "me" ? userId : (input.assignedTo || userId),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority || "medium",
      status: "pending",
      relatedType: input.relatedType || undefined,
      relatedId: input.relatedId || undefined,
      createdBy: userId,
    },
  })
  logAudit(orgId, "ai_action", "create_task", task.id, `AI: ${task.title}`)
  return { success: true, data: { taskId: task.id, title: task.title } }
}

async function executeUpdateDealStage(input: any, orgId: string, userId: string): Promise<ToolResult> {
  const deal = await prisma.deal.findFirst({
    where: { id: input.dealId, organizationId: orgId },
  })
  if (!deal) return { success: false, error: "Deal not found" }

  const oldStage = deal.stage
  await prisma.deal.update({
    where: { id: input.dealId },
    data: { stage: input.stage, stageChangedAt: new Date() },
  })
  logAudit(orgId, "ai_action", "update_deal_stage", input.dealId, `AI: ${oldStage} → ${input.stage}`)
  return { success: true, data: { dealId: input.dealId, oldStage, newStage: input.stage } }
}

async function executeCreateTicket(input: any, orgId: string, userId: string): Promise<ToolResult> {
  // Generate ticket number
  const lastTicket = await prisma.ticket.findFirst({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: { ticketNumber: true },
  })
  const lastNum = lastTicket?.ticketNumber ? parseInt(lastTicket.ticketNumber.replace("TK-", "")) : 0
  const ticketNumber = `TK-${String(lastNum + 1).padStart(4, "0")}`

  const ticket = await prisma.ticket.create({
    data: {
      organizationId: orgId,
      ticketNumber,
      subject: input.subject,
      description: input.description || "",
      priority: input.priority || "medium",
      category: input.category || "general",
      status: "new",
      contactId: input.contactId || undefined,
      companyId: input.companyId || undefined,
      createdBy: userId,
    },
  })
  logAudit(orgId, "ai_action", "create_ticket", ticket.id, `AI: ${ticketNumber} - ${input.subject}`)
  return { success: true, data: { ticketId: ticket.id, ticketNumber } }
}

async function executeCreateDeal(input: any, orgId: string, userId: string): Promise<ToolResult> {
  // Get default pipeline if not specified
  let pipelineId = input.pipelineId
  if (!pipelineId) {
    const defaultPipeline = await prisma.pipeline.findFirst({
      where: { organizationId: orgId, isDefault: true },
    })
    pipelineId = defaultPipeline?.id
  }

  // Get stage probability
  let probability = 0
  if (pipelineId && input.stage) {
    const stage = await prisma.pipelineStage.findFirst({
      where: { pipelineId, name: input.stage },
    })
    probability = stage?.probability || 0
  }

  const deal = await prisma.deal.create({
    data: {
      organizationId: orgId,
      name: input.name,
      valueAmount: input.valueAmount || 0,
      currency: input.currency || DEFAULT_CURRENCY,
      stage: input.stage || "LEAD",
      pipelineId: pipelineId || undefined,
      companyId: input.companyId || undefined,
      contactId: input.contactId || undefined,
      probability,
      assignedTo: userId,
    },
  })
  logAudit(orgId, "ai_action", "create_deal", deal.id, `AI: ${deal.name}`)
  return { success: true, data: { dealId: deal.id, name: deal.name } }
}

async function executeSendEmail(input: any, orgId: string, userId: string): Promise<ToolResult> {
  // Dynamic import to avoid circular dependency
  const { sendEmail } = await import("@/lib/email")
  const result = await sendEmail({
    to: input.to,
    subject: input.subject,
    html: input.body,
    organizationId: orgId,
    contactId: input.contactId,
    sentBy: userId,
  })
  if (!result.success) {
    return { success: false, error: result.error || "Email sending failed" }
  }
  logAudit(orgId, "ai_action", "send_email", (result as any).emailLogId || "", `AI: email to ${input.to}`)
  return { success: true, data: { to: input.to, subject: input.subject } }
}

async function executeUpdateContact(input: any, orgId: string, userId: string): Promise<ToolResult> {
  const contact = await prisma.contact.findFirst({
    where: { id: input.contactId, organizationId: orgId },
  })
  if (!contact) return { success: false, error: "Contact not found" }

  // Only allow safe fields
  const allowedFields = ["phone", "email", "position", "firstName", "lastName", "notes"]
  const updateData: Record<string, any> = {}
  for (const [key, value] of Object.entries(input.fields || {})) {
    if (allowedFields.includes(key)) {
      updateData[key] = value
    }
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "No valid fields to update" }
  }

  await prisma.contact.update({
    where: { id: input.contactId },
    data: updateData,
  })
  logAudit(orgId, "ai_action", "update_contact", input.contactId, `AI: updated ${Object.keys(updateData).join(", ")}`)
  return { success: true, data: { contactId: input.contactId, updatedFields: Object.keys(updateData) } }
}
