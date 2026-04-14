"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Lightbulb, X, ArrowRight } from "lucide-react"
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

// All tips grouped by page context
const TIPS: Record<string, Tip[]> = {
  dashboard: [
    { id: "daily-briefing", titleKey: "dailyBriefingTitle", descKey: "dailyBriefingDesc", ctaKey: "dailyBriefingCta", href: "/settings/ai-automation" },
    { id: "anomaly-detection", titleKey: "anomalyTitle", descKey: "anomalyDesc", ctaKey: "anomalyCta", href: "/settings/ai-automation" },
  ],
  deals: [
    { id: "ai-predictions", titleKey: "aiPredictionsTitle", descKey: "aiPredictionsDesc", ctaKey: "aiPredictionsCta", href: "" },
    { id: "auto-followup", titleKey: "autoFollowupTitle", descKey: "autoFollowupDesc", ctaKey: "autoFollowupCta", href: "/settings/ai-automation" },
  ],
  tickets: [
    { id: "auto-acknowledge", titleKey: "autoAckTitle", descKey: "autoAckDesc", ctaKey: "autoAckCta", href: "/settings/ai-automation" },
    { id: "ai-draft", titleKey: "aiDraftTitle", descKey: "aiDraftDesc", ctaKey: "aiDraftCta", href: "" },
    { id: "smart-assign", titleKey: "smartAssignTitle", descKey: "smartAssignDesc", ctaKey: "smartAssignCta", href: "/settings/sla-policies" },
  ],
  leads: [
    { id: "ai-scoring", titleKey: "aiScoringTitle", descKey: "aiScoringDesc", ctaKey: "aiScoringCta", href: "/ai-command-center" },
  ],
  reports: [
    { id: "ai-commentary", titleKey: "aiCommentaryTitle", descKey: "aiCommentaryDesc", ctaKey: "aiCommentaryCta", href: "" },
  ],
  invoices: [
    { id: "payment-reminder", titleKey: "paymentReminderTitle", descKey: "paymentReminderDesc", ctaKey: "paymentReminderCta", href: "/settings/ai-automation" },
  ],
  inbox: [
    { id: "da-vinci-reply", titleKey: "daVinciReplyTitle", descKey: "daVinciReplyDesc", ctaKey: "daVinciReplyCta", href: "/ai-command-center" },
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

interface DidYouKnowProps {
  page: string
  className?: string
}

export function DidYouKnow({ page, className = "" }: DidYouKnowProps) {
  const t = useTranslations("tips")
  const router = useRouter()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    setDismissed(getDismissed())
    setLoaded(true)
  }, [])

  if (!loaded) return null

  const pageTips = TIPS[page] || []
  const availableTips = pageTips.filter(tip => !dismissed.has(tip.id))

  if (availableTips.length === 0) return null

  // Pick one tip (rotate based on day so it changes daily)
  const dayIndex = Math.floor(Date.now() / 86400000)
  const tip = availableTips[dayIndex % availableTips.length]

  const handleDismiss = () => {
    const next = new Set(dismissed)
    next.add(tip.id)
    setDismissed(next)
    saveDismissed(next)
  }

  let title: string, desc: string, cta: string
  try {
    title = t(tip.titleKey)
    desc = t(tip.descKey)
    cta = t(tip.ctaKey)
  } catch {
    title = tip.titleKey
    desc = tip.descKey
    cta = tip.ctaKey
  }

  return (
    <AnimatePresence>
      <motion.div
        key={tip.id}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`relative rounded-xl border border-violet-200/50 dark:border-violet-800/30 bg-gradient-to-r from-violet-50/80 to-indigo-50/80 dark:from-violet-950/20 dark:to-indigo-950/20 p-4 ${className}`}
      >
        <button onClick={handleDismiss} className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex items-start gap-3 pr-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/40 shrink-0 mt-0.5">
            <Lightbulb className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
              {t("prefix")} <span className="text-foreground">{title}</span>
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            {tip.href && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] text-violet-600 hover:text-violet-800 hover:bg-violet-100 dark:text-violet-400 dark:hover:bg-violet-900/30 -ml-2"
                onClick={() => router.push(tip.href)}
              >
                {cta} <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
