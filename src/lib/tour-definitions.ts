/**
 * Tour definitions for guided onboarding.
 * Each tour has an id matching a page/section, and an array of steps.
 * Steps reference DOM elements via data-tour-id attributes.
 * titleKey/descKey resolve to i18n keys under "tour.{tourId}.{key}".
 */

interface TourStepDef {
  targetId: string   // matches data-tour-id="xxx" on the page
  titleKey: string   // i18n key for title (under tour.{tourId})
  descKey: string    // i18n key for description
}

interface TourDef {
  steps: TourStepDef[]
}

export const TOUR_DEFINITIONS: Record<string, TourDef> = {
  // ── Phase 1 ──

  dashboard: {
    steps: [
      { targetId: "dashboard-stats", titleKey: "statsTitle", descKey: "statsDesc" },
      { targetId: "dashboard-pipeline", titleKey: "pipelineTitle", descKey: "pipelineDesc" },
      { targetId: "dashboard-activity", titleKey: "activityTitle", descKey: "activityDesc" },
    ],
  },

  deals: {
    steps: [
      { targetId: "deals-kanban", titleKey: "kanbanTitle", descKey: "kanbanDesc" },
      { targetId: "deals-pipeline-select", titleKey: "pipelineTitle", descKey: "pipelineDesc" },
      { targetId: "deals-summary", titleKey: "summaryTitle", descKey: "summaryDesc" },
      { targetId: "deals-card", titleKey: "cardTitle", descKey: "cardDesc" },
      { targetId: "deals-new", titleKey: "newTitle", descKey: "newDesc" },
    ],
  },

  dealDetail: {
    steps: [
      { targetId: "deal-stage-progress", titleKey: "stageTitle", descKey: "stageDesc" },
      { targetId: "deal-ai-prediction", titleKey: "aiPredTitle", descKey: "aiPredDesc" },
      { targetId: "deal-ai-suggestions", titleKey: "aiSugTitle", descKey: "aiSugDesc" },
      { targetId: "deal-quick-actions", titleKey: "quickTitle", descKey: "quickDesc" },
      { targetId: "deal-sidebar", titleKey: "sidebarTitle", descKey: "sidebarDesc" },
      { targetId: "deal-timeline", titleKey: "timelineTitle", descKey: "timelineDesc" },
    ],
  },

  tickets: {
    steps: [
      { targetId: "tickets-list", titleKey: "listTitle", descKey: "listDesc" },
      { targetId: "tickets-sla", titleKey: "slaTitle", descKey: "slaDesc" },
      { targetId: "tickets-kanban-toggle", titleKey: "kanbanTitle", descKey: "kanbanDesc" },
      { targetId: "tickets-new", titleKey: "newTitle", descKey: "newDesc" },
    ],
  },

  ticketDetail: {
    steps: [
      { targetId: "ticket-header-sla", titleKey: "headerTitle", descKey: "headerDesc" },
      { targetId: "ticket-ai-draft", titleKey: "aiDraftTitle", descKey: "aiDraftDesc" },
      { targetId: "ticket-ai-summary", titleKey: "aiSummaryTitle", descKey: "aiSummaryDesc" },
      { targetId: "ticket-ai-steps", titleKey: "aiStepsTitle", descKey: "aiStepsDesc" },
      { targetId: "ticket-comments", titleKey: "commentsTitle", descKey: "commentsDesc" },
      { targetId: "ticket-macros", titleKey: "macrosTitle", descKey: "macrosDesc" },
    ],
  },

  leads: {
    steps: [
      { targetId: "leads-list", titleKey: "listTitle", descKey: "listDesc" },
      { targetId: "leads-score", titleKey: "scoreTitle", descKey: "scoreDesc" },
      { targetId: "leads-status-filter", titleKey: "statusTitle", descKey: "statusDesc" },
      { targetId: "leads-convert", titleKey: "convertTitle", descKey: "convertDesc" },
    ],
  },

  reports: {
    steps: [
      { targetId: "reports-kpi", titleKey: "kpiTitle", descKey: "kpiDesc" },
      { targetId: "reports-pipeline-funnel", titleKey: "funnelTitle", descKey: "funnelDesc" },
      { targetId: "reports-lead-funnel", titleKey: "leadFunnelTitle", descKey: "leadFunnelDesc" },
      { targetId: "reports-forecast", titleKey: "forecastTitle", descKey: "forecastDesc" },
      { targetId: "reports-ai-commentary", titleKey: "aiComTitle", descKey: "aiComDesc" },
    ],
  },

  // ── Phase 2: Communications ──

  inbox: {
    steps: [
      { targetId: "inbox-channels", titleKey: "channelsTitle", descKey: "channelsDesc" },
      { targetId: "inbox-stats", titleKey: "statsTitle", descKey: "statsDesc" },
      { targetId: "inbox-conversations", titleKey: "convTitle", descKey: "convDesc" },
      { targetId: "inbox-thread", titleKey: "threadTitle", descKey: "threadDesc" },
    ],
  },

  campaigns: {
    steps: [
      { targetId: "campaigns-stats", titleKey: "statsTitle", descKey: "statsDesc" },
      { targetId: "campaigns-new", titleKey: "newTitle", descKey: "newDesc" },
      { targetId: "campaigns-list", titleKey: "listTitle", descKey: "listDesc" },
    ],
  },

  journeys: {
    steps: [
      { targetId: "journeys-header", titleKey: "headerTitle", descKey: "headerDesc" },
      { targetId: "journeys-list", titleKey: "listTitle", descKey: "listDesc" },
      { targetId: "journeys-new", titleKey: "newTitle", descKey: "newDesc" },
    ],
  },

  segments: {
    steps: [
      { targetId: "segments-filters", titleKey: "filtersTitle", descKey: "filtersDesc" },
      { targetId: "segments-new", titleKey: "newTitle", descKey: "newDesc" },
      { targetId: "segments-list", titleKey: "listTitle", descKey: "listDesc" },
    ],
  },

  // ── Phase 2: Finance ──

  invoices: {
    steps: [
      { targetId: "invoices-stats", titleKey: "statsTitle", descKey: "statsDesc" },
      { targetId: "invoices-new", titleKey: "newTitle", descKey: "newDesc" },
      { targetId: "invoices-list", titleKey: "listTitle", descKey: "listDesc" },
    ],
  },

  finance: {
    steps: [
      { targetId: "finance-tabs", titleKey: "tabsTitle", descKey: "tabsDesc" },
    ],
  },

  budgeting: {
    steps: [
      { targetId: "budgeting-header", titleKey: "headerTitle", descKey: "headerDesc" },
    ],
  },

  profitability: {
    steps: [
      { targetId: "profitability-kpi", titleKey: "kpiTitle", descKey: "kpiDesc" },
      { targetId: "profitability-tabs", titleKey: "tabsTitle", descKey: "tabsDesc" },
      { targetId: "profitability-charts", titleKey: "chartsTitle", descKey: "chartsDesc" },
    ],
  },

  pricing: {
    steps: [
      { targetId: "pricing-header", titleKey: "headerTitle", descKey: "headerDesc" },
    ],
  },

  // ── Phase 3 (Other modules) — to be added ──
  // ── Phase 4 (Settings) — to be added ──
}
