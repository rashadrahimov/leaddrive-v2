"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  UserPlus, Users, Trophy, Ticket, AlertTriangle, Clock,
  ArrowLeft, Sparkles, ChevronRight,
  type LucideIcon,
} from "lucide-react"

interface Template {
  id: string
  nameKey: string
  descriptionKey: string
  category: string
  icon: string
  entityType: string
  triggerEvent: string
  actions: Array<{ actionType: string }>
}

const ICONS: Record<string, LucideIcon> = {
  UserPlus,
  Users,
  Trophy,
  Ticket,
  AlertTriangle,
  Clock,
}

const CATEGORY_STYLES: Record<string, string> = {
  sales:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800",
  support:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  marketing:
    "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
  operations:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
}

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const t = useTranslations("workflowTemplates")
  const [templates, setTemplates] = useState<Template[]>([])
  const [applying, setApplying] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/v1/workflows/templates")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTemplates(data.data)
      })
      .catch(() => toast.error(t("applyFailed")))
      .finally(() => setLoading(false))
  }, [t])

  const applyTemplate = async (templateId: string) => {
    setApplying(templateId)
    try {
      const res = await fetch("/api/v1/workflows/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(t("appliedSuccess"))
        router.push("/settings/workflows")
      } else {
        toast.error(data.error || t("applyFailed"))
      }
    } catch {
      toast.error(t("applyFailed"))
    } finally {
      setApplying(null)
    }
  }

  const grouped = templates.reduce<Record<string, Template[]>>((acc, tpl) => {
    if (!acc[tpl.category]) acc[tpl.category] = []
    acc[tpl.category].push(tpl)
    return acc
  }, {})

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <Link
          href="/settings/workflows"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("backToWorkflows")}
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 text-white shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg bg-muted/30 animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <section key={category}>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                {t(`categories.${category}`)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((tpl) => {
                  const Icon = ICONS[tpl.icon] || Sparkles
                  return (
                    <div
                      key={tpl.id}
                      className="group relative rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-sm transition-all flex flex-col"
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm leading-tight">
                            {t(tpl.nameKey)}
                          </h3>
                          <Badge
                            variant="outline"
                            className={`mt-1.5 text-[10px] capitalize ${CATEGORY_STYLES[category] || ""}`}
                          >
                            {t(`categories.${category}`)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-4">
                        {t(tpl.descriptionKey)}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-4">
                        <span className="font-mono bg-muted/50 rounded px-1.5 py-0.5">
                          {tpl.entityType}.{tpl.triggerEvent}
                        </span>
                        <ChevronRight className="h-3 w-3" />
                        <span>
                          {tpl.actions.length} {t("actionsCount")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => applyTemplate(tpl.id)}
                        disabled={applying === tpl.id}
                      >
                        {applying === tpl.id ? t("applying") : t("useTemplate")}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
