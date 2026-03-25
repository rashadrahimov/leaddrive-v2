import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getOrgId } from "@/lib/api-auth"

const TEMPLATE_PACKS = {
  "it-saas": {
    name: "IT / SaaS",
    templates: [
      { name: "Заработная плата", lineType: "expense", costModelKey: "coreLabor", defaultAmount: 0, sortOrder: 1 },
      { name: "IT-инфраструктура", lineType: "expense", costModelKey: "techInfraTotal", defaultAmount: 0, sortOrder: 2 },
      { name: "Аренда офиса", lineType: "expense", defaultAmount: 0, sortOrder: 3 },
      { name: "Лицензии ПО", lineType: "expense", defaultAmount: 0, sortOrder: 4 },
      { name: "Маркетинг", lineType: "expense", defaultAmount: 0, sortOrder: 5 },
      { name: "Накладные расходы", lineType: "expense", costModelKey: "adminOverhead", defaultAmount: 0, sortOrder: 6 },
      { name: "Риск-резерв", lineType: "expense", costModelKey: "riskCost", defaultAmount: 0, sortOrder: 7 },
      { name: "Прочие расходы", lineType: "expense", defaultAmount: 0, sortOrder: 8 },
      { name: "Выручка от сервисов", lineType: "revenue", costModelKey: "serviceRevenues.total", defaultAmount: 0, sortOrder: 10 },
      { name: "Себестоимость услуг", lineType: "cogs", defaultAmount: 0, sortOrder: 20 },
    ],
  },
  "service": {
    name: "Сервисная компания",
    templates: [
      { name: "Заработная плата", lineType: "expense", defaultAmount: 0, sortOrder: 1 },
      { name: "Аренда офиса", lineType: "expense", defaultAmount: 0, sortOrder: 2 },
      { name: "Транспорт и командировки", lineType: "expense", defaultAmount: 0, sortOrder: 3 },
      { name: "Оборудование", lineType: "expense", defaultAmount: 0, sortOrder: 4 },
      { name: "Маркетинг", lineType: "expense", defaultAmount: 0, sortOrder: 5 },
      { name: "Лицензии ПО", lineType: "expense", defaultAmount: 0, sortOrder: 6 },
      { name: "Прочие расходы", lineType: "expense", defaultAmount: 0, sortOrder: 7 },
      { name: "Консалтинг", lineType: "revenue", lineSubtype: "service", defaultAmount: 0, sortOrder: 10 },
      { name: "Проектные работы", lineType: "revenue", lineSubtype: "service", defaultAmount: 0, sortOrder: 11 },
    ],
  },
  "startup": {
    name: "Стартап",
    templates: [
      { name: "Заработная плата", lineType: "expense", defaultAmount: 0, sortOrder: 1 },
      { name: "Облачная инфраструктура", lineType: "expense", defaultAmount: 0, sortOrder: 2 },
      { name: "Маркетинг и привлечение", lineType: "expense", defaultAmount: 0, sortOrder: 3 },
      { name: "Юридические услуги", lineType: "expense", defaultAmount: 0, sortOrder: 4 },
      { name: "Аренда офиса", lineType: "expense", defaultAmount: 0, sortOrder: 5 },
      { name: "SaaS MRR", lineType: "revenue", lineSubtype: "service", defaultAmount: 0, sortOrder: 10 },
      { name: "Professional Services", lineType: "revenue", lineSubtype: "service", defaultAmount: 0, sortOrder: 11 },
    ],
  },
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { pack } = await req.json().catch(() => ({ pack: "all" }))

  const existing = await prisma.budgetDirectionTemplate.count({ where: { organizationId: orgId } })

  let created = 0
  const packs = pack === "all" ? Object.values(TEMPLATE_PACKS) : TEMPLATE_PACKS[pack as keyof typeof TEMPLATE_PACKS] ? [TEMPLATE_PACKS[pack as keyof typeof TEMPLATE_PACKS]] : []

  for (const p of packs) {
    for (const t of p.templates) {
      // Skip if template with same name + lineType already exists
      const exists = await prisma.budgetDirectionTemplate.findFirst({
        where: { organizationId: orgId, name: t.name, lineType: t.lineType },
      })
      if (exists) continue

      await prisma.budgetDirectionTemplate.create({
        data: {
          organizationId: orgId,
          name: t.name,
          lineType: t.lineType,
          lineSubtype: (t as any).lineSubtype ?? null,
          defaultAmount: t.defaultAmount,
          costModelKey: (t as any).costModelKey ?? null,
          sortOrder: t.sortOrder + (existing + created),
          isActive: true,
        },
      })
      created++
    }
  }

  return NextResponse.json({ success: true, created })
}
