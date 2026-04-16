/**
 * Pre-built workflow automation templates.
 *
 * These are used by /settings/workflows/templates to let users apply
 * common automations in one click instead of building from scratch.
 *
 * Each template maps to a WorkflowRule + WorkflowAction[] created via
 * POST /api/v1/workflows/templates.
 *
 * To add a new template:
 * 1. Append an entry to WORKFLOW_TEMPLATES below
 * 2. Add i18n keys under workflowTemplates.items.{id}.(name|description) in all 3 messages files
 * 3. Add icon name to the ICONS map in the UI page
 */

export interface WorkflowTemplateAction {
  actionType: string
  actionConfig: Record<string, any>
  actionOrder: number
}

export interface WorkflowTemplate {
  id: string
  nameKey: string            // resolves under workflowTemplates namespace
  descriptionKey: string
  category: "sales" | "support" | "marketing" | "operations"
  icon: string               // lucide-react icon name
  entityType: string         // deal | lead | ticket | task | contact | company
  triggerEvent: string       // created | updated | resolved | ...
  conditions: Record<string, any>
  actions: WorkflowTemplateAction[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "welcome-new-lead",
    nameKey: "items.welcomeNewLead.name",
    descriptionKey: "items.welcomeNewLead.description",
    category: "sales",
    icon: "UserPlus",
    entityType: "lead",
    triggerEvent: "created",
    conditions: {},
    actions: [
      {
        actionType: "send_email",
        actionConfig: {
          subject: "Welcome! We received your inquiry",
          body: "<p>Hi {{firstName}},</p><p>Thanks for your interest. Our team will reach out shortly.</p>",
        },
        actionOrder: 0,
      },
    ],
  },
  {
    id: "auto-assign-lead",
    nameKey: "items.autoAssignLead.name",
    descriptionKey: "items.autoAssignLead.description",
    category: "sales",
    icon: "Users",
    entityType: "lead",
    triggerEvent: "created",
    conditions: {},
    actions: [
      {
        actionType: "auto_assign",
        actionConfig: { strategy: "round_robin" },
        actionOrder: 0,
      },
      {
        actionType: "send_notification",
        actionConfig: {
          title: "New lead assigned",
          message: "A new lead was auto-assigned to you",
        },
        actionOrder: 1,
      },
    ],
  },
  {
    id: "deal-won-thank-you",
    nameKey: "items.dealWonThankYou.name",
    descriptionKey: "items.dealWonThankYou.description",
    category: "sales",
    icon: "Trophy",
    entityType: "deal",
    triggerEvent: "updated",
    conditions: { rules: [{ field: "status", operator: "equals", value: "won" }] },
    actions: [
      {
        actionType: "send_email",
        actionConfig: {
          subject: "Thank you for choosing us!",
          body: "<p>We're excited to work with you. You'll hear from our onboarding team soon.</p>",
        },
        actionOrder: 0,
      },
      {
        actionType: "create_task",
        actionConfig: { title: "Kickoff call with new customer", priority: "high" },
        actionOrder: 1,
      },
    ],
  },
  {
    id: "new-ticket-acknowledge",
    nameKey: "items.newTicketAcknowledge.name",
    descriptionKey: "items.newTicketAcknowledge.description",
    category: "support",
    icon: "Ticket",
    entityType: "ticket",
    triggerEvent: "created",
    conditions: {},
    actions: [
      {
        actionType: "send_email",
        actionConfig: {
          subject: "Your request has been received — #{{id}}",
          body: "<p>We received your ticket and our team will respond shortly.</p>",
        },
        actionOrder: 0,
      },
    ],
  },
  {
    id: "high-priority-alert",
    nameKey: "items.highPriorityAlert.name",
    descriptionKey: "items.highPriorityAlert.description",
    category: "support",
    icon: "AlertTriangle",
    entityType: "ticket",
    triggerEvent: "updated",
    conditions: { rules: [{ field: "priority", operator: "equals", value: "high" }] },
    actions: [
      {
        actionType: "send_notification",
        actionConfig: {
          title: "High priority ticket",
          message: "Ticket {{subject}} requires attention",
        },
        actionOrder: 0,
      },
      {
        actionType: "slack_notify",
        actionConfig: { message: "High priority ticket needs attention" },
        actionOrder: 1,
      },
    ],
  },
  {
    id: "deal-stuck-followup",
    nameKey: "items.dealStuckFollowup.name",
    descriptionKey: "items.dealStuckFollowup.description",
    category: "sales",
    icon: "Clock",
    entityType: "deal",
    triggerEvent: "updated",
    conditions: { rules: [{ field: "stage", operator: "equals", value: "negotiation" }] },
    actions: [
      {
        actionType: "create_task",
        actionConfig: { title: "Follow up on stalled deal", priority: "medium" },
        actionOrder: 0,
      },
    ],
  },
  {
    id: "missed-call-sms",
    nameKey: "items.missedCallSms.name",
    descriptionKey: "items.missedCallSms.description",
    category: "operations",
    icon: "PhoneMissed",
    entityType: "call",
    triggerEvent: "missed",
    conditions: {},
    actions: [
      {
        actionType: "send_sms",
        actionConfig: {
          message: "Sorry we missed your call. We'll get back to you shortly. — LeadDrive team",
        },
        actionOrder: 0,
      },
      {
        actionType: "create_task",
        actionConfig: { title: "Call back missed caller", priority: "medium" },
        actionOrder: 1,
      },
    ],
  },
]

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id)
}
