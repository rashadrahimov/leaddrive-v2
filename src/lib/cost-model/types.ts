// Cost Model Types — shared across API routes, compute engine, and frontend

export interface CostModelParams {
  id?: string
  organizationId?: string
  totalUsers: number
  totalEmployees: number
  technicalStaff: number
  backOfficeStaff: number
  monthlyWorkHours: number
  vatRate: number
  employerTaxRate: number
  riskRate: number
  miscExpenseRate: number
  fixedOverheadRatio: number
}

export interface OverheadItem {
  id?: string | number
  organizationId?: string
  category: string
  label: string
  amount: number
  isAnnual: boolean
  hasVat: boolean
  isAdmin: boolean
  targetService?: string
  sortOrder: number
  notes?: string
}

export interface OverheadItemComputed extends OverheadItem {
  monthlyAmount: number
}

export interface EmployeeRow {
  id?: string | number
  organizationId?: string
  department: string
  position: string
  count: number
  netSalary: number
  grossSalary: number
  superGross: number
  inOverhead: boolean
  notes?: string
}

export interface EmployeeRowComputed extends EmployeeRow {
  totalLaborCost: number
}

export interface ClientCompany {
  id: string | number
  name: string
  costCode?: string
  userCount: number
}

export interface ClientServiceRow {
  id?: string | number
  companyId: string | number
  serviceType: string
  monthlyRevenue: number
  isActive: boolean
  notes?: string
}

export interface ServiceDetail {
  directLabor: number
  adminShare: number
  techDirect: number
  total: number
  headcount: number
  ratio: number
}

export interface ClientMargin {
  id: string | number
  name: string
  costCode: string
  userCount: number
  fixedCost: number
  variableCost: number
  totalCost: number
  totalRevenue: number
  margin: number
  marginPct: number
  status: "good" | "low" | "loss" | "no_revenue"
  services: Record<string, number>
  helpdeskRevenue?: number
}

export interface CostModelSummary {
  totalRevenue: number
  totalMargin: number
  marginPct: number
  profitableClients: number
  lossClients: number
  totalClients: number
}

export interface CostModelResult {
  grandTotalF: number
  grandTotalG: number
  adminOverhead: number
  techInfraTotal: number
  totalOverhead: number
  backOfficeCost: number
  grcDirectCost: number
  coreLabor: number
  sectionFSubtotal: number
  misc: number
  riskCost: number
  serviceCosts: Record<string, number>
  serviceDetails: Record<string, ServiceDetail>
  deptCosts: Record<string, number>
  overheadBreakdown: OverheadItemComputed[]
  employees: EmployeeRowComputed[]
  clients: ClientMargin[]
  totalUsers: number
  totalHeadcount: number
  summary: CostModelSummary
  params: CostModelParams
  costPerUserF: number
  costPerUserG: number
  serviceRevenues: Record<string, number>
  serviceClients: Record<string, number>
}

export type ServiceType = "permanent_it" | "infosec" | "erp" | "grc" | "projects" | "helpdesk" | "cloud"

export const SERVICE_TYPES: ServiceType[] = ["permanent_it", "infosec", "erp", "grc", "projects", "helpdesk", "cloud"]

export const SERVICE_LABELS: Record<ServiceType, string> = {
  permanent_it: "Daimi IT",
  infosec: "InfoSec",
  erp: "ERP",
  grc: "GRC",
  projects: "Layihələr (PM)",
  helpdesk: "HelpDesk",
  cloud: "Bulud",
}

export const DEPARTMENT_LABELS: Record<string, string> = {
  IT: "IT",
  InfoSec: "InfoSec",
  ERP: "ERP",
  GRC: "GRC",
  PM: "PM",
  HelpDesk: "HelpDesk",
  BackOffice: "BackOffice",
}
