import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma, logAudit } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"
import { getSession } from "@/lib/api-auth"
import { getFieldPermissions, filterEntityFields, filterWritableFields } from "@/lib/field-filter"
import { applyRecordFilter } from "@/lib/sharing-rules"
import { executeWorkflows } from "@/lib/workflow-engine"
import { createNotification } from "@/lib/notifications"
import { fireWebhooks } from "@/lib/webhooks"
import { trackContactEvent } from "@/lib/contact-events"
import { sendSlackNotification, formatDealNotification } from "@/lib/slack"

const createDealSchema = z.object({
  name: z.string().min(1).max(200),
  companyId: z.string().optional(),
  campaignId: z.string().optional(),
  stage: z.string().optional(),
  pipelineId: z.string().optional(),
  valueAmount: z.number().min(0).max(999999999).optional(),
  currency: z.string().max(5).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedClose: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search") || ""
  const stage = searchParams.get("stage") || ""
  const page = parseInt(searchParams.get("page") || "1")
  const limit = parseInt(searchParams.get("limit") || "50")
  if (isNaN(page) || isNaN(limit) || page < 1 || limit < 1 || limit > 200) {
    return NextResponse.json({ error: "Invalid page or limit" }, { status: 400 })
  }

  try {
    const companyId = searchParams.get("companyId")
    const pipelineId = searchParams.get("pipelineId")
    let where: any = {
      organizationId: orgId,
      ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
      ...(stage ? { stage } : {}),
      ...(companyId ? { companyId } : {}),
      ...(pipelineId ? { pipelineId } : {}),
    }
    where = await applyRecordFilter(orgId, session?.userId || "", role, "deal", where)

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          company: { select: { id: true, name: true } },
          campaign: { select: { id: true, name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ])

    // Weighted pipeline summary — computed from ALL org deals, not just paginated page
    const allActiveDeals = await prisma.deal.findMany({
      where: {
        organizationId: orgId,
        stage: { notIn: ["WON", "LOST"] },
        ...(pipelineId ? { pipelineId } : {}),
      },
      select: { stage: true, valueAmount: true, probability: true },
    })
    const totalPipeline = allActiveDeals.reduce((s: number, d: any) => s + (d.valueAmount || 0), 0)
    const weightedPipeline = allActiveDeals.reduce((s: number, d: any) => s + (d.valueAmount || 0) * ((d.probability || 0) / 100), 0)

    // Group by stage
    const stageMap: Record<string, { count: number; value: number; weighted: number }> = {}
    for (const d of allActiveDeals) {
      if (!stageMap[d.stage]) stageMap[d.stage] = { count: 0, value: 0, weighted: 0 }
      stageMap[d.stage].count++
      stageMap[d.stage].value += d.valueAmount || 0
      stageMap[d.stage].weighted += (d.valueAmount || 0) * ((d.probability || 0) / 100)
    }

    const pipelineSummary = {
      total: totalPipeline,
      weighted: Math.round(weightedPipeline),
      byStage: Object.entries(stageMap).map(([name, data]) => ({
        name,
        ...data,
        weighted: Math.round(data.weighted),
      })),
    }

    const fieldPerms = await getFieldPermissions(orgId, role, "deal")
    const filteredDeals = deals.map(d => filterEntityFields(d, fieldPerms, role))

    return NextResponse.json({ success: true, data: { deals: filteredDeals, total, page, limit, pipelineSummary } })
  } catch {
    return NextResponse.json({ success: true, data: { deals: [], total: 0, page, limit } })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  const orgId = session?.orgId || await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const role = session?.role || "admin"

  const body = await req.json()
  const filtered = await filterWritableFields(orgId, role, "deal", body)
  const parsed = createDealSchema.safeParse(filtered)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    // Resolve pipelineId: use provided or fallback to default
    let pipelineId = parsed.data.pipelineId || null
    if (!pipelineId) {
      const defaultPipeline = await prisma.pipeline.findFirst({
        where: { organizationId: orgId, isDefault: true },
        select: { id: true },
      })
      pipelineId = defaultPipeline?.id || null
    }

    // Get probability from pipeline stage if not explicitly set
    let probability = parsed.data.probability
    if (probability === undefined && pipelineId) {
      const stageData = await prisma.pipelineStage.findFirst({
        where: { pipelineId, name: parsed.data.stage || "LEAD" },
        select: { probability: true },
      })
      probability = stageData?.probability ?? 10
    }

    const deal = await prisma.deal.create({
      data: {
        organizationId: orgId,
        name: parsed.data.name,
        companyId: parsed.data.companyId || null,
        campaignId: parsed.data.campaignId || null,
        pipelineId,
        stage: parsed.data.stage || "LEAD",
        valueAmount: parsed.data.valueAmount || 0,
        currency: parsed.data.currency || "AZN",
        probability: probability ?? 10,
        expectedClose: parsed.data.expectedClose ? new Date(parsed.data.expectedClose) : null,
        assignedTo: parsed.data.assignedTo,
        notes: parsed.data.notes,
      },
      include: {
        company: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    })
    logAudit(orgId, "create", "deal", deal.id, deal.name)
    executeWorkflows(orgId, "deal", "created", deal).catch(() => {})
    createNotification({
      organizationId: orgId,
      type: "success",
      title: "Новая сделка",
      message: `Создана сделка «${deal.name}»${deal.valueAmount ? ` на ${deal.valueAmount} ${deal.currency}` : ""}`,
      entityType: "deal",
      entityId: deal.id,
    }).catch(() => {})
    fireWebhooks(orgId, "deal.created", { id: deal.id, name: deal.name, valueAmount: deal.valueAmount, stage: deal.stage }).catch(() => {})
    if (deal.contactId) trackContactEvent(orgId, deal.contactId, "deal_created", { dealId: deal.id, name: deal.name }).catch(() => {})
    // Auto Slack notification
    prisma.channelConfig.findMany({ where: { organizationId: orgId, channelType: "slack", isActive: true } }).then(configs => {
      const msg = formatDealNotification({ name: deal.name, value: deal.valueAmount, stage: deal.stage })
      for (const cfg of configs) {
        if (cfg.webhookUrl) sendSlackNotification(cfg.webhookUrl, msg).catch(() => {})
      }
    }).catch(() => {})
    return NextResponse.json({ success: true, data: deal }, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
