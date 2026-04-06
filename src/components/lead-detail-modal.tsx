"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogHeader, DialogTitle, DialogContent } from "@/components/ui/dialog"
import { Building2, Users, FileText, X, Copy, Send, RefreshCw, CheckCircle, Trash2, Ban, Plus, Pencil, Brain, Sparkles, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations, useLocale } from "next-intl"
import { toast } from "sonner"

interface LeadCompany {
  id: string
  name: string
  website?: string
  industry?: string
  email?: string
  phone?: string
  description?: string
  category: string
  leadStatus: string
  leadScore: number
  leadTemperature?: string
  userCount: number
  annualRevenue?: number
  createdAt?: string
  contacts?: Array<{ id: string; fullName: string; email?: string; phone?: string; position?: string }>
  deals?: Array<{ id: string; title: string; stage: string; valueAmount?: number }>
  _count?: { contacts: number; deals: number }
}

interface LeadDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  company: LeadCompany | null
  orgId?: string
  onSaved?: () => void
}

// statusLabels defined inside component with translations

const statusColors: Record<string, string> = {
  new: "bg-blue-500", contacted: "bg-yellow-500", qualified: "bg-purple-500",
  converted: "bg-green-500", rejected: "bg-muted-foreground/40", cancelled: "bg-red-500",
}

function getGrade(score: number): { letter: string; color: string } {
  if (score >= 80) return { letter: "A", color: "bg-green-500 text-white" }
  if (score >= 60) return { letter: "B", color: "bg-blue-500 text-white" }
  if (score >= 40) return { letter: "C", color: "bg-yellow-500 text-white" }
  if (score >= 20) return { letter: "D", color: "bg-orange-500 text-white" }
  return { letter: "F", color: "bg-red-500 text-white" }
}

export function LeadDetailModal({ open, onOpenChange, company, orgId, onSaved }: LeadDetailModalProps) {
  const router = useRouter()
  const t = useTranslations("leads")
  const locale = useLocale()

  const statusLabels: Record<string, string> = {
    new: t("ldmStatusNew"), contacted: t("ldmStatusContacted"), qualified: t("ldmStatusQualified"),
    converted: t("ldmStatusConverted"), rejected: t("ldmStatusRejected"), cancelled: t("ldmStatusCancelled"),
  }

  const [activeTab, setActiveTab] = useState("details")
  const [aiLoading, setAiLoading] = useState(false)

  // Activity state
  const [showActivityForm, setShowActivityForm] = useState(false)
  const [activityType, setActivityType] = useState("note")
  const [activitySubject, setActivitySubject] = useState("")
  const [activityDesc, setActivityDesc] = useState("")
  const [activitySaving, setActivitySaving] = useState(false)

  // About state
  const [editingAbout, setEditingAbout] = useState(false)
  const [aboutText, setAboutText] = useState("")
  const [showAllContacts, setShowAllContacts] = useState(false)

  // Sentiment state
  const [sentiment, setSentiment] = useState<any>(null)

  // Tasks state
  const [aiTasks, setAiTasks] = useState<any>(null)

  // AI Text state
  const [textType, setTextType] = useState("Email")
  const [tone, setTone] = useState("professional")
  const [instructions, setInstructions] = useState("")
  const [generatedText, setGeneratedText] = useState<any>(null)
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [scoring, setScoring] = useState(false)
  const [activities, setActivities] = useState<any[]>([])

  // Full company data loaded from API
  const [fullData, setFullData] = useState<any>(null)

  useEffect(() => {
    if (open && company) {
      setActiveTab("details")
      setSentiment(null)
      setAiTasks(null)
      setGeneratedText(null)
      setInstructions("")
      setAboutText(company.description || "")
      setEmailSent(false)
      setEmailError("")
      setFullData(null)
      setShowAllContacts(false)
      // Load full company data with contacts and deals
      fetch(`/api/v1/companies/${company.id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      }).then(r => r.json()).then(json => {
        if (json.success && json.data) {
          setFullData(json.data)
          if (json.data.description) setAboutText(json.data.description)
        }
      }).catch(() => {})
    }
  }, [open, company])

  if (!company) return null

  const callAI = async (action: string, options?: any) => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/v1/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({ action, companyId: company.id, options, locale }),
      })
      const json = await res.json()
      if (json.success) return json.data
    } catch (err) { console.error(err) } finally { setAiLoading(false) }
    return null
  }

  // Universal field update + reload
  const updateField = async (fields: Record<string, any>) => {
    await fetch(`/api/v1/companies/${company.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
      body: JSON.stringify(fields),
    })
    // Reload full data
    const res = await fetch(`/api/v1/companies/${company.id}`, { headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
    const json = await res.json()
    if (json.success && json.data) setFullData(json.data)
    onSaved?.()
  }

  const saveAbout = async () => {
    await updateField({ description: aboutText })
    setEditingAbout(false)
  }

  const changeStatus = async (newStatus: string) => {
    await updateField({ leadStatus: newStatus, ...(newStatus === "converted" ? { category: "client" } : {}) })
  }

  const editField = (label: string, field: string, currentValue: any, isNumber = false) => {
    const val = prompt(`${label}:`, String(currentValue || ""))
    if (val === null) return
    updateField({ [field]: isNumber ? (parseInt(val) || 0) : val })
  }

  const loadActivities = async () => {
    try {
      const res = await fetch(`/api/v1/activities?companyId=${company.id}`, {
        headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string>,
      })
      const json = await res.json()
      if (json.success) setActivities(json.data.activities || [])
    } catch (err) { console.error(err) }
  }

  const saveActivity = async () => {
    if (!activitySubject.trim()) return
    setActivitySaving(true)
    try {
      const res = await fetch("/api/v1/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({
          type: activityType,
          subject: activitySubject,
          description: activityDesc,
          companyId: company.id,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setShowActivityForm(false)
        setActivitySubject("")
        setActivityDesc("")
        loadActivities()
      } else {
        toast.error(t("ldmSaveError") + ": " + (json.error || ""))
      }
    } catch (e) {
      toast.error(t("ldmNetworkError"))
    } finally { setActivitySaving(false) }
  }

  const sendGeneratedEmail = async () => {
    if (!generatedText) return
    const firstContact = (fullData?.contacts || company.contacts)?.[0]
    if (!firstContact?.email) { toast.error(t("ldmNoEmailForSend")); return }
    setEmailSending(true)
    setEmailError("")
    try {
      const res = await fetch("/api/v1/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(orgId ? { "x-organization-id": orgId } : {} as Record<string, string>) },
        body: JSON.stringify({
          to: firstContact.email,
          body: generatedText.body,
          subject: generatedText.subject,
          contactId: firstContact.id,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setEmailSent(true)
      } else {
        setEmailError(json.error || t("ldmSendError"))
      }
    } catch { setEmailError(t("ldmNetworkError")) } finally { setEmailSending(false) }
  }

  const currentScore = fullData?.leadScore ?? company.leadScore ?? 0
  const temp = fullData?.leadTemperature || company.leadTemperature || "cold"
  const grade = getGrade(currentScore)
  const convProb = Math.round(currentScore * 0.85)

  const tabs = [
    { id: "details", label: t("modalDetails") },
    { id: "activity", label: t("modalActivity") },
    { id: "sentiment", label: t("modalSentiment") },
    { id: "tasks", label: t("modalTasks") },
    { id: "aitext", label: t("modalAiText") },
    { id: "ai", label: t("modalAiScoring") },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xl font-bold">{company.name}</span>
              <div className="flex items-center gap-2 mt-1">
                {company.website && <span className="text-sm text-primary">{company.website}</span>}
                <Badge variant="outline">{statusLabels[company.leadStatus] || company.leadStatus}</Badge>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-full hover:bg-muted transition-colors -mt-1 -mr-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogTitle>
      </DialogHeader>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        {/* Tabs */}
        <div className="flex gap-1 border-b mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === "activity" && !activities.length) loadActivities() }}
              className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: Details */}
        {activeTab === "details" && (
          <div className="space-y-4">
            {/* Quick status change */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t("ldmFunnelStatus")}</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["new", "contacted", "qualified", "converted", "rejected", "cancelled"] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => changeStatus(s)}
                    className={`text-xs py-1.5 px-2 rounded-md border transition-all ${
                      (fullData?.leadStatus || company.leadStatus) === s
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background hover:bg-muted border-border"
                    }`}
                  >
                    {statusLabels[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Info grid — all fields clickable to edit */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmEmail"), "email", fullData?.email || company.email)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmEmail")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.email || company.email || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmPhone"), "phone", fullData?.phone || company.phone)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmPhone")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.phone || company.phone || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmWebsite"), "website", fullData?.website || company.website)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmWebsite")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.website || company.website || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmIndustry"), "industry", fullData?.industry || company.industry)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmIndustry")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.industry || company.industry || "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(`${t("ldmEstimatedValue")} (₼)`, "annualRevenue", fullData?.annualRevenue || company.annualRevenue, true)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmEstimatedValue")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{(fullData?.annualRevenue || company.annualRevenue) ? `${(fullData?.annualRevenue || company.annualRevenue).toLocaleString()} ₼` : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField(t("ldmUsers"), "userCount", fullData?.userCount ?? company.userCount, true)}>
                <span className="text-[10px] text-muted-foreground block">{t("ldmUsers")} <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className="text-xs">{fullData?.userCount ?? company.userCount ?? 0}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmCreated")}</span>
                <span className="text-xs">{(fullData?.createdAt || company.createdAt) ? new Date(fullData?.createdAt || company.createdAt).toLocaleDateString() : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmDaysInBase")}</span>
                <span className="text-xs">{(fullData?.createdAt || company.createdAt) ? `${Math.floor((Date.now() - new Date(fullData?.createdAt || company.createdAt).getTime()) / 86400000)} ${t("ldmDays")}` : "—"}</span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">SLA</span>
                <span className="text-xs">
                  {(fullData as any)?.slaPolicy ? (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">{(fullData as any).slaPolicy.name}</span>
                  ) : t("ldmSlaDefault")}
                </span>
              </div>
              <div className="p-2 bg-muted/30 rounded cursor-pointer hover:bg-muted/50 group" onClick={() => editField("Score", "leadScore", fullData?.leadScore ?? company.leadScore, true)}>
                <span className="text-[10px] text-muted-foreground block">Score <Pencil className="h-2 w-2 inline opacity-0 group-hover:opacity-100" /></span>
                <span className={`text-xs font-bold ${(fullData?.leadTemperature || company.leadTemperature) === "hot" ? "text-red-500" : (fullData?.leadTemperature || company.leadTemperature) === "warm" ? "text-orange-500" : "text-blue-500"}`}>
                  {((fullData?.leadTemperature || company.leadTemperature) || "cold").toUpperCase()} {fullData?.leadScore ?? company.leadScore}
                </span>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <span className="text-[10px] text-muted-foreground block">{t("ldmContacts")}</span>
                <span className="text-xs">{fullData?.contacts?.length || company._count?.contacts || 0}</span>
              </div>
            </div>

            {/* FIX #2: About section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-medium text-sm">{t("ldmAboutCompany")}</h4>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingAbout(!editingAbout)}>
                  <Pencil className="h-3 w-3 mr-1" /> {editingAbout ? t("ldmEditCancel") : t("ldmEdit")}
                </Button>
              </div>
              {editingAbout ? (
                <div className="space-y-2">
                  <Textarea value={aboutText} onChange={e => setAboutText(e.target.value)} rows={3} />
                  <Button size="sm" onClick={saveAbout}>{t("ldmSave")}</Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground bg-muted/30 p-2 rounded min-h-[40px]">
                  {company.description || aboutText || t("ldmNoDescription")}
                </p>
              )}
            </div>

            {/* Contacts with add/edit/delete */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">{t("ldmKeyPeople")} ({fullData?.contacts?.length || company._count?.contacts || 0})</h4>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={() => { onOpenChange(false); router.push(`/contacts?new=1&companyId=${company.id}`) }}>
                    <Plus className="h-3 w-3" /> {t("ldmAdd")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { onOpenChange(false); router.push(`/companies/${company.id}`) }}>
                    {t("ldmAll")}
                  </Button>
                </div>
              </div>
              {(fullData?.contacts || company.contacts) && (fullData?.contacts || company.contacts).length > 0 ? (
                <div className="space-y-1.5">
                  {(showAllContacts ? (fullData?.contacts || company.contacts) : (fullData?.contacts || company.contacts).slice(0, 5)).map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between p-2 bg-muted/30 rounded border border-transparent hover:border-border transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                            {c.fullName?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{c.fullName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{c.position || ""} {c.email ? `· ${c.email}` : ""}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-0.5 ml-2 flex-shrink-0">
                        <button onClick={() => { onOpenChange(false); router.push(`/contacts/${c.id}`) }} className="p-1 rounded hover:bg-muted" title={t("ldmEdit")}>
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </button>
                        <button onClick={async () => {
                          if (!confirm(t("ldmConfirmDeleteContact", { name: c.fullName }))) return
                          await fetch(`/api/v1/contacts/${c.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
                          // Reload full data
                          const res = await fetch(`/api/v1/companies/${company.id}`, { headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
                          const json = await res.json()
                          if (json.success) setFullData(json.data)
                          onSaved?.()
                        }} className="p-1 rounded hover:bg-red-50" title={t("ldmDelete")}>
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {(fullData?.contacts || company.contacts).length > 5 && !showAllContacts && (
                    <button
                      onClick={() => setShowAllContacts(true)}
                      className="w-full text-xs text-center text-primary hover:underline py-1"
                    >
                      {t("ldmShowMore", { count: (fullData?.contacts || company.contacts).length - 5 })}
                    </button>
                  )}
                  {showAllContacts && (fullData?.contacts || company.contacts).length > 5 && (
                    <button
                      onClick={() => setShowAllContacts(false)}
                      className="w-full text-xs text-center text-muted-foreground hover:underline py-1"
                    >
                      {t("ldmCollapse")}
                    </button>
                  )}
                </div>
              ) : <p className="text-xs text-muted-foreground">{t("ldmNoContacts")}</p>}
            </div>

            {/* Deals */}
            <div>
              <h4 className="font-medium text-sm mb-1">{t("ldmDeals")} ({(fullData?.deals || company.deals)?.length || 0})</h4>
              {(fullData?.deals || company.deals) && (fullData?.deals || company.deals).length > 0 ? (
                (fullData?.deals || company.deals).map((d: any) => (
                  <div key={d.id} className="flex justify-between text-xs p-2 bg-muted/30 rounded mb-1">
                    <span>{d.name || d.title}</span>
                    <div className="flex gap-1">
                      {d.valueAmount ? <span className="font-medium">{d.valueAmount.toLocaleString()} ₼</span> : null}
                      <Badge variant="outline" className="text-[10px]">{d.stage}</Badge>
                    </div>
                  </div>
                ))
              ) : <p className="text-xs text-muted-foreground">{t("ldmNoDeals")}</p>}
            </div>

            {/* Contracts */}
            <div>
              <h4 className="font-medium text-sm mb-1">{t("ldmContracts")} ({fullData?.contracts?.length || 0})</h4>
              {fullData?.contracts && fullData.contracts.length > 0 ? (
                fullData.contracts.map((c: any) => (
                  <div key={c.id} className="flex justify-between items-center text-xs p-2 bg-muted/30 rounded mb-1">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{c.contractNumber}</span>
                      <span className="text-muted-foreground ml-1.5">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {c.valueAmount ? <span className="font-medium">{c.valueAmount.toLocaleString()} {c.currency || "AZN"}</span> : null}
                      <Badge variant={c.status === "active" ? "default" : c.status === "expired" ? "destructive" : "secondary"} className="text-[10px]">
                        {c.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : <p className="text-xs text-muted-foreground">{t("ldmNoContracts")}</p>}
            </div>
          </div>
        )}

        {/* Tab: Activity */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <Button size="sm" className="gap-1" onClick={() => { setShowActivityForm(!showActivityForm); if (!activities.length) loadActivities() }}>
              <Plus className="h-3 w-3" /> {t("ldmRecord")}
            </Button>

            {showActivityForm && (
              <Card>
                <CardContent className="pt-3 pb-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">{t("ldmActType")}</Label>
                      <Select value={activityType} onChange={e => setActivityType(e.target.value)}>
                        <option value="note">📝 {t("ldmActNote")}</option>
                        <option value="call">📞 {t("ldmActCall")}</option>
                        <option value="email">📧 {t("ldmActEmail")}</option>
                        <option value="meeting">🤝 {t("ldmActMeeting")}</option>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">{t("ldmActSubject")}</Label>
                      <Input value={activitySubject} onChange={e => setActivitySubject(e.target.value)} placeholder={t("ldmActSubjectPlaceholder")} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">{t("ldmActDescription")}</Label>
                    <Textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)} rows={2} placeholder={t("ldmActDetailsPlaceholder")} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveActivity} disabled={activitySaving || !activitySubject.trim()}>
                      {activitySaving ? t("ldmActSaving") : t("ldmSave")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowActivityForm(false)}>{t("ldmEditCancel")}</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Activities list */}
            {activities.length > 0 ? (
              <div className="space-y-2">
                {activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded text-xs">
                    <span>{a.type === "call" ? "📞" : a.type === "email" ? "📧" : a.type === "meeting" ? "🤝" : "📝"}</span>
                    <div className="flex-1">
                      <p className="font-medium">{a.subject}</p>
                      {a.description && <p className="text-muted-foreground">{a.description}</p>}
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : !showActivityForm ? (
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">{t("ldmNoActivities")}</p>
                <p className="text-xs mt-1">{t("ldmNoActivitiesHint")}</p>
                <Button size="sm" variant="link" className="mt-2" onClick={loadActivities}>{t("ldmRefresh")}</Button>
              </div>
            ) : null}
          </div>
        )}

        {/* Tab: Sentiment */}
        {activeTab === "sentiment" && (
          <div className="space-y-4">
            {!sentiment ? (
              <div className="text-center py-4">
                <Button onClick={async () => { const d = await callAI("sentiment"); if (d) setSentiment(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? t("modalAnalyzing") : t("modalAnalyzeSentiment")}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">{t("modalSentimentDesc")}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="w-24 h-24" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke={sentiment.score >= 70 ? "#22c55e" : sentiment.score >= 40 ? "#3b82f6" : "#ef4444"} strokeWidth="8" strokeDasharray={`${sentiment.score * 2.83} 283`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                    </svg>
                    <div className="absolute text-center">
                      <div className="text-2xl">{sentiment.emoji}</div>
                      <div className="text-sm font-bold">{sentiment.score}%</div>
                    </div>
                  </div>
                  <p className="font-bold mt-2">{sentiment.sentiment}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">TREND</p>
                    <p className="text-sm font-medium">{sentiment.trend === "improving" ? "📈" : sentiment.trend === "stable" ? "➡️" : "❓"} {sentiment.trend}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">RISK</p>
                    <p className={`text-sm font-bold ${sentiment.risk === "HIGH" ? "text-red-500" : sentiment.risk === "MEDIUM" ? "text-orange-500" : "text-green-500"}`}>{sentiment.risk}</p>
                  </CardContent></Card>
                  <Card><CardContent className="pt-2 pb-2 text-center">
                    <p className="text-[10px] text-muted-foreground">CONFIDENCE</p>
                    <p className="text-sm font-bold text-primary">{sentiment.confidence}%</p>
                  </CardContent></Card>
                </div>
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">{t("ldmSummary")}</p>
                  <p className="text-sm">{sentiment.summary}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Tasks */}
        {activeTab === "tasks" && (
          <div className="space-y-4">
            {!aiTasks ? (
              <div className="text-center py-4">
                <Button onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} disabled={aiLoading} className="gap-2">
                  {aiLoading ? t("modalAnalyzing") : t("modalGenerateTasks")}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">{t("modalSentimentDesc")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                  <p>💡 {aiTasks.strategy}</p>
                </div>
                {aiTasks.tasks.map((task: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-sm">{task.type === "email" ? "📧" : task.type === "call" ? "📞" : task.type === "meeting" ? "📨" : "📋"} {task.title}</h4>
                        <div className="flex gap-1">
                          <Badge variant={task.priority === "HIGH" ? "destructive" : "secondary"} className="text-[10px]">{task.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{task.type}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{task.description}</p>
                      <p className="text-[10px] text-muted-foreground">📅 {task.dueDate}</p>
                    </CardContent>
                  </Card>
                ))}
                <div className="flex gap-2 justify-center">
                  <Button size="sm" className="gap-1"><CheckCircle className="h-3 w-3" /> {t("ldmCreateAllTasks")}</Button>
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("tasks"); if (d) setAiTasks(d) }} className="gap-1"><RefreshCw className="h-3 w-3" /> {t("modalRegenerate")}</Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: AI Text — FIX #8: email sending works */}
        {activeTab === "aitext" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t("ldmTextType")}</Label>
                <Select value={textType} onChange={e => setTextType(e.target.value)}>
                  <option value="Email">📧 Email</option>
                  <option value="SMS">📱 SMS</option>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t("ldmTone")}</Label>
                <Select value={tone} onChange={e => setTone(e.target.value)}>
                  <option value="professional">🏢 {t("ldmToneProfessional")}</option>
                  <option value="friendly">😊 {t("ldmToneFriendly")}</option>
                  <option value="formal">📋 {t("ldmToneFormal")}</option>
                  <option value="persuasive">💪 {t("ldmTonePersuasive")}</option>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("ldmInstructions")}</Label>
              <Textarea value={instructions} onChange={e => setInstructions(e.target.value)} rows={2} placeholder={t("ldmInstructionsPlaceholder")} />
            </div>
            <Button onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} disabled={aiLoading} className="w-full gap-2">
              {aiLoading ? t("modalAnalyzing") : t("modalGenerateText")}
            </Button>

            {generatedText && (
              <div className="space-y-3">
                {generatedText.subject && (
                  <div>
                    <Label className="text-xs text-primary">{t("ldmSubject")}</Label>
                    <Input value={generatedText.subject} onChange={(e: any) => setGeneratedText({ ...generatedText, subject: e.target.value })} className="mt-1" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">{t("ldmEmailText")}</Label>
                  <Textarea value={generatedText.body} rows={6} onChange={(e: any) => setGeneratedText({ ...generatedText, body: e.target.value })} className="mt-1" />
                </div>
                <div className="flex gap-2 justify-center">
                  <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedText.body)} className="gap-1">
                    <Copy className="h-3 w-3" /> {t("ldmCopy")}
                  </Button>
                  <Button size="sm" onClick={sendGeneratedEmail} disabled={emailSending || emailSent} className="gap-1">
                    <Send className="h-3 w-3" /> {emailSent ? `✅ ${t("ldmEmailSent")}` : emailSending ? t("ldmEmailSending") : t("ldmSendEmail")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={async () => { const d = await callAI("text", { textType, tone, instructions }); if (d) { setGeneratedText(d); setEmailSent(false) } }} className="gap-1">
                    <RefreshCw className="h-3 w-3" /> {t("modalRegenerate")}
                  </Button>
                </div>
                {emailError && (
                  <p className="text-sm text-red-500 text-center">{emailError}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: AI Scoring */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-500" /> {t("ldmDaVinciScoring")}
              </h4>
              <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={async () => {
                setScoring(true)
                try {
                  const d = await callAI("sentiment")
                  if (d) {
                    await updateField({ leadScore: d.score })
                  }
                } catch (err) { console.error(err) } finally { setScoring(false) }
              }} disabled={scoring}>
                {scoring ? t("ldmRecalculating") : t("ldmRecalculate")}
              </Button>
            </div>

            {/* Score display */}
            <div className="flex items-center gap-6 justify-center py-4">
              <div className="text-center">
                <span className={cn("inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold shadow-sm", grade.color)}>
                  {grade.letter}
                </span>
                <p className="text-sm font-bold mt-2">{currentScore}/100</p>
                <p className="text-[10px] text-muted-foreground">Score</p>
              </div>
              <div className="text-center">
                <div className={cn("text-2xl font-bold", temp === "hot" ? "text-red-500" : temp === "warm" ? "text-orange-500" : "text-blue-500")}>
                  {(temp || "cold").toUpperCase()}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">{t("ldmTemperature")}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{convProb}%</div>
                <p className="text-[10px] text-muted-foreground mt-1">{t("ldmConversion")}</p>
              </div>
            </div>

            {/* Score bar */}
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Da Vinci Score</span>
                <span className="text-xs font-bold">{currentScore}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", currentScore >= 80 ? "bg-green-500" : currentScore >= 60 ? "bg-blue-500" : currentScore >= 40 ? "bg-yellow-500" : "bg-red-500")}
                  style={{ width: `${currentScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <Card><CardContent className="pt-4 pb-4">
                <div className={cn("text-3xl font-bold", grade.color.replace("bg-", "text-").replace(" text-white", ""))}>
                  {grade.letter}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("ldmGrade")}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4">
                <div className="text-3xl font-bold text-primary">{currentScore}</div>
                <div className="text-xs text-muted-foreground mt-1">{t("ldmPoints")}</div>
              </CardContent></Card>
              <Card><CardContent className="pt-4 pb-4">
                <div className={cn("text-3xl font-bold", convProb >= 50 ? "text-green-600" : convProb >= 30 ? "text-yellow-600" : "text-red-500")}>
                  {convProb}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">{t("ldmProbability")}</div>
              </CardContent></Card>
            </div>
          </div>
        )}

        {/* Action buttons — FIX #7: contracts filtered by company */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
          <Button variant="outline" size="sm" className="gap-1 text-green-700 border-green-200 hover:bg-green-50"
            onClick={() => { onOpenChange(false); router.push(`/contracts?search=${encodeURIComponent(company.name)}`) }}>
            <FileText className="h-3 w-3" /> {t("ldmContractsBtn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-blue-700 border-blue-200 hover:bg-blue-50"
            onClick={() => { onOpenChange(false); router.push(`/companies/${company.id}`) }}>
            <Pencil className="h-3 w-3" /> {t("ldmEditBtn")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-orange-700 border-orange-200 hover:bg-orange-50"
            onClick={async () => {
              if (!confirm(t("ldmConfirmDeactivate", { name: company.name }))) return
              await changeStatus("cancelled")
              onOpenChange(false)
            }}>
            <Ban className="h-3 w-3" /> {t("ldmDeactivate")}
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-red-700 border-red-200 hover:bg-red-50"
            onClick={async () => {
              if (!confirm(t("ldmConfirmDelete", { name: company.name }))) return
              await fetch(`/api/v1/companies/${company.id}`, { method: "DELETE", headers: orgId ? { "x-organization-id": orgId } : {} as Record<string, string> })
              onOpenChange(false)
              onSaved?.()
            }}>
            <Trash2 className="h-3 w-3" /> {t("ldmDelete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
