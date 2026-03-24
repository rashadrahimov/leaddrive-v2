/**
 * Maps budget category names to cost model result keys.
 *
 * costModelKey format:
 *   "grandTotalG"           → CostModelResult.grandTotalG (grand total expenses)
 *   "grandTotalF"           → CostModelResult.grandTotalF (total without profit markup)
 *   "adminOverhead"         → CostModelResult.adminOverhead
 *   "techInfraTotal"        → CostModelResult.techInfraTotal
 *   "totalOverhead"         → CostModelResult.totalOverhead
 *   "backOfficeCost"        → CostModelResult.backOfficeCost
 *   "coreLabor"             → CostModelResult.coreLabor
 *   "misc"                  → CostModelResult.misc
 *   "riskCost"              → CostModelResult.riskCost
 *   "deptCosts.IT"          → CostModelResult.deptCosts["IT"]
 *   "deptCosts.Finance"     → CostModelResult.deptCosts["Finance"]
 *   "serviceRevenues.total" → sum of all CostModelResult.serviceRevenues values
 *   "serviceCosts.total"    → sum of all CostModelResult.serviceCosts values
 */

import type { CostModelResult } from "@/lib/cost-model/types"

export type CostModelKey = string

/** Extract a numeric value from a CostModelResult given a dotted key path */
export function resolveCostModelKey(result: CostModelResult, key: CostModelKey): number {
  if (!key) return 0

  if (key === "grandTotalG") return result.grandTotalG
  if (key === "grandTotalF") return result.grandTotalF
  if (key === "adminOverhead") return result.adminOverhead
  if (key === "techInfraTotal") return result.techInfraTotal
  if (key === "totalOverhead") return result.totalOverhead
  if (key === "backOfficeCost") return result.backOfficeCost
  if (key === "coreLabor") return result.coreLabor
  if (key === "misc") return result.misc
  if (key === "riskCost") return result.riskCost
  if (key === "grcDirectCost") return result.grcDirectCost

  if (key.startsWith("deptCosts.")) {
    const dept = key.slice("deptCosts.".length)
    return result.deptCosts[dept] ?? 0
  }

  if (key === "serviceRevenues.total") {
    return Object.values(result.serviceRevenues).reduce((s, v) => s + v, 0)
  }

  if (key.startsWith("serviceRevenues.")) {
    const svc = key.slice("serviceRevenues.".length)
    return result.serviceRevenues[svc] ?? 0
  }

  if (key === "serviceCosts.total") {
    return Object.values(result.serviceCosts).reduce((s, v) => s + v, 0)
  }

  if (key.startsWith("serviceCosts.")) {
    const svc = key.slice("serviceCosts.".length)
    return result.serviceCosts[svc] ?? 0
  }

  return 0
}

/** Human-readable labels for cost model keys (used in dropdowns) */
export const COST_MODEL_KEY_OPTIONS: { value: CostModelKey; label: string; group: string }[] = [
  // Totals
  { value: "grandTotalG", label: "Итого расходы (с надбавкой)", group: "Итого" },
  { value: "grandTotalF", label: "Итого расходы (без надбавки)", group: "Итого" },
  { value: "totalOverhead", label: "Накладные расходы (итого)", group: "Итого" },

  // Labor
  { value: "coreLabor", label: "ФОТ (основной персонал)", group: "Персонал" },
  { value: "backOfficeCost", label: "Бэк-офис", group: "Персонал" },
  { value: "grcDirectCost", label: "GRC прямые расходы", group: "Персонал" },

  // Overhead
  { value: "adminOverhead", label: "Административные накладные", group: "Накладные" },
  { value: "techInfraTotal", label: "Техническая инфраструктура", group: "Накладные" },
  { value: "misc", label: "Прочие расходы", group: "Накладные" },
  { value: "riskCost", label: "Риск-резерв", group: "Накладные" },

  // Revenue
  { value: "serviceRevenues.total", label: "Выручка (все сервисы)", group: "Выручка" },

  // Service costs
  { value: "serviceCosts.total", label: "Стоимость сервисов (итого)", group: "Сервисы" },
]

/**
 * Default template: suggested costModelKey per standard budget category.
 * Used by TemplateSeedButton to pre-assign mappings.
 */
export const TEMPLATE_CATEGORY_MAP: Record<string, CostModelKey | undefined> = {
  // Expense categories → cost model keys
  "Заработная плата": "coreLabor",
  "Бэк-офис": "backOfficeCost",
  "IT-инфраструктура": "techInfraTotal",
  "Накладные расходы": "adminOverhead",
  "Риск-резерв": "riskCost",
  "Прочие расходы": "misc",
  "GRC прямые расходы": "grcDirectCost",

  // Revenue categories → cost model keys
  "Выручка от сервисов": "serviceRevenues.total",
}
