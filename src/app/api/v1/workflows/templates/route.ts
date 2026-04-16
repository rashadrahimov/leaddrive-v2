import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { WORKFLOW_TEMPLATES, getTemplateById } from "@/lib/workflow-templates"

const applyTemplateSchema = z.object({
  templateId: z.string().min(1),
  name: z.string().max(200).optional(),
  isActive: z.boolean().optional().default(true),
})

/**
 * GET /api/v1/workflows/templates
 * Returns the catalog of pre-built workflow templates.
 * Clients resolve name/description via the workflowTemplates i18n namespace.
 */
export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json({ success: true, data: WORKFLOW_TEMPLATES })
}

/**
 * POST /api/v1/workflows/templates
 * Body: { templateId, name?, isActive? }
 * Creates a WorkflowRule + WorkflowAction[] from the template for the current org.
 */
export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })

  const parsed = applyTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  const template = getTemplateById(parsed.data.templateId)
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 })
  }

  try {
    const rule = await prisma.workflowRule.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name || template.id,
        entityType: template.entityType,
        triggerEvent: template.triggerEvent,
        conditions: template.conditions,
        isActive: parsed.data.isActive,
        actions: {
          create: template.actions.map((a) => ({
            actionType: a.actionType,
            actionConfig: a.actionConfig,
            actionOrder: a.actionOrder,
          })),
        },
      },
      include: { actions: true },
    })

    return NextResponse.json({ success: true, data: rule }, { status: 201 })
  } catch (e) {
    console.error("[workflows/templates] apply error:", e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
