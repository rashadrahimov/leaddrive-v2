// ═══════════════════════════════════════════════════════════
// Centralized constants for LeadDrive CRM v2
// ═══════════════════════════════════════════════════════════

// ── Currency ──────────────────────────────────────────────
// DEFAULT_CURRENCY and INITIAL_CURRENCIES are configurable per tenant via env vars.
// Set DEFAULT_CURRENCY env var to override (e.g. "USD", "EUR").
export const DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "USD"

export const CURRENCY_SYMBOLS: Record<string, string> = {
  AZN: "₼", USD: "$", EUR: "€", GBP: "£", RUB: "₽", PLN: "zł",
  TRY: "₺", JPY: "¥", CNY: "¥", CHF: "Fr", SEK: "kr", NOK: "kr",
  CAD: "CA$", AUD: "A$", INR: "₹", BRL: "R$", KRW: "₩",
}

export function getCurrencySymbol(code?: string): string {
  return CURRENCY_SYMBOLS[code || DEFAULT_CURRENCY] || code || DEFAULT_CURRENCY
}

export const INITIAL_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 1, isBase: true },
  { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", exchangeRate: 0.79 },
] as const

// ── Pipeline Stages ──────────────────────────────────────
export const DEFAULT_PIPELINE_STAGES = [
  { name: "LEAD", displayName: "Lead", color: "#6366f1", probability: 10, sortOrder: 1 },
  { name: "QUALIFIED", displayName: "Qualified", color: "#3b82f6", probability: 25, sortOrder: 2 },
  { name: "PROPOSAL", displayName: "Proposal", color: "#f59e0b", probability: 50, sortOrder: 3 },
  { name: "NEGOTIATION", displayName: "Negotiation", color: "#f97316", probability: 75, sortOrder: 4 },
  { name: "WON", displayName: "Won", color: "#22c55e", probability: 100, sortOrder: 5, isWon: true },
  { name: "LOST", displayName: "Lost", color: "#ef4444", probability: 0, sortOrder: 6, isLost: true },
] as const

// ── Pipeline Stage Colors (for charts/visualizations) ────
export const STAGE_COLORS: Record<string, string> = {
  LEAD: "#6366f1",
  QUALIFIED: "#3b82f6",
  PROPOSAL: "#f59e0b",
  NEGOTIATION: "#f97316",
  WON: "#22c55e",
  LOST: "#ef4444",
}

// ── Contact Info ─────────────────────────────────────────
export const COMPANY_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "info@leaddrivecrm.org"
export const NOREPLY_EMAIL = process.env.EMAIL_FROM_ADDRESS || process.env.NOREPLY_EMAIL || "noreply@leaddrivecrm.org"
export const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS || NOREPLY_EMAIL
export const EMAIL_FROM_NAME_FALLBACK = process.env.EMAIL_FROM_NAME_FALLBACK || "LeadDrive CRM"
export const EMAIL_REPLY_DOMAIN = process.env.EMAIL_REPLY_DOMAIN || "leaddrivecrm.org"
export const COMPANY_PHONE = ""
export const COMPANY_PHONE_FORMATTED = ""

// ── Roles ────────────────────────────────────────────────
export const ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  MANAGER: "manager",
  SALES: "sales",
  SUPPORT: "support",
  VIEWER: "viewer",
  MARKETING: "marketing",
  FINANCE: "finance",
  HR: "hr",
} as const

export const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN] as const
export const MANAGER_ROLES = [ROLES.SUPERADMIN, ROLES.ADMIN, ROLES.MANAGER] as const

export const ALL_ROLES = Object.values(ROLES)

export function isAdmin(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPERADMIN
}

export function isManagerOrAbove(role: string): boolean {
  return role === ROLES.ADMIN || role === ROLES.SUPERADMIN || role === ROLES.MANAGER
}

// ── Pagination ───────────────────────────────────────────
export const PAGE_SIZE = {
  DEFAULT: 50,
  SEARCH: 5,
  DASHBOARD_RECENT: 10,
  DASHBOARD_TASKS: 5,
  INBOX: 500,
  EXPORT: 10000,
  AUDIT_LOG: 1000,
  PORTAL_USERS: 200,
  CALENDAR_AGENT: 300,
} as const
