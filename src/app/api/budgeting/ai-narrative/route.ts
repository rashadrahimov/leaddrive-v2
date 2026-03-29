import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { prisma } from "@/lib/prisma"
import { loadAndCompute } from "@/lib/cost-model/db"
import { resolveCostModelKey } from "@/lib/budgeting/cost-model-map"
import Anthropic from "@anthropic-ai/sdk"

const narrativeSchema = z.object({
  planId: z.string().min(1).max(100),
  threshold: z.number().min(0).max(100).optional(),
}).strict()

const MODEL = process.env.MANAGER_MODEL || "claude-sonnet-4-5-20250929"

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  let data
  try {
    data = narrativeSchema.parse(body)
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: "Validation failed", details: e.flatten().fieldErrors }, { status: 400 })
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const { planId, threshold = 5 } = data

  // Load analytics data
  const [plan, lines, actuals] = await Promise.all([
    prisma.budgetPlan.findFirst({ where: { id: planId, organizationId: orgId } }),
    prisma.budgetLine.findMany({ where: { planId, organizationId: orgId } }),
    prisma.budgetActual.findMany({ where: { planId, organizationId: orgId } }),
  ])

  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

  // Load cost model for auto-actuals
  const hasAutoActual = lines.some((l: { isAutoActual: boolean }) => l.isAutoActual)
  const costModel = hasAutoActual ? await loadAndCompute(orgId).catch(() => null) : null

  // Build category summary
  const catMap = new Map<string, { planned: number; actual: number; lineType: string }>()
  for (const l of lines) {
    const key = l.category
    const existing = catMap.get(key) ?? { planned: 0, actual: 0, lineType: l.lineType }
    existing.planned += l.plannedAmount
    catMap.set(key, existing)
  }
  // Add auto-actuals
  if (costModel) {
    for (const l of lines) {
      if (l.isAutoActual && l.costModelKey) {
        const amount = resolveCostModelKey(costModel, l.costModelKey)
        const existing = catMap.get(l.category) ?? { planned: 0, actual: 0, lineType: l.lineType }
        existing.actual += amount
        catMap.set(l.category, existing)
      }
    }
  }
  // Add manual actuals
  for (const a of actuals) {
    const existing = catMap.get(a.category) ?? { planned: 0, actual: 0, lineType: a.lineType }
    existing.actual += a.actualAmount
    catMap.set(a.category, existing)
  }

  // Sort by absolute variance and take top variances
  const variances = Array.from(catMap.entries())
    .map(([cat, val]) => ({
      category: cat,
      planned: val.planned,
      actual: val.actual,
      variance: val.lineType === "revenue" ? val.actual - val.planned : val.planned - val.actual,
      pct: val.planned > 0 ? ((val.lineType === "revenue" ? val.actual - val.planned : val.planned - val.actual) / val.planned * 100) : 0,
      lineType: val.lineType,
    }))
    .filter(v => Math.abs(v.pct) >= threshold)
    .sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))

  const totalPlanned = lines.reduce((s: number, l: { plannedAmount: number }) => s + l.plannedAmount, 0)
  const totalActual = [...catMap.values()].reduce((s, v) => s + v.actual, 0)

  const top5 = variances.slice(0, 5)
  const varianceLines = top5.map(v =>
    `- ${v.category} (${v.lineType === "revenue" ? "доход" : "расход"}): план ${v.planned.toLocaleString()} ₼, факт ${v.actual.toLocaleString()} ₼, отклонение ${v.variance >= 0 ? "+" : ""}${v.variance.toLocaleString()} ₼ (${v.pct.toFixed(1)}%)`
  ).join("\n")

  const prompt = `Ты — FP&A аналитик IT-аутсорсинговой компании.

Бюджетный план: "${plan.name}" (${plan.periodType}, ${plan.year})
Общий бюджет: ${totalPlanned.toLocaleString()} ₼
Общий факт: ${totalActual.toLocaleString()} ₼
Общее отклонение: ${(totalPlanned - totalActual).toLocaleString()} ₼

Топ-${top5.length} отклонений (порог ${threshold}%):
${varianceLines || "Нет существенных отклонений"}

Напиши краткий (200-300 слов) FP&A комментарий по отклонениям бюджета на русском языке:
1. Резюме исполнения бюджета
2. Анализ ключевых отклонений
3. Рекомендации для руководства
Используй профессиональный финансовый стиль.`

  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    })

    const narrative = msg.content[0].type === "text" ? msg.content[0].text : ""
    return NextResponse.json({ success: true, data: { narrative } })
  } catch (e: any) {
    console.error("Da Vinci narrative error:", e)
    return NextResponse.json({ error: "Da Vinci service unavailable" }, { status: 503 })
  }
}
