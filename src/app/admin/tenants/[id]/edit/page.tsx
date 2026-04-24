"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, Save, Check, Handshake, Mail, MessageSquare, Ticket, Wallet, BarChart3, FolderKanban, MapPin, Settings, Zap, Upload, X, Sparkles } from "lucide-react"
import Link from "next/link"
import { MODULE_REGISTRY, type ModuleId } from "@/lib/modules"

// Complete sidebar sections — every page the user can see, grouped exactly like sidebar
// Each section maps to a moduleId that controls its visibility
const SIDEBAR_SECTIONS: { group: string; items: { moduleId: string; label: string; href: string }[] }[] = [
  { group: "CRM", items: [
    { moduleId: "core", label: "Dashboard", href: "/dashboard" },
    { moduleId: "core", label: "Companies", href: "/companies" },
    { moduleId: "core", label: "Contacts", href: "/contacts" },
    { moduleId: "deals", label: "Deals", href: "/deals" },
    { moduleId: "leads", label: "Leads", href: "/leads" },
    { moduleId: "tasks", label: "Tasks", href: "/tasks" },
    { moduleId: "contracts", label: "Contracts", href: "/contracts" },
    { moduleId: "core", label: "Products", href: "/products" },
    { moduleId: "core", label: "Notifications", href: "/notifications" },
  ]},
  { group: "Marketing", items: [
    { moduleId: "campaigns", label: "Campaigns", href: "/campaigns" },
    { moduleId: "campaigns", label: "Segments", href: "/segments" },
    { moduleId: "campaigns", label: "Email Templates", href: "/email-templates" },
    { moduleId: "campaigns", label: "Email Log", href: "/email-log" },
    { moduleId: "campaigns", label: "Campaign ROI", href: "/campaign-roi" },
    { moduleId: "leads", label: "AI Scoring", href: "/ai-scoring" },
    { moduleId: "journeys", label: "Journey Builder", href: "/journeys" },
    { moduleId: "events", label: "Events", href: "/events" },
    { moduleId: "campaigns", label: "Landing Pages", href: "/pages" },
  ]},
  { group: "Communication", items: [
    { moduleId: "omnichannel", label: "Inbox", href: "/inbox" },
  ]},
  { group: "Support", items: [
    { moduleId: "tickets", label: "Tickets", href: "/tickets" },
    { moduleId: "tickets", label: "Complaints Register", href: "/complaints" },
    { moduleId: "tickets", label: "Agent Desktop", href: "/support/agent-desktop" },
    { moduleId: "tickets", label: "Agent Calendar", href: "/support/calendar" },
    { moduleId: "voip", label: "VoIP Calls", href: "/support/voip" },
    { moduleId: "knowledge-base", label: "Knowledge Base", href: "/knowledge-base" },
    { moduleId: "portal", label: "Client Portal", href: "/portal" },
  ]},
  { group: "Finance", items: [
    { moduleId: "invoices", label: "Invoices", href: "/invoices" },
    { moduleId: "budgeting", label: "Finance Dashboard", href: "/finance" },
    { moduleId: "budgeting", label: "Budgeting", href: "/budgeting" },
    { moduleId: "profitability", label: "Profitability", href: "/profitability" },
    { moduleId: "profitability", label: "Pricing", href: "/pricing" },
    { moduleId: "currencies", label: "Multi-Currency", href: "/settings/currencies" },
  ]},
  { group: "Analytics", items: [
    { moduleId: "deals", label: "Forecast", href: "/forecast" },
    { moduleId: "reports", label: "Reports", href: "/reports" },
    { moduleId: "reports", label: "Report Builder", href: "/reports/builder" },
    { moduleId: "ai", label: "Da Vinci AI", href: "/ai-command-center" },
  ]},
  { group: "ERP", items: [
    { moduleId: "projects", label: "Projects", href: "/projects" },
  ]},
  { group: "Route & Field", items: [
    { moduleId: "mtm", label: "Dashboard", href: "/mtm" },
    { moduleId: "mtm", label: "Live Map", href: "/mtm/map" },
    { moduleId: "mtm", label: "Routes", href: "/mtm/routes" },
    { moduleId: "mtm", label: "Visits", href: "/mtm/visits" },
    { moduleId: "mtm", label: "Tasks", href: "/mtm/tasks" },
    { moduleId: "mtm", label: "Customers", href: "/mtm/customers" },
    { moduleId: "mtm", label: "Photos", href: "/mtm/photos" },
    { moduleId: "mtm", label: "Alerts", href: "/mtm/alerts" },
    { moduleId: "mtm", label: "Orders", href: "/mtm/orders" },
    { moduleId: "mtm", label: "Agents", href: "/mtm/agents" },
    { moduleId: "mtm", label: "Analytics", href: "/mtm/analytics" },
    { moduleId: "mtm", label: "Leaderboard", href: "/mtm/leaderboard" },
    { moduleId: "mtm", label: "Activity Log", href: "/mtm/activity" },
    { moduleId: "mtm", label: "Reports", href: "/mtm/reports" },
    { moduleId: "mtm", label: "Settings", href: "/mtm/settings" },
  ]},
  { group: "Settings", items: [
    { moduleId: "core", label: "Dashboard Settings", href: "/settings/dashboard" },
    { moduleId: "core", label: "Pipelines", href: "/settings/pipelines" },
    { moduleId: "workflows", label: "Workflows", href: "/settings/workflows" },
    { moduleId: "core", label: "Users", href: "/settings/users" },
    { moduleId: "core", label: "SMTP Settings", href: "/settings/smtp-settings" },
    { moduleId: "deals", label: "Quotas", href: "/settings/quotas" },
    { moduleId: "core", label: "Integrations", href: "/settings/integrations" },
    { moduleId: "core", label: "Macros", href: "/settings/macros" },
    { moduleId: "core", label: "Field Permissions", href: "/settings/field-permissions" },
    { moduleId: "core", label: "VoIP Settings", href: "/settings/voip" },
    { moduleId: "custom-fields", label: "Custom Fields", href: "/settings/custom-fields" },
    { moduleId: "core", label: "General Settings", href: "/settings" },
  ]},
]

// Extract unique toggleable moduleIds (skip "core" — always on)
const TOGGLEABLE_MODULES = [...new Set(
  SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.moduleId)).filter((id) => id !== "core")
)]

// AI Automation features — pair of shadow (safe) + live (autonomous) per scenario
const AI_AUTOMATION_FEATURES: { scenario: string; label: string; shadowKey: string; liveKey: string; note: string }[] = [
  { scenario: "analytics_briefing",  label: "Daily Briefing",         shadowKey: "ai_daily_briefing",        liveKey: "ai_daily_briefing",        note: "Morning digest email (analytics only, no actions)" },
  { scenario: "analytics_anomaly",   label: "Anomaly Detection",      shadowKey: "ai_anomaly_detection",     liveKey: "ai_anomaly_detection",     note: "Spots spikes + alerts (no actions)" },
  { scenario: "analytics_lead",      label: "Lead Scoring",           shadowKey: "ai_lead_scoring",          liveKey: "ai_lead_scoring",          note: "Enhanced lead scoring" },
  { scenario: "hot_lead",            label: "Hot Lead Escalation",    shadowKey: "ai_auto_hot_lead_shadow",  liveKey: "ai_auto_hot_lead",         note: "Score ≥80 → reassign senior" },
  { scenario: "triage",              label: "Ticket Auto-Triage",     shadowKey: "ai_auto_triage_shadow",    liveKey: "ai_auto_triage",           note: "AI sets category/priority/tags" },
  { scenario: "stage_advance",       label: "Deal Stage Advance",     shadowKey: "ai_auto_stage_advance_shadow", liveKey: "ai_auto_stage_advance", note: "Stuck deals → next stage" },
  { scenario: "acknowledge",         label: "SLA Auto-Response",      shadowKey: "ai_auto_acknowledge_shadow", liveKey: "ai_auto_acknowledge",    note: "Auto-reply before SLA breach" },
  { scenario: "followup",            label: "Stale Deal Follow-Up",   shadowKey: "ai_auto_followup_shadow",  liveKey: "ai_auto_followup",         note: "7+ days inactive → create task" },
  { scenario: "payment_reminder",    label: "Payment Reminder",       shadowKey: "ai_auto_payment_reminder_shadow", liveKey: "ai_auto_payment_reminder", note: "Overdue invoice → journey" },
  { scenario: "renewal",             label: "Contract Renewal",       shadowKey: "ai_auto_renewal_shadow",   liveKey: "ai_auto_renewal",          note: "30d before end → AI drafts proposal" },
  { scenario: "sentiment",           label: "Negative Sentiment",     shadowKey: "ai_auto_sentiment_shadow", liveKey: "ai_auto_sentiment",        note: "Angry ticket → senior escalation" },
  { scenario: "kb_close",            label: "KB Auto-Close",          shadowKey: "ai_auto_kb_close_shadow",  liveKey: "ai_auto_kb_close",         note: "Ticket matches KB → close with link" },
  { scenario: "duplicate",           label: "Duplicate Merge",        shadowKey: "ai_auto_duplicate_shadow", liveKey: "ai_auto_duplicate",        note: "Same email/phone → suggest merge" },
  { scenario: "credit_limit",        label: "Credit Limit Warning",   shadowKey: "ai_auto_credit_limit_shadow", liveKey: "ai_auto_credit_limit",  note: "Outstanding ≥80% of limit → AR task" },
  { scenario: "meeting_recap",       label: "Meeting Recap",          shadowKey: "ai_auto_meeting_recap_shadow", liveKey: "ai_auto_meeting_recap", note: "Webhook transcript → AI recap + next steps" },
  { scenario: "social_reply",        label: "Social AI Reply",        shadowKey: "ai_auto_social_reply_shadow", liveKey: "ai_auto_social_reply", note: "AI drafts reply to negative/neutral mentions" },
  { scenario: "social_viral",        label: "Social Viral Alert",     shadowKey: "ai_auto_social_viral_shadow", liveKey: "ai_auto_social_viral", note: "High-reach mentions → senior alert" },
]

const GROUP_ORDER = ["CRM", "Marketing", "Communication", "Support", "Finance", "Analytics", "ERP", "Route & Field", "Settings"]

const GROUP_STYLE: Record<string, { icon: any; color: string; bg: string; border: string }> = {
  CRM:              { icon: Handshake,     color: "text-sky-500",    bg: "bg-sky-50",     border: "border-sky-200" },
  Marketing:        { icon: Mail,          color: "text-orange-500", bg: "bg-orange-50",  border: "border-orange-200" },
  Communication:    { icon: MessageSquare, color: "text-blue-500",   bg: "bg-blue-50",    border: "border-blue-200" },
  Support:          { icon: Ticket,        color: "text-emerald-500",bg: "bg-emerald-50", border: "border-emerald-200" },
  Finance:          { icon: Wallet,        color: "text-amber-500",  bg: "bg-amber-50",   border: "border-amber-200" },
  Analytics:        { icon: BarChart3,     color: "text-purple-500", bg: "bg-purple-50",  border: "border-purple-200" },
  ERP:              { icon: FolderKanban,  color: "text-indigo-500", bg: "bg-indigo-50",  border: "border-indigo-200" },
  "Route & Field":  { icon: MapPin,        color: "text-cyan-500",   bg: "bg-cyan-50",    border: "border-cyan-200" },
  Settings:         { icon: Settings,      color: "text-zinc-500",   bg: "bg-zinc-50",    border: "border-zinc-200" },
}

interface TenantData {
  id: string
  name: string
  slug: string
  plan: string
  maxUsers: number
  maxContacts: number
  branding: any
  features: any
  isActive: boolean
  serverType: string
  provisionedAt: string | null
  createdAt: string
}

export default function TenantEditPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string
  const t = useTranslations("admin")

  const [tenant, setTenant] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    slug: "",
    plan: "starter",
    maxUsers: 3,
    maxContacts: 500,
    primaryColor: "#6C63FF",
    logo: "",
    features: [] as string[],
    orgLanguage: "",
    aiDailyBudgetUsd: "",
  })

  useEffect(() => {
    fetch(`/api/v1/admin/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          const t = res.data
          setTenant(t)
          const branding = typeof t.branding === "string" ? JSON.parse(t.branding || "{}") : (t.branding || {})
          const featuresRaw = typeof t.features === "string" ? JSON.parse(t.features || "[]") : (t.features || [])
          const settings = typeof t.settings === "string" ? JSON.parse(t.settings || "{}") : (t.settings || {})
          setForm({
            name: t.name,
            slug: t.slug,
            plan: t.plan,
            maxUsers: t.maxUsers,
            maxContacts: t.maxContacts,
            primaryColor: branding.primaryColor || "#6C63FF",
            logo: branding.logo || "",
            features: Array.isArray(featuresRaw) ? featuresRaw : [],
            orgLanguage: settings.language || settings.locale || "",
            aiDailyBudgetUsd: settings.aiDailyBudgetUsd != null ? String(settings.aiDailyBudgetUsd) : "",
          })
        }
      })
      .catch(() => setError(t("tenants.error")))
      .finally(() => setLoading(false))
  }, [tenantId])

  function toggleFeature(id: string) {
    setForm((prev) => ({
      ...prev,
      features: prev.features.includes(id)
        ? prev.features.filter((f) => f !== id)
        : [...prev.features, id],
    }))
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoPreview(URL.createObjectURL(file))
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/v1/admin/upload-logo", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Logo upload failed")
        setLogoPreview(null)
        return
      }
      setForm((prev) => ({ ...prev, logo: data.url }))
    } catch {
      setError("Logo upload failed")
      setLogoPreview(null)
    } finally {
      setLogoUploading(false)
    }
  }

  function removeLogo() {
    setForm((prev) => ({ ...prev, logo: "" }))
    setLogoPreview(null)
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const settingsPatch: Record<string, any> = {}
      if (form.orgLanguage) settingsPatch.language = form.orgLanguage
      else settingsPatch.language = null
      const budgetNum = form.aiDailyBudgetUsd.trim() === "" ? null : Number(form.aiDailyBudgetUsd)
      if (budgetNum !== null && (!isFinite(budgetNum) || budgetNum < 0)) {
        setError("Invalid AI daily budget")
        setSaving(false)
        return
      }
      settingsPatch.aiDailyBudgetUsd = budgetNum

      const res = await fetch(`/api/v1/admin/tenants/${tenantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          plan: form.plan,
          maxUsers: form.maxUsers,
          maxContacts: form.maxContacts,
          branding: { primaryColor: form.primaryColor, logo: form.logo || undefined },
          features: form.features,
          settings: settingsPatch,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Update failed")
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.message || "Network error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!tenant) {
    return <div className="py-20 text-center text-muted-foreground">{t("tenants.notFound")}</div>
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/admin/tenants/${tenantId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t("back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t("tenants.edit")}</h1>
            <p className="text-muted-foreground text-sm">{tenant.name} &mdash; <span className="font-mono">{tenant.slug}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <Check className="w-4 h-4" /> {t("tenants.saved")}
            </span>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
            {t("tenants.save")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — General info */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">{t("tenants.general")}</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("tenants.companyName")}</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{t("url")}</Label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-3 h-10 rounded-l-lg border border-r-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">https://</span>
                  <Input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                    className="rounded-none border-x-0 font-mono"
                  />
                  <span className="inline-flex items-center px-3 h-10 rounded-r-lg border border-l-0 border-border/70 bg-muted/50 text-sm text-muted-foreground font-mono">.leaddrivecrm.org</span>
                </div>
                {form.slug !== tenant.slug && (
                  <p className="text-xs text-amber-600">{t("tenants.urlWarning")}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Modules — shows every sidebar page grouped by section */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-semibold">{t("tenants.activeModules")}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("tenants.modulesCount", { count: form.features.length, total: TOGGLEABLE_MODULES.length })}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setForm((f) => ({ ...f, features: [...TOGGLEABLE_MODULES] }))}
                >{t("tenants.selectAll")}</Button>
                <Button type="button" variant="outline" size="sm"
                  onClick={() => setForm((f) => ({ ...f, features: [] }))}
                >{t("tenants.clearAll")}</Button>
              </div>
            </div>

            {/* Sections: hide the whole card when every toggleable module in
                 it is off. "Core-only" groups (like Settings) have no
                 toggleables and always render. Hidden categories surface as
                 compact chips below the list — clicking re-enables everything
                 in that group. */}
            {(() => {
              const annotated = SIDEBAR_SECTIONS.map((section) => {
                const ids = [...new Set(section.items.map((i) => i.moduleId).filter((id) => id !== "core"))]
                const active = ids.filter((id) => form.features.includes(id)).length
                return { section, ids, active, total: ids.length }
              })
              const visible = annotated.filter(({ active, total }) => total === 0 || active > 0)
              const hidden = annotated.filter(({ active, total }) => total > 0 && active === 0)
              return (
                <>
            <div className="space-y-4">
              {visible.map(({ section, ids: sectionModuleIds, active: activeCount, total: totalToggleable }) => {
                const style = GROUP_STYLE[section.group] || GROUP_STYLE.Settings
                const GroupIcon = style.icon

                return (
                  <div key={section.group} className={`rounded-xl border ${style.border} ${style.bg} overflow-hidden`}>
                    {/* Group header */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <GroupIcon className={`w-4 h-4 ${style.color}`} />
                        <span className={`text-sm font-semibold ${style.color}`}>{section.group}</span>
                      </div>
                      {totalToggleable > 0 && (
                        <span className="text-xs text-muted-foreground">{activeCount}/{totalToggleable}</span>
                      )}
                    </div>
                    {/* Pages list */}
                    <div className="bg-white/80 px-3 py-2">
                      {/* Module toggles — one per unique moduleId */}
                      {sectionModuleIds.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                          {sectionModuleIds.map((modId) => {
                            const isActive = form.features.includes(modId)
                            const modDef = MODULE_REGISTRY[modId as ModuleId]
                            return (
                              <button
                                key={modId}
                                type="button"
                                onClick={() => toggleFeature(modId)}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                                  isActive
                                    ? `${style.bg} ${style.border} border shadow-sm font-medium`
                                    : "border border-zinc-200 hover:bg-muted/30 text-muted-foreground"
                                }`}
                              >
                                <div className={`w-7 h-[16px] rounded-full relative transition-colors flex-shrink-0 ${isActive ? "bg-primary" : "bg-zinc-200"}`}>
                                  <div className={`absolute top-[2px] w-[12px] h-[12px] rounded-full bg-white shadow transition-transform ${isActive ? "left-[13px]" : "left-[2px]"}`} />
                                </div>
                                {modDef?.name || modId}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {/* Pages affected */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {section.items.map((item) => {
                          const isCore = item.moduleId === "core"
                          const isEnabled = isCore || form.features.includes(item.moduleId)
                          return (
                            <div
                              key={item.href}
                              className={`flex items-center gap-2 rounded px-2.5 py-1.5 text-xs transition-colors ${
                                isEnabled ? "text-foreground" : "text-muted-foreground/40 line-through"
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isEnabled ? "bg-green-400" : "bg-zinc-200"}`} />
                              {item.label}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {hidden.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Скрытые категории:</span>
                  {hidden.map(({ section, ids }) => {
                    const style = GROUP_STYLE[section.group] || GROUP_STYLE.Settings
                    const GroupIcon = style.icon
                    return (
                      <button
                        key={section.group}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, features: [...new Set([...f.features, ...ids])] }))}
                        className={`inline-flex items-center gap-1.5 rounded-full border border-dashed ${style.border} px-2.5 py-1 text-xs ${style.color} hover:bg-muted/40 transition-colors`}
                        title={`Включить все модули раздела «${section.group}»`}
                      >
                        <GroupIcon className="w-3 h-3" />
                        {section.group}
                        <span className="text-muted-foreground">+</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
                </>
              )
            })()}
          </Card>

          {/* AI Automation — per-scenario shadow/live toggles */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  AI Automation
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Review → Autopilot per scenario. Shadow = AI drafts + waits for approve. Live = AI acts on its own.
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {AI_AUTOMATION_FEATURES.filter(f => form.features.includes(f.shadowKey) || form.features.includes(f.liveKey)).length}
                {" / "}
                {AI_AUTOMATION_FEATURES.length}
              </div>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-xs">Scenario</th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-amber-700 w-24">Review</th>
                    <th className="text-center px-2 py-2 font-medium text-xs text-violet-700 w-24">Autopilot</th>
                  </tr>
                </thead>
                <tbody>
                  {AI_AUTOMATION_FEATURES.map((f) => {
                    const shadowActive = form.features.includes(f.shadowKey)
                    const liveActive = form.features.includes(f.liveKey)
                    const hasShadowMode = f.shadowKey !== f.liveKey // analytics features share key
                    return (
                      <tr key={f.scenario} className="border-t border-border/40">
                        <td className="px-3 py-2">
                          <div className="font-medium">{f.label}</div>
                          <div className="text-[11px] text-muted-foreground">{f.note}</div>
                        </td>
                        <td className="text-center px-2 py-2">
                          {hasShadowMode ? (
                            <button
                              type="button"
                              onClick={() => toggleFeature(f.shadowKey)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                                shadowActive
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : "bg-transparent text-muted-foreground border border-border hover:bg-muted"
                              }`}
                            >
                              {shadowActive ? "on" : "off"}
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-center px-2 py-2">
                          <button
                            type="button"
                            onClick={() => toggleFeature(f.liveKey)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                              liveActive
                                ? "bg-violet-100 text-violet-800 border border-violet-300"
                                : "bg-transparent text-muted-foreground border border-border hover:bg-muted"
                            }`}
                          >
                            {liveActive ? "on" : "off"}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Tip: always enable the Review toggle first, let the tenant see the shadow queue for a few days, then switch to Autopilot.
            </p>

            <div className="mt-5 pt-5 border-t border-border/60 space-y-2">
              <h4 className="text-sm font-semibold">Extra features</h4>
              <p className="text-[11px] text-muted-foreground">
                Optional modules that aren&apos;t tied to a plan tier. Available on top of the main module list.
              </p>
              <div className="flex items-center justify-between py-2 px-3 rounded-md border border-border/40 bg-muted/20">
                <div>
                  <div className="text-sm font-medium">Complaints Register</div>
                  <div className="text-[11px] text-muted-foreground">
                    Дополнительный раздел /complaints в группе Support (FMCG / consumer-goods use case).
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFeature("complaints_register")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                    form.features.includes("complaints_register")
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : "bg-transparent text-muted-foreground border border-border hover:bg-muted"
                  }`}
                >
                  {form.features.includes("complaints_register") ? "on" : "off"}
                </button>
              </div>
            </div>

            <div className="mt-5 pt-5 border-t border-border/60 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>AI daily budget (USD)</Label>
                <Input
                  type="number" step="0.5" min="0"
                  value={form.aiDailyBudgetUsd}
                  placeholder="5.00"
                  onChange={(e) => setForm({ ...form, aiDailyBudgetUsd: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Cap on Claude/GPT spend per day for this tenant. Empty = system default ($5).
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Default language for AI emails</Label>
                <Select
                  value={form.orgLanguage}
                  onChange={(e) => setForm({ ...form, orgLanguage: e.target.value })}
                >
                  <option value="">Auto (ru)</option>
                  <option value="ru">Русский</option>
                  <option value="en">English</option>
                  <option value="az">Azərbaycan</option>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Fallback language for renewal / meeting-recap / social-reply when the contact has no preferredLanguage.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right column — Plan & Branding */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">{t("tenants.planAndLimits")}</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("plan")}</Label>
                <Select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("maxUsers")}</Label>
                <Input
                  type="number"
                  value={form.maxUsers}
                  onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">{t("tenants.maxUsersHint")}</p>
              </div>
              <div className="space-y-1.5">
                <Label>{t("maxContacts")}</Label>
                <Input
                  type="number"
                  value={form.maxContacts}
                  onChange={(e) => setForm({ ...form, maxContacts: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">{t("tenants.maxUsersHint")}</p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4">{t("tenants.branding")}</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>{t("tenants.primaryColor")}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input
                    value={form.primaryColor}
                    onChange={(e) => setForm({ ...form, primaryColor: e.target.value })}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("tenants.logo") || "Logo"}</Label>
                {(logoPreview || form.logo) ? (
                  <div className="relative w-fit">
                    <img
                      src={logoPreview || form.logo}
                      alt="Logo preview"
                      className="h-16 max-w-[200px] object-contain rounded border border-border/50 bg-muted/30 p-1"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-0.5 hover:bg-destructive/80"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {logoUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-border/70 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">PNG, JPG, SVG — max 2MB</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="text-base font-semibold mb-3">{t("tenants.info")}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("status")}</dt>
                <dd>
                  <Badge variant={tenant.isActive ? "default" : "destructive"}>
                    {tenant.isActive ? t("active") : t("inactive")}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("tenants.server")}</dt>
                <dd className="capitalize">{tenant.serverType}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("created")}</dt>
                <dd>{new Date(tenant.createdAt).toLocaleDateString()}</dd>
              </div>
              {tenant.provisionedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("provisioned")}</dt>
                  <dd>{new Date(tenant.provisionedAt).toLocaleDateString()}</dd>
                </div>
              )}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  )
}
