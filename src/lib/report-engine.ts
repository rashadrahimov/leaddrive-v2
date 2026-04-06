import { prisma } from "@/lib/prisma"

interface FieldDef {
  name: string
  label: string
  type: "string" | "number" | "date" | "boolean"
}

interface EntityConfig {
  model: string
  fields: FieldDef[]
  relations?: { name: string; model: string; fields: string[] }[]
}

const ENTITY_CONFIGS: Record<string, EntityConfig> = {
  deals: {
    model: "deal",
    fields: [
      { name: "name", label: "Deal Name", type: "string" },
      { name: "valueAmount", label: "Value", type: "number" },
      { name: "currency", label: "Currency", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "stage", label: "Stage", type: "string" },
      { name: "probability", label: "Probability", type: "number" },
      { name: "expectedClose", label: "Expected Close", type: "date" },
      { name: "assignedTo", label: "Assigned To", type: "string" },
      { name: "createdAt", label: "Created", type: "date" },
    ],
    relations: [
      { name: "company", model: "company", fields: ["name", "industry"] },
    ],
  },
  contacts: {
    model: "contact",
    fields: [
      { name: "fullName", label: "Full Name", type: "string" },
      { name: "email", label: "Email", type: "string" },
      { name: "phone", label: "Phone", type: "string" },
      { name: "position", label: "Position", type: "string" },
      { name: "department", label: "Department", type: "string" },
      { name: "source", label: "Source", type: "string" },
      { name: "engagementScore", label: "Engagement", type: "number" },
      { name: "isActive", label: "Active", type: "boolean" },
      { name: "createdAt", label: "Created", type: "date" },
    ],
    relations: [
      { name: "company", model: "company", fields: ["name", "industry"] },
    ],
  },
  companies: {
    model: "company",
    fields: [
      { name: "name", label: "Company Name", type: "string" },
      { name: "industry", label: "Industry", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "category", label: "Category", type: "string" },
      { name: "annualRevenue", label: "Revenue", type: "number" },
      { name: "employeeCount", label: "Employees", type: "number" },
      { name: "city", label: "City", type: "string" },
      { name: "country", label: "Country", type: "string" },
      { name: "createdAt", label: "Created", type: "date" },
    ],
  },
  leads: {
    model: "lead",
    fields: [
      { name: "contactName", label: "Lead Name", type: "string" },
      { name: "companyName", label: "Company", type: "string" },
      { name: "email", label: "Email", type: "string" },
      { name: "phone", label: "Phone", type: "string" },
      { name: "source", label: "Source", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "priority", label: "Priority", type: "string" },
      { name: "score", label: "Score", type: "number" },
      { name: "estimatedValue", label: "Est. Value", type: "number" },
      { name: "assignedTo", label: "Assigned To", type: "string" },
      { name: "createdAt", label: "Created", type: "date" },
    ],
  },
  tickets: {
    model: "ticket",
    fields: [
      { name: "ticketNumber", label: "Ticket #", type: "string" },
      { name: "subject", label: "Subject", type: "string" },
      { name: "priority", label: "Priority", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "category", label: "Category", type: "string" },
      { name: "assignedTo", label: "Assigned To", type: "string" },
      { name: "satisfactionRating", label: "CSAT", type: "number" },
      { name: "createdAt", label: "Created", type: "date" },
      { name: "resolvedAt", label: "Resolved", type: "date" },
    ],
    relations: [
      { name: "contact", model: "contact", fields: ["fullName", "email"] },
    ],
  },
  tasks: {
    model: "task",
    fields: [
      { name: "title", label: "Title", type: "string" },
      { name: "status", label: "Status", type: "string" },
      { name: "priority", label: "Priority", type: "string" },
      { name: "assignedTo", label: "Assigned To", type: "string" },
      { name: "dueDate", label: "Due Date", type: "date" },
      { name: "createdAt", label: "Created", type: "date" },
      { name: "completedAt", label: "Completed", type: "date" },
    ],
  },
  activities: {
    model: "activity",
    fields: [
      { name: "type", label: "Type", type: "string" },
      { name: "subject", label: "Subject", type: "string" },
      { name: "description", label: "Description", type: "string" },
      { name: "createdBy", label: "Created By", type: "string" },
      { name: "createdAt", label: "Created", type: "date" },
      { name: "completedAt", label: "Completed", type: "date" },
    ],
    relations: [
      { name: "contact", model: "contact", fields: ["fullName"] },
      { name: "company", model: "company", fields: ["name"] },
    ],
  },
}

export interface ReportConfig {
  entityType: string
  columns: { field: string; label?: string; aggregate?: "count" | "sum" | "avg" | "min" | "max" }[]
  filters: { field: string; op: string; value: any }[]
  groupBy?: string
  sortBy?: string
  sortOrder?: string
  limit?: number
}

export async function executeReport(orgId: string, config: ReportConfig) {
  const entityConfig = ENTITY_CONFIGS[config.entityType]
  if (!entityConfig) throw new Error("Unknown entity type")

  // Build WHERE
  const where: any = { organizationId: orgId }
  for (const f of config.filters) {
    switch (f.op) {
      case "eq": where[f.field] = f.value; break
      case "neq": where[f.field] = { not: f.value }; break
      case "gt": where[f.field] = { gt: parseNumOrDate(f.value, f.field, entityConfig) }; break
      case "lt": where[f.field] = { lt: parseNumOrDate(f.value, f.field, entityConfig) }; break
      case "gte": where[f.field] = { gte: parseNumOrDate(f.value, f.field, entityConfig) }; break
      case "lte": where[f.field] = { lte: parseNumOrDate(f.value, f.field, entityConfig) }; break
      case "contains": where[f.field] = { contains: f.value, mode: "insensitive" }; break
      case "in": where[f.field] = { in: Array.isArray(f.value) ? f.value : [f.value] }; break
      case "between":
        if (f.value?.from && f.value?.to) {
          where[f.field] = { gte: new Date(f.value.from), lte: new Date(f.value.to) }
        }
        break
    }
  }

  // GroupBy aggregation
  if (config.groupBy) {
    const aggregates: any = {}
    for (const col of config.columns) {
      if (col.aggregate && col.aggregate !== "count") {
        if (!aggregates[`_${col.aggregate}`]) aggregates[`_${col.aggregate}`] = {}
        aggregates[`_${col.aggregate}`][col.field] = true
      }
    }

    const result = await (prisma as any)[entityConfig.model].groupBy({
      by: [config.groupBy],
      where,
      ...aggregates,
      _count: { id: true },
      orderBy: config.sortBy
        ? { [config.sortBy]: config.sortOrder ?? "desc" }
        : { _count: { id: "desc" } },
      take: config.limit ?? 100,
    })

    return { type: "grouped" as const, data: result, groupBy: config.groupBy }
  }

  // Flat query
  const select: any = {}
  const include: any = {}

  for (const col of config.columns) {
    if (col.field.includes(".")) {
      const [rel, field] = col.field.split(".")
      if (!include[rel]) include[rel] = { select: {} }
      include[rel].select[field] = true
    } else {
      select[col.field] = true
    }
  }

  const hasSelect = Object.keys(select).length > 0
  const hasInclude = Object.keys(include).length > 0

  const result = await (prisma as any)[entityConfig.model].findMany({
    where,
    ...(hasSelect ? { select: { ...select, id: true, ...(hasInclude ? include : {}) } } : {}),
    ...(hasInclude && !hasSelect ? { include } : {}),
    orderBy: config.sortBy ? { [config.sortBy]: config.sortOrder ?? "desc" } : { createdAt: "desc" },
    take: config.limit ?? 500,
  })

  return { type: "flat" as const, data: result }
}

function parseNumOrDate(value: any, field: string, config: EntityConfig) {
  const fieldDef = config.fields.find(f => f.name === field)
  if (fieldDef?.type === "date") return new Date(value)
  if (fieldDef?.type === "number") return Number(value)
  return value
}

export function getEntityConfigs() {
  return ENTITY_CONFIGS
}
