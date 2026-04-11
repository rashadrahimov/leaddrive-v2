// ═══════════════════════════════════════════════════════════
// Centralized constants for LeadDrive CRM v2
// ═══════════════════════════════════════════════════════════

// ── Currency ──────────────────────────────────────────────
export const DEFAULT_CURRENCY = "AZN"

export const INITIAL_CURRENCIES = [
  { code: "AZN", name: "Azerbaijani Manat", symbol: "₼", exchangeRate: 1, isBase: true },
  { code: "USD", name: "US Dollar", symbol: "$", exchangeRate: 0.59 },
  { code: "EUR", name: "Euro", symbol: "€", exchangeRate: 0.54 },
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
