"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmailTemplateForm } from "@/components/email-template-form"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Plus, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { InfoHint } from "@/components/info-hint"
import { PageDescription } from "@/components/page-description"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  htmlBody: string
  textBody?: string
  category?: string
  variables?: string[]
  language?: string
  isActive?: boolean
  createdAt: string
}

const categoryIcons: Record<string, string> = {
  general: "📋",
  welcome: "👋",
  onboarding: "🎯",
  notification: "🔔",
  marketing: "📣",
  follow_up: "🔄",
  proposal: "📄",
}

const langFlags: Record<string, string> = {
  az: "🇦🇿",
  ru: "🇷🇺",
  en: "🇬🇧",
}

export default function EmailTemplatesPage() {
  const { data: session } = useSession()
  const t = useTranslations("emailTemplates")
  const tf = useTranslations("forms")
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState<EmailTemplate | undefined>()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState("")
  const [search, setSearch] = useState("")
  const [filterLang, setFilterLang] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const orgId = session?.user?.organizationId

  const categoryLabels: Record<string, string> = {
    general: t("catGeneral"),
    welcome: t("catWelcome"),
    onboarding: t("catOnboarding"),
    notification: t("catNotification"),
    marketing: t("catMarketing"),
    follow_up: t("catFollowUp"),
    proposal: t("catProposal"),
  }

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/v1/email-templates?limit=500", {
        headers: orgId ? { "x-organization-id": String(orgId) } : {},
      })
      const json = await res.json()
      if (json.success) setTemplates(json.data.templates)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchTemplates() }, [session])

  const handleDelete = async () => {
    if (!deleteId) return
    await fetch(`/api/v1/email-templates/${deleteId}`, {
      method: "DELETE",
      headers: orgId ? { "x-organization-id": String(orgId) } : {},
    })
    fetchTemplates()
  }

  // Counts
  const langCounts: Record<string, number> = {}
  const catCounts: Record<string, number> = {}
  for (const tmpl of templates) {
    const lang = tmpl.language || "ru"
    langCounts[lang] = (langCounts[lang] || 0) + 1
    const cat = tmpl.category || "general"
    catCounts[cat] = (catCounts[cat] || 0) + 1
  }

  // Filter
  const filtered = templates.filter(tmpl => {
    if (filterLang !== "all" && (tmpl.language || "ru") !== filterLang) return false
    if (filterCategory !== "all" && (tmpl.category || "general") !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      if (!tmpl.name.toLowerCase().includes(q) && !(tmpl.subject || "").toLowerCase().includes(q)) return false
    }
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-lg" />
          <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-lg" />)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={() => { setEditData(undefined); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" /> {t("newTemplate")}
        </Button>
      </div>

      <PageDescription text={t("pageDescription")} />

      {/* Search */}
      <div className="relative max-w-2xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Language filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">ЯЗЫК: <InfoHint text={t("hintColLanguage")} size={12} /></span>
        <Button
          size="sm"
          variant={filterLang === "all" ? "default" : "outline"}
          onClick={() => setFilterLang("all")}
        >
          {t("allLangs")} ({templates.length}) <InfoHint text={t("hintTotalTemplates")} size={12} />
        </Button>
        {(["az", "ru", "en"] as const).map(lang => (
          langCounts[lang] ? (
            <Button
              key={lang}
              size="sm"
              variant={filterLang === lang ? "default" : "outline"}
              onClick={() => setFilterLang(lang)}
            >
              {langFlags[lang]} {lang.toUpperCase()} ({langCounts[lang]})
            </Button>
          ) : null
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">ТИП: <InfoHint text={t("hintColCategory")} size={12} /></span>
        <Button
          size="sm"
          variant={filterCategory === "all" ? "default" : "outline"}
          onClick={() => setFilterCategory("all")}
        >
          {t("allCategories")}
        </Button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          catCounts[key] ? (
            <Button
              key={key}
              size="sm"
              variant={filterCategory === key ? "default" : "outline"}
              onClick={() => setFilterCategory(key)}
            >
              {categoryIcons[key]} {label} ({catCounts[key]})
            </Button>
          ) : null
        ))}
      </div>

      {/* Template cards — 3 columns like v1 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {templates.length === 0 ? (
            <>
              <p>{t("noTemplates")}</p>
              <p className="text-sm mt-1">{t("noTemplatesHint")}</p>
            </>
          ) : t("noResults")}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(template => {
            const lang = template.language || "ru"
            const cat = template.category || "general"
            const isActive = template.isActive !== false
            // Extract plain text preview from HTML
            const textPreview = (template.htmlBody || "")
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 120)

            return (
              <div
                key={template.id}
                className={cn(
                  "border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer bg-card relative group",
                  !isActive && "opacity-60"
                )}
                onClick={() => { setEditData(template); setShowForm(true) }}
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-semibold text-sm line-clamp-1">{template.name}</h3>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <span className={cn("w-2 h-2 rounded-full", isActive ? "bg-green-500" : "bg-gray-300")} />
                    <span className="text-xs">{langFlags[lang]}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {t("subject")}: {template.subject || "—"}
                </p>
                <p className="text-xs text-muted-foreground/70 mb-3 line-clamp-3 min-h-[3rem]">
                  {textPreview || "Пустой шаблон"}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {categoryIcons[cat]} {categoryLabels[cat] || cat}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded font-medium",
                      isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    )}>
                      {isActive ? t("active") : t("inactive")}
                    </span>
                    {template.variables && template.variables.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {template.variables.length} {t("variables")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <EmailTemplateForm
        open={showForm}
        onOpenChange={(open) => { setShowForm(open); if (!open) setEditData(undefined) }}
        onSaved={fetchTemplates}
        initialData={editData}
        orgId={orgId}
        onDelete={editData ? () => { setDeleteId(editData.id); setDeleteName(editData.name); setShowForm(false) } : undefined}
      />

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null) }}
        onConfirm={handleDelete}
        title={t("deleteTemplate")}
        itemName={deleteName}
      />
    </div>
  )
}
