export interface BudgetPlan {
  id: string
  organizationId: string
  name: string
  periodType: "monthly" | "quarterly" | "annual"
  year: number
  month?: number | null
  quarter?: number | null
  status: "draft" | "approved" | "closed"
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface BudgetLine {
  id: string
  organizationId: string
  planId: string
  category: string
  department?: string | null
  lineType: "expense" | "revenue"
  plannedAmount: number
  forecastAmount?: number | null
  costModelKey?: string | null
  isAutoActual: boolean
  notes?: string | null
  sortOrder: number
}

export interface BudgetActual {
  id: string
  organizationId: string
  planId: string
  category: string
  department?: string | null
  lineType: "expense" | "revenue"
  actualAmount: number
  expenseDate?: string | null
  description?: string | null
  createdAt: string
}

export interface BudgetCategoryRow {
  category: string
  lineType: string
  planned: number
  forecast: number
  actual: number
  variance: number
  variancePct: number
}

export interface BudgetDepartmentRow {
  department: string
  planned: number
  forecast: number
  actual: number
  variance: number
}

export interface BudgetAnalytics {
  plan: BudgetPlan
  totalPlanned: number
  totalForecast: number
  totalActual: number
  totalVariance: number
  forecastVariance: number
  executionPct: number
  autoActualTotal: number
  yearEndProjection: number
  totalExpensePlanned: number
  totalExpenseForecast: number
  totalExpenseActual: number
  totalRevenuePlanned: number
  totalRevenueForecast: number
  totalRevenueActual: number
  margin: number
  marginActual: number
  byCategory: BudgetCategoryRow[]
  byDepartment: BudgetDepartmentRow[]
  costModelTotal: number
}

export interface CreateBudgetPlanInput {
  name: string
  periodType: "monthly" | "quarterly" | "annual"
  year: number
  month?: number
  quarter?: number
  notes?: string
}

export interface UpdateBudgetPlanInput {
  name?: string
  status?: "draft" | "approved" | "closed"
  notes?: string
}

export interface CreateBudgetLineInput {
  planId: string
  category: string
  department?: string
  lineType: "expense" | "revenue"
  plannedAmount: number
  forecastAmount?: number
  costModelKey?: string
  isAutoActual?: boolean
  notes?: string
}

export interface UpdateBudgetLineInput {
  id: string
  planId: string
  category?: string
  department?: string
  lineType?: "expense" | "revenue"
  plannedAmount?: number
  forecastAmount?: number
  costModelKey?: string
  isAutoActual?: boolean
  notes?: string
}

export interface CreateBudgetActualInput {
  planId: string
  category: string
  department?: string
  lineType: "expense" | "revenue"
  actualAmount: number
  expenseDate?: string
  description?: string
}

export interface UpdateBudgetActualInput {
  actualAmount?: number
  category?: string
  department?: string
  lineType?: "expense" | "revenue"
  expenseDate?: string
  description?: string
}

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Заработная плата",
  "Бэк-офис",
  "IT-инфраструктура",
  "Накладные расходы",
  "Риск-резерв",
  "Прочие расходы",
  "GRC прямые расходы",
  "Аренда офиса",
  "Лицензии ПО",
  "Командировки",
  "Маркетинг",
]

export const DEFAULT_REVENUE_CATEGORIES = [
  "Выручка от сервисов",
  "Daimi IT (постоянный)",
  "InfoSec",
  "ERP",
  "HelpDesk",
  "Прочие услуги",
]

export interface BudgetSection {
  id: string
  organizationId: string
  planId: string
  name: string
  sectionType: "revenue" | "expense" | "gross_profit" | "ebitda"
  sortOrder: number
  createdAt: string
}

export interface BudgetForecastEntry {
  id: string
  organizationId: string
  planId: string
  month: number
  year: number
  category: string
  forecastAmount: number
  createdAt: string
  updatedAt: string
}

export const SECTION_TYPES = [
  { value: "revenue", label: "Выручка" },
  { value: "expense", label: "Расходы" },
  { value: "gross_profit", label: "Валовая прибыль (расчётная)" },
  { value: "ebitda", label: "EBITDA (расчётная)" },
]

export const DEPARTMENTS = [
  "IT",
  "InfoSec",
  "ERP",
  "BackOffice",
  "GRC",
  "Все",
]
