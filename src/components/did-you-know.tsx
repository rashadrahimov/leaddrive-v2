"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Lightbulb, X, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

const STORAGE_KEY = "leaddrive_dismissed_tips"

interface Tip {
  id: string
  titleKey: string
  descKey: string
  ctaKey: string
  href: string
}

const TIPS: Record<string, Tip[]> = {
  dashboard: [
    { id: "ctrl-k", titleKey: "ctrlKTitle", descKey: "ctrlKDesc", ctaKey: "ctrlKCta", href: "/settings/dashboard" },
    { id: "wallpaper", titleKey: "wallpaperTitle", descKey: "wallpaperDesc", ctaKey: "wallpaperCta", href: "/settings/dashboard" },
    { id: "daily-briefing", titleKey: "dailyBriefingTitle", descKey: "dailyBriefingDesc", ctaKey: "dailyBriefingCta", href: "/settings/ai-automation" },
    { id: "anomaly-detect", titleKey: "anomalyTitle", descKey: "anomalyDesc", ctaKey: "anomalyCta", href: "/ai-command-center" },
    { id: "widget-toggle", titleKey: "widgetTitle", descKey: "widgetDesc", ctaKey: "widgetCta", href: "/settings/dashboard" },
  ],
  deals: [
    { id: "deal-drag", titleKey: "dealDragTitle", descKey: "dealDragDesc", ctaKey: "dealDragCta", href: "/deals" },
    { id: "deal-rotting", titleKey: "dealRottingTitle", descKey: "dealRottingDesc", ctaKey: "dealRottingCta", href: "/settings/ai-automation" },
    { id: "deal-weighted", titleKey: "dealWeightedTitle", descKey: "dealWeightedDesc", ctaKey: "dealWeightedCta", href: "/deals" },
    { id: "deal-close", titleKey: "dealCloseTitle", descKey: "dealCloseDesc", ctaKey: "dealCloseCta", href: "/deals" },
    { id: "deal-team", titleKey: "dealTeamTitle", descKey: "dealTeamDesc", ctaKey: "dealTeamCta", href: "/deals" },
    { id: "deal-competitors", titleKey: "dealCompTitle", descKey: "dealCompDesc", ctaKey: "dealCompCta", href: "/deals" },
  ],
  tickets: [
    { id: "ticket-shortcuts", titleKey: "ticketShortTitle", descKey: "ticketShortDesc", ctaKey: "ticketShortCta", href: "/tickets" },
    { id: "ticket-macros", titleKey: "ticketMacroTitle", descKey: "ticketMacroDesc", ctaKey: "ticketMacroCta", href: "/settings/macros" },
    { id: "ticket-internal", titleKey: "ticketInternalTitle", descKey: "ticketInternalDesc", ctaKey: "ticketInternalCta", href: "/tickets" },
    { id: "ticket-sla", titleKey: "ticketSlaTitle", descKey: "ticketSlaDesc", ctaKey: "ticketSlaCta", href: "/settings/sla-policies" },
    { id: "ticket-handle", titleKey: "ticketHandleTitle", descKey: "ticketHandleDesc", ctaKey: "ticketHandleCta", href: "/reports" },
    { id: "ticket-auto-ack", titleKey: "ticketAutoTitle", descKey: "ticketAutoDesc", ctaKey: "ticketAutoCta", href: "/settings/ai-automation" },
    { id: "ticket-ai-draft", titleKey: "ticketDraftTitle", descKey: "ticketDraftDesc", ctaKey: "ticketDraftCta", href: "/knowledge-base" },
  ],
  leads: [
    { id: "lead-scoring", titleKey: "leadScoreTitle", descKey: "leadScoreDesc", ctaKey: "leadScoreCta", href: "/lead-scoring" },
    { id: "lead-convert", titleKey: "leadConvertTitle", descKey: "leadConvertDesc", ctaKey: "leadConvertCta", href: "/leads" },
    { id: "lead-age", titleKey: "leadAgeTitle", descKey: "leadAgeDesc", ctaKey: "leadAgeCta", href: "/leads" },
    { id: "lead-source", titleKey: "leadSourceTitle", descKey: "leadSourceDesc", ctaKey: "leadSourceCta", href: "/lead-scoring" },
    { id: "lead-assign", titleKey: "leadAssignTitle", descKey: "leadAssignDesc", ctaKey: "leadAssignCta", href: "/settings/lead-rules" },
  ],
  contacts: [
    { id: "contact-decay", titleKey: "contactDecayTitle", descKey: "contactDecayDesc", ctaKey: "contactDecayCta", href: "/contacts" },
    { id: "contact-weights", titleKey: "contactWeightsTitle", descKey: "contactWeightsDesc", ctaKey: "contactWeightsCta", href: "/contacts" },
    { id: "contact-call", titleKey: "contactCallTitle", descKey: "contactCallDesc", ctaKey: "contactCallCta", href: "/settings/voip" },
    { id: "contact-360", titleKey: "contact360Title", descKey: "contact360Desc", ctaKey: "contact360Cta", href: "/contacts" },
  ],
  companies: [
    { id: "company-churn", titleKey: "companyChurnTitle", descKey: "companyChurnDesc", ctaKey: "companyChurnCta", href: "/reports" },
    { id: "company-sla", titleKey: "companySlaTitle", descKey: "companySlaDesc", ctaKey: "companySlaCta", href: "/settings/sla-policies" },
    { id: "company-funnel", titleKey: "companyFunnelTitle", descKey: "companyFunnelDesc", ctaKey: "companyFunnelCta", href: "/companies" },
    { id: "company-kpi", titleKey: "companyKpiTitle", descKey: "companyKpiDesc", ctaKey: "companyKpiCta", href: "/companies" },
  ],
  tasks: [
    { id: "task-deal", titleKey: "taskDealTitle", descKey: "taskDealDesc", ctaKey: "taskDealCta", href: "/tasks" },
    { id: "task-views", titleKey: "taskViewsTitle", descKey: "taskViewsDesc", ctaKey: "taskViewsCta", href: "/tasks" },
    { id: "task-bulk", titleKey: "taskBulkTitle", descKey: "taskBulkDesc", ctaKey: "taskBulkCta", href: "/tasks" },
    { id: "task-calendar", titleKey: "taskCalTitle", descKey: "taskCalDesc", ctaKey: "taskCalCta", href: "/settings/integrations" },
  ],
  reports: [
    { id: "report-drill", titleKey: "reportDrillTitle", descKey: "reportDrillDesc", ctaKey: "reportDrillCta", href: "/reports" },
    { id: "report-forecast", titleKey: "reportForecastTitle", descKey: "reportForecastDesc", ctaKey: "reportForecastCta", href: "/reports" },
    { id: "report-summary", titleKey: "reportSummaryTitle", descKey: "reportSummaryDesc", ctaKey: "reportSummaryCta", href: "/reports" },
  ],
  campaigns: [
    { id: "campaign-ab", titleKey: "campAbTitle", descKey: "campAbDesc", ctaKey: "campAbCta", href: "/campaigns" },
    { id: "campaign-track", titleKey: "campTrackTitle", descKey: "campTrackDesc", ctaKey: "campTrackCta", href: "/campaigns" },
    { id: "campaign-segment", titleKey: "campSegTitle", descKey: "campSegDesc", ctaKey: "campSegCta", href: "/segments" },
    { id: "campaign-variant", titleKey: "campVarTitle", descKey: "campVarDesc", ctaKey: "campVarCta", href: "/campaigns" },
  ],
  journeys: [
    { id: "journey-vars", titleKey: "journeyVarsTitle", descKey: "journeyVarsDesc", ctaKey: "journeyVarsCta", href: "/journeys" },
    { id: "journey-condition", titleKey: "journeyCondTitle", descKey: "journeyCondDesc", ctaKey: "journeyCondCta", href: "/journeys" },
    { id: "journey-stats", titleKey: "journeyStatsTitle", descKey: "journeyStatsDesc", ctaKey: "journeyStatsCta", href: "/journeys" },
    { id: "journey-trigger", titleKey: "journeyTrigTitle", descKey: "journeyTrigDesc", ctaKey: "journeyTrigCta", href: "/journeys" },
  ],
  segments: [
    { id: "segment-dynamic", titleKey: "segDynTitle", descKey: "segDynDesc", ctaKey: "segDynCta", href: "/segments" },
    { id: "segment-campaign", titleKey: "segCampTitle", descKey: "segCampDesc", ctaKey: "segCampCta", href: "/campaigns" },
  ],
  inbox: [
    { id: "inbox-cross", titleKey: "inboxCrossTitle", descKey: "inboxCrossDesc", ctaKey: "inboxCrossCta", href: "/inbox" },
    { id: "inbox-ticket", titleKey: "inboxTicketTitle", descKey: "inboxTicketDesc", ctaKey: "inboxTicketCta", href: "/settings/channels" },
    { id: "inbox-davinci", titleKey: "inboxDavinciTitle", descKey: "inboxDavinciDesc", ctaKey: "inboxDavinciCta", href: "/ai-command-center" },
  ],
  invoices: [
    { id: "invoice-recurring", titleKey: "invRecTitle", descKey: "invRecDesc", ctaKey: "invRecCta", href: "/invoices/recurring" },
    { id: "invoice-partial", titleKey: "invPartTitle", descKey: "invPartDesc", ctaKey: "invPartCta", href: "/invoices" },
    { id: "invoice-journey", titleKey: "invJourneyTitle", descKey: "invJourneyDesc", ctaKey: "invJourneyCta", href: "/settings/ai-automation" },
  ],
  finance: [
    { id: "finance-aging", titleKey: "finAgingTitle", descKey: "finAgingDesc", ctaKey: "finAgingCta", href: "/finance?tab=receivables" },
    { id: "finance-approval", titleKey: "finApprTitle", descKey: "finApprDesc", ctaKey: "finApprCta", href: "/settings/finance-notifications" },
    { id: "finance-funds", titleKey: "finFundsTitle", descKey: "finFundsDesc", ctaKey: "finFundsCta", href: "/finance?tab=funds" },
  ],
  budgeting: [
    { id: "budget-narrative", titleKey: "budgNarrTitle", descKey: "budgNarrDesc", ctaKey: "budgNarrCta", href: "/budgeting" },
    { id: "budget-template", titleKey: "budgTplTitle", descKey: "budgTplDesc", ctaKey: "budgTplCta", href: "/budgeting" },
    { id: "budget-rolling", titleKey: "budgRollTitle", descKey: "budgRollDesc", ctaKey: "budgRollCta", href: "/budgeting" },
  ],
  profitability: [
    { id: "profit-service", titleKey: "profSvcTitle", descKey: "profSvcDesc", ctaKey: "profSvcCta", href: "/profitability" },
    { id: "profit-overhead", titleKey: "profOhTitle", descKey: "profOhDesc", ctaKey: "profOhCta", href: "/profitability" },
    { id: "profit-ai", titleKey: "profAiTitle", descKey: "profAiDesc", ctaKey: "profAiCta", href: "/profitability" },
  ],
  projects: [
    { id: "project-deal", titleKey: "projDealTitle", descKey: "projDealDesc", ctaKey: "projDealCta", href: "/projects" },
    { id: "project-milestone", titleKey: "projMileTitle", descKey: "projMileDesc", ctaKey: "projMileCta", href: "/projects" },
    { id: "project-budget", titleKey: "projBudgTitle", descKey: "projBudgDesc", ctaKey: "projBudgCta", href: "/projects" },
  ],
  contracts: [
    { id: "contract-expiring", titleKey: "contrExpTitle", descKey: "contrExpDesc", ctaKey: "contrExpCta", href: "/contracts" },
    { id: "contract-mrr", titleKey: "contrMrrTitle", descKey: "contrMrrDesc", ctaKey: "contrMrrCta", href: "/contracts" },
  ],
  offers: [
    { id: "offer-chain", titleKey: "offerChainTitle", descKey: "offerChainDesc", ctaKey: "offerChainCta", href: "/offers" },
    { id: "offer-approval", titleKey: "offerApprTitle", descKey: "offerApprDesc", ctaKey: "offerApprCta", href: "/offers" },
  ],
  "knowledge-base": [
    { id: "kb-ai", titleKey: "kbAiTitle", descKey: "kbAiDesc", ctaKey: "kbAiCta", href: "/knowledge-base" },
    { id: "kb-portal", titleKey: "kbPortalTitle", descKey: "kbPortalDesc", ctaKey: "kbPortalCta", href: "/knowledge-base" },
  ],
  products: [
    { id: "products-offers", titleKey: "prodTitle", descKey: "prodDesc", ctaKey: "prodCta", href: "/products" },
  ],
  events: [
    { id: "events-calendar", titleKey: "eventsTitle", descKey: "eventsDesc", ctaKey: "eventsCta", href: "/events" },
  ],
  settings: [
    { id: "settings-validation", titleKey: "setValTitle", descKey: "setValDesc", ctaKey: "setValCta", href: "/settings/pipelines" },
    { id: "settings-perms", titleKey: "setPermTitle", descKey: "setPermDesc", ctaKey: "setPermCta", href: "/settings/field-permissions" },
  ],
}

function getDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch { return new Set() }
}

function saveDismissed(dismissed: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed])) } catch {}
}

export function DidYouKnow({ page, className = "", variant = "default" }: { page: string; className?: string; variant?: "default" | "glass" }) {
  const t = useTranslations("tips")
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [direction, setDirection] = useState(0)

  useEffect(() => {
    setDismissed(getDismissed())
    setLoaded(true)
  }, [])

  if (!loaded) return null

  const pageTips = TIPS[page] || []
  const available = pageTips.filter(tip => !dismissed.has(tip.id))
  if (available.length === 0) return null

  const safeIdx = Math.min(currentIdx, available.length - 1)
  const tip = available[safeIdx]

  const handleDismiss = () => {
    const next = new Set(dismissed)
    next.add(tip.id)
    setDismissed(next)
    saveDismissed(next)
    if (safeIdx >= available.length - 1) setCurrentIdx(Math.max(0, safeIdx - 1))
  }

  const goNext = () => { setDirection(1); setCurrentIdx(i => Math.min(i + 1, available.length - 1)) }
  const goPrev = () => { setDirection(-1); setCurrentIdx(i => Math.max(i - 1, 0)) }

  let title: string, desc: string, cta: string
  try { title = t(tip.titleKey); desc = t(tip.descKey); cta = t(tip.ctaKey) }
  catch { title = tip.titleKey; desc = tip.descKey; cta = tip.ctaKey }

  return (
    <div className={`relative rounded-xl p-5 shadow-sm ${
      variant === "glass"
        ? "border border-white/15 bg-black/55 backdrop-blur-xl text-white"
        : "border border-violet-300 dark:border-violet-700 bg-gradient-to-r from-violet-100/90 to-indigo-100/90 dark:from-violet-950/40 dark:to-indigo-950/40"
    } ${className}`}>
      {/* Dismiss current tip */}
      <button onClick={handleDismiss} className={`absolute top-3 right-3 p-1 rounded-md transition-colors z-10 ${
        variant === "glass" ? "text-white/40 hover:text-white hover:bg-white/10" : "text-violet-400 hover:text-violet-700 hover:bg-violet-200/50 dark:hover:bg-violet-800/40"
      }`}>
        <X className="h-4 w-4" />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-3.5 pr-8"
        >
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 mt-0.5 shadow-sm ${
            variant === "glass" ? "bg-white/15" : "bg-violet-200 dark:bg-violet-800/60"
          }`}>
            <Lightbulb className={`h-5 w-5 ${variant === "glass" ? "text-amber-300" : "text-violet-700 dark:text-violet-300"}`} />
          </div>
          <div className="min-w-0 space-y-2">
            <p className={`text-sm font-bold ${variant === "glass" ? "text-white/80" : "text-violet-800 dark:text-violet-200"}`}>
              {t("prefix")} <span className={variant === "glass" ? "text-white" : "text-foreground"}>{title}</span>
            </p>
            <p className={`text-[13px] leading-relaxed ${variant === "glass" ? "text-white/60" : "text-foreground/70 dark:text-foreground/60"}`}>{desc}</p>
            {tip.href && (
              <Button
                variant="outline"
                size="sm"
                className={`h-7 px-3 text-xs font-medium shadow-sm ${
                  variant === "glass"
                    ? "border-white/20 text-white bg-white/10 hover:bg-white/20"
                    : "border-violet-400 text-violet-700 bg-white hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:bg-violet-900/30 dark:hover:bg-violet-800/40"
                }`}
                onClick={() => router.push(tip.href)}
              >
                {cta} <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation: ← counter → */}
      {available.length > 1 && (
        <div className={`flex items-center justify-center gap-3 mt-3 pt-2.5 border-t ${
          variant === "glass" ? "border-white/10" : "border-violet-200/40 dark:border-violet-800/30"
        }`}>
          <button
            onClick={goPrev}
            disabled={safeIdx === 0}
            className={`h-7 w-7 flex items-center justify-center rounded-md border disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm ${
              variant === "glass"
                ? "border-white/20 bg-white/10 hover:bg-white/20"
                : "border-violet-300 dark:border-violet-700 bg-white dark:bg-violet-900/40 hover:bg-violet-100 dark:hover:bg-violet-800/50"
            }`}
          >
            <ChevronLeft className={`h-4 w-4 ${variant === "glass" ? "text-white/70" : "text-violet-700 dark:text-violet-300"}`} />
          </button>
          <span className={`text-xs font-medium min-w-[3rem] text-center ${
            variant === "glass" ? "text-white/50" : "text-violet-600 dark:text-violet-400"
          }`}>
            {safeIdx + 1} / {available.length}
          </span>
          <button
            onClick={goNext}
            disabled={safeIdx >= available.length - 1}
            className={`h-7 w-7 flex items-center justify-center rounded-md border disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm ${
              variant === "glass"
                ? "border-white/20 bg-white/10 hover:bg-white/20"
                : "border-violet-300 dark:border-violet-700 bg-white dark:bg-violet-900/40 hover:bg-violet-100 dark:hover:bg-violet-800/50"
            }`}
          >
            <ChevronRight className={`h-4 w-4 ${variant === "glass" ? "text-white/70" : "text-violet-700 dark:text-violet-300"}`} />
          </button>
        </div>
      )}
    </div>
  )
}
